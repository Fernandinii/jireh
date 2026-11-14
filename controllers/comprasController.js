const { Op } = require('sequelize');
const {
  sequelize,
  Compra,
  DetalleCompra,
  Proveedor,
  Usuario,
  Producto,
  InventarioSucursal,
  MovimientoInventario,
  Faltante,
} = require('../models');
const { encolarEvento } = require('../services/outboxService');

const DEFAULT_PER_PAGE = 25;
const MIN_PER_PAGE = 5;
const MAX_PER_PAGE = 100;

function empresaDe(req) {
  const u = req.session.user || {};
  return { empresaId: u.empresa_id || null, sucursalId: u.sucursal_id || null, usuarioId: u.id || null };
}

function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function r2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
function r3(n) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

/** Historial paginado de compras de la sucursal. */
async function index(req, res, next) {
  try {
    let perPage = parseInt(req.query.perPage, 10) || DEFAULT_PER_PAGE;
    if (!Number.isFinite(perPage)) perPage = DEFAULT_PER_PAGE;
    perPage = Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, perPage));

    const { empresaId, sucursalId } = empresaDe(req);
    const proveedorId = (req.query.proveedor_id || '').trim() || null;
    const fecha = (req.query.fecha || '').trim() || null;

    const where = { sucursal_id: sucursalId };
    if (proveedorId) where.proveedor_id = proveedorId;
    if (fecha && !Number.isNaN(Date.parse(fecha))) {
      where.fecha_compra = {
        [Op.between]: [new Date(`${fecha}T00:00:00`), new Date(`${fecha}T23:59:59.999`)],
      };
    }

    const proveedores = await Proveedor.findAll({ where: { empresa_id: empresaId, activo: true }, order: [['nombre', 'ASC']] });

    const total = await Compra.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    let page = parseInt(req.query.page, 10) || 1;
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const compras = await Compra.findAll({
      where,
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre_usuario', 'nombre_completo'] },
      ],
      order: [['fecha_compra', 'DESC'], ['id', 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.render('compras/index', {
      title: 'Compras',
      activeNav: 'compras',
      compras,
      proveedores,
      proveedorId,
      fecha,
      pagination: { page, perPage, total, totalPages, q: '' },
    });
  } catch (err) {
    next(err);
  }
}

/** Formulario de captura de compra. */
async function nueva(req, res, next) {
  try {
    const { empresaId } = empresaDe(req);
    const proveedores = await Proveedor.findAll({ where: { empresa_id: empresaId, activo: true }, order: [['nombre', 'ASC']] });
    res.render('compras/nueva', {
      title: 'Nueva Compra',
      activeNav: 'compras',
      proveedores,
    });
  } catch (err) {
    next(err);
  }
}

/** Registro transaccional de compra. */
async function crear(req, res, next) {
  const { empresaId, sucursalId, usuarioId } = empresaDe(req);
  try {
    const proveedorId = (req.body.proveedor_id || '').trim();
    const folio = (req.body.folio_factura || '').trim() || null;
    const notas = (req.body.notas || '').trim() || null;
    let fechaCompra = new Date();
    if (req.body.fecha_compra && !Number.isNaN(Date.parse(req.body.fecha_compra))) {
      fechaCompra = new Date(`${req.body.fecha_compra}T12:00:00`);
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!proveedorId) {
      return res.status(400).json({ ok: false, error: 'Debe seleccionar un proveedor.' });
    }
    if (!items.length) {
      return res.status(400).json({ ok: false, error: 'La compra debe incluir al menos un producto.' });
    }

    const t = await sequelize.transaction();
    try {
      const proveedor = await Proveedor.findOne({ where: { id: proveedorId, empresa_id: empresaId }, transaction: t });
      if (!proveedor) {
        throw new Error('Proveedor no encontrado o no pertenece a esta empresa.');
      }

      // Validación y carga de productos + inventario.
      const lineas = [];
      let total = 0;
      for (const item of items) {
        const cantidad = Number(item.cantidad);
        const costo = toNum(item.costo_unitario, 0);
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error('Cada cantidad debe ser mayor a cero.');
        }
        if (costo < 0) {
          throw new Error('El costo unitario no puede ser negativo.');
        }

        const producto = await Producto.findByPk(item.productoId, { transaction: t });
        if (!producto || !producto.activo || producto.empresa_id !== empresaId) {
          throw new Error('Producto no encontrado o inactivo.');
        }

        let inventario = await InventarioSucursal.findOne({
          where: { sucursal_id: sucursalId, producto_id: producto.id },
          transaction: t,
        });
        if (!inventario) {
          inventario = await InventarioSucursal.create(
            {
              sucursal_id: sucursalId,
              producto_id: producto.id,
              precio_compra: costo,
              precio_venta: 0,
              stock: 0,
              stock_minimo: 0,
            },
            { transaction: t }
          );
        }

        const cantidadN = producto.es_granel ? r3(cantidad) : Math.round(cantidad);
        const subtotal = r2(cantidadN * costo);
        total = r2(total + subtotal);

        lineas.push({ producto, inventario, cantidad: cantidadN, costo, subtotal, nuevoPrecioVenta: toNum(item.nuevo_precio_venta, 0) });
      }

      const compra = await Compra.create(
        {
          empresa_id: empresaId,
          sucursal_id: sucursalId,
          proveedor_id: proveedor.id,
          usuario_id: usuarioId,
          folio_factura: folio,
          total,
          fecha_compra: fechaCompra,
          notas,
        },
        { transaction: t }
      );

      const detalles = [];
      for (const linea of lineas) {
        const detalle = await DetalleCompra.create(
          {
            compra_id: compra.id,
            producto_id: linea.producto.id,
            cantidad: linea.cantidad,
            costo_unitario: linea.costo,
            subtotal: linea.subtotal,
          },
          { transaction: t }
        );
        detalles.push(detalle);

        // Inventario: entrada de stock + actualización de costos/precios.
        const nuevoStock = r3(Number(linea.inventario.stock) + linea.cantidad);
        const actualizacion = {
          stock: nuevoStock,
          precio_compra: linea.costo,
        };
        if (linea.nuevoPrecioVenta > 0) {
          actualizacion.precio_venta = linea.nuevoPrecioVenta;
        }
        await linea.inventario.update(actualizacion, { transaction: t });

        await MovimientoInventario.create(
          {
            sucursal_id: sucursalId,
            producto_id: linea.producto.id,
            usuario_id: usuarioId,
            tipo: 'compra',
            delta_cantidad: Math.abs(linea.cantidad),
            referencia_id: compra.id,
          },
          { transaction: t }
        );

        // Resolución automática de faltantes abiertos si el stock ya supera el mínimo.
        if (nuevoStock > Number(linea.inventario.stock_minimo)) {
          await Faltante.update(
            { resuelto: true },
            { where: { sucursal_id: sucursalId, producto_id: linea.producto.id, resuelto: false }, transaction: t }
          );
        }
      }

      await encolarEvento(
        {
          entidad: 'compra',
          entidadId: compra.id,
          operacion: 'CREATE',
          payload: { compra: compra.toJSON(), detalles: detalles.map((d) => d.toJSON()) },
        },
        t
      );

      await t.commit();
      return res.status(201).json({ ok: true, compra: compra.toJSON() });
    } catch (err) {
      await t.rollback();
      return res.status(400).json({ ok: false, error: err.message });
    }
  } catch (err) {
    next(err);
  }
}

/** Detalle de una compra. */
async function detalle(req, res, next) {
  try {
    const { sucursalId } = empresaDe(req);
    const compra = await Compra.findOne({
      where: { id: req.params.id, sucursal_id: sucursalId },
      include: [
        { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre', 'telefono'] },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre_usuario', 'nombre_completo'] },
        {
          model: DetalleCompra,
          as: 'detalles',
          include: [{ model: Producto, as: 'producto', attributes: ['id', 'nombre', 'unidad_medida', 'es_granel'] }],
        },
      ],
    });

    if (!compra) {
      return res.status(404).render('errors/404', { title: 'No encontrado' });
    }

    res.render('compras/detalle', { title: 'Detalle de Compra', activeNav: 'compras', compra });
  } catch (err) {
    next(err);
  }
}

module.exports = { index, nueva, crear, detalle };
