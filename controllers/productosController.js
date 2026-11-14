const { Op } = require('sequelize');
const {
  sequelize,
  Producto,
  InventarioSucursal,
  Categoria,
  Proveedor,
  ProductoProveedor,
  MovimientoInventario,
} = require('../models');
const { encolarEvento } = require('../services/outboxService');

const DEFAULT_PER_PAGE = 25;
const MIN_PER_PAGE = 5;
const MAX_PER_PAGE = 100;
const UNIDADES_GRANEL = ['kg', 'g', 'litro', 'ml', 'metro'];

// --- utilidades numéricas ---
function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function r3(n) {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

function empresaDe(req) {
  const u = req.session.user || {};
  return { empresaId: u.empresa_id || null, sucursalId: u.sucursal_id || null, usuarioId: u.id || null };
}

function parseProveedorIds(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (raw) return [raw];
  return [];
}

async function loadCatalogData(empresaId) {
  const [categorias, proveedores] = await Promise.all([
    Categoria.findAll({ where: { empresa_id: empresaId }, order: [['nombre', 'ASC']] }),
    Proveedor.findAll({ where: { empresa_id: empresaId, activo: true }, order: [['nombre', 'ASC']] }),
  ]);
  return { categorias, proveedores };
}

function buildFormState(body, categoriaId, esGranel, unidad, proveedorIds) {
  return {
    producto: {
      codigo_barras: body.codigo_barras || '',
      nombre: body.nombre || '',
      categoria_id: categoriaId || '',
      es_granel: esGranel,
      unidad_medida: unidad,
    },
    inventario: {
      precio_compra: body.precio_compra != null ? body.precio_compra : '',
      precio_venta: body.precio_venta != null ? body.precio_venta : '',
      stock: body.stock != null ? body.stock : '',
      stock_minimo: body.stock_minimo != null ? body.stock_minimo : '',
    },
    proveedorIds,
  };
}

function renderForm(res, opts) {
  const { error = null, formAction, isEdit, title, activeNav, producto, inventario, proveedorIds, categorias, proveedores } = opts;
  res.render('productos/form', {
    title,
    activeNav,
    formAction,
    isEdit,
    producto,
    inventario,
    proveedorIds,
    categorias,
    proveedores,
    error,
  });
}

/**
 * Listado paginado con búsqueda por nombre/código y filtros por categoría y granel.
 */
async function index(req, res, next) {
  try {
    let perPage = parseInt(req.query.perPage, 10) || DEFAULT_PER_PAGE;
    if (!Number.isFinite(perPage)) perPage = DEFAULT_PER_PAGE;
    perPage = Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, perPage));

    const q = (req.query.q || '').trim();
    const categoriaId = (req.query.categoria_id || '').trim() || null;
    const soloGranel = req.query.solo_granel === '1' || req.query.solo_granel === 'true';
    const stockBajo = req.query.stock_bajo === '1' || req.query.stock_bajo === 'true';

    const { empresaId, sucursalId } = empresaDe(req);

    const where = {};
    if (empresaId) where.empresa_id = empresaId;
    if (categoriaId) where.categoria_id = categoriaId;
    if (soloGranel) where.es_granel = true;
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${q}%` } },
        { codigo_barras: { [Op.like]: `%${q}%` } },
      ];
    }

    const inventarioWhere = {};
    if (sucursalId) inventarioWhere.sucursal_id = sucursalId;
    if (stockBajo) {
      inventarioWhere[Op.and] = [
        sequelize.where(sequelize.col('inventarioSucursal.stock'), '<=', sequelize.col('inventarioSucursal.stock_minimo')),
      ];
    }

    const include = [
      { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'], required: false },
      {
        model: InventarioSucursal,
        as: 'inventarioSucursal',
        attributes: ['id', 'sucursal_id', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo'],
        where: inventarioWhere,
        required: stockBajo,
      },
      { model: Proveedor, as: 'proveedores', attributes: ['id', 'nombre'], through: { attributes: [] }, required: false },
    ];

    const categorias = await Categoria.findAll({ where: { empresa_id: empresaId }, order: [['nombre', 'ASC']] });

    const total = await Producto.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    let page = parseInt(req.query.page, 10) || 1;
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const offset = (page - 1) * perPage;

    const productos = await Producto.findAll({
      where,
      include,
      limit: perPage,
      offset,
      order: [['nombre', 'ASC']],
      subQuery: false,
    });

    res.render('productos/index', {
      title: 'Productos',
      activeNav: 'productos',
      productos,
      categorias,
      categoriaId,
      soloGranel,
      stockBajo,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
        q,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** Formulario de alta. */
async function nuevo(req, res, next) {
  try {
    const { empresaId } = empresaDe(req);
    const { categorias, proveedores } = await loadCatalogData(empresaId);
    renderForm(res, {
      title: 'Nuevo Producto',
      activeNav: 'productos-nuevo',
      formAction: '/productos',
      isEdit: false,
      producto: { es_granel: false, unidad_medida: 'pieza' },
      inventario: {},
      proveedorIds: [],
      categorias,
      proveedores,
    });
  } catch (err) {
    next(err);
  }
}

/** Procesa la creación de producto, inventario, proveedores y outbox. */
async function crear(req, res, next) {
  const { empresaId, sucursalId, usuarioId } = empresaDe(req);
  try {
    const { categorias, proveedores } = await loadCatalogData(empresaId);

    const nombre = (req.body.nombre || '').trim();
    const codigoBarras = (req.body.codigo_barras || '').trim() || null;
    const esGranel = req.body.es_granel === '1' || req.body.es_granel === 'on' || req.body.es_granel === 'true';
    const unidad = esGranel
      ? (UNIDADES_GRANEL.includes(req.body.unidad_medida) ? req.body.unidad_medida : 'kg')
      : 'pieza';
    const precioCompra = toNum(req.body.precio_compra, 0);
    const precioVenta = toNum(req.body.precio_venta, 0);
    const stock = esGranel ? r3(toNum(req.body.stock, 0)) : Math.round(toNum(req.body.stock, 0));
    const stockMinimo = esGranel ? r3(toNum(req.body.stock_minimo, 0)) : Math.round(toNum(req.body.stock_minimo, 0));
    const categoriaId = (req.body.categoria_id || '').trim() || null;
    const proveedorIds = parseProveedorIds(req.body.proveedor_ids);

    const error = validarCampos({ nombre, codigoBarras, precioCompra, precioVenta, stock, stockMinimo });
    if (error) {
      const state = buildFormState(req.body, categoriaId, esGranel, unidad, proveedorIds);
      return renderForm(res, { error, title: 'Nuevo Producto', activeNav: 'productos-nuevo', formAction: '/productos', isEdit: false, ...state, categorias, proveedores });
    }

    if (codigoBarras) {
      const dup = await Producto.findOne({ where: { empresa_id: empresaId, codigo_barras: codigoBarras, activo: true } });
      if (dup) {
        const state = buildFormState(req.body, categoriaId, esGranel, unidad, proveedorIds);
        return renderForm(res, { error: `Ya existe un producto activo con el código de barras "${codigoBarras}".`, title: 'Nuevo Producto', activeNav: 'productos-nuevo', formAction: '/productos', isEdit: false, ...state, categorias, proveedores });
      }
    }

    const t = await sequelize.transaction();
    try {
      const producto = await Producto.create(
        {
          empresa_id: empresaId,
          categoria_id: categoriaId,
          codigo_barras: codigoBarras,
          nombre,
          es_granel: esGranel,
          unidad_medida: unidad,
          activo: true,
        },
        { transaction: t }
      );

      const inventario = await InventarioSucursal.create(
        {
          sucursal_id: sucursalId,
          producto_id: producto.id,
          precio_compra: precioCompra,
          precio_venta: precioVenta,
          stock,
          stock_minimo: stockMinimo,
        },
        { transaction: t }
      );

      if (stock > 0) {
        await MovimientoInventario.create(
          {
            sucursal_id: sucursalId,
            producto_id: producto.id,
            usuario_id: usuarioId,
            tipo: 'ajuste_positivo',
            delta_cantidad: stock,
            referencia_id: null,
          },
          { transaction: t }
        );
      }

      for (const pid of proveedorIds) {
        await ProductoProveedor.create({ producto_id: producto.id, proveedor_id: pid }, { transaction: t });
      }

      await encolarEvento(
        {
          entidad: 'producto',
          entidadId: producto.id,
          operacion: 'CREATE',
          payload: {
            producto: producto.toJSON(),
            inventario: inventario.toJSON(),
            proveedor_ids: proveedorIds,
          },
        },
        t
      );

      await t.commit();
      req.session.flash = { success: `Producto "${nombre}" creado correctamente.` };
      return res.redirect('/productos');
    } catch (err) {
      await t.rollback();
      if (err && err.name === 'SequelizeUniqueConstraintError') {
        const state = buildFormState(req.body, categoriaId, esGranel, unidad, proveedorIds);
        return renderForm(res, { error: `Ya existe un producto con el código de barras "${codigoBarras}".`, title: 'Nuevo Producto', activeNav: 'productos-nuevo', formAction: '/productos', isEdit: false, ...state, categorias, proveedores });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Formulario de edición precargado. */
async function editar(req, res, next) {
  try {
    const { empresaId, sucursalId } = empresaDe(req);
    const producto = await Producto.findOne({
      where: { id: req.params.id, empresa_id: empresaId },
      include: [{ model: Proveedor, as: 'proveedores', attributes: ['id'], through: { attributes: [] } }],
    });
    if (!producto) {
      req.session.flash = { error: 'Producto no encontrado.' };
      return res.redirect('/productos');
    }

    const inventario = await InventarioSucursal.findOne({ where: { producto_id: producto.id, sucursal_id: sucursalId } });
    const proveedorIds = (producto.proveedores || []).map((p) => p.id);
    const { categorias, proveedores } = await loadCatalogData(empresaId);

    renderForm(res, {
      title: 'Editar Producto',
      activeNav: 'productos',
      formAction: `/productos/${producto.id}`,
      isEdit: true,
      producto,
      inventario: inventario || {},
      proveedorIds,
      categorias,
      proveedores,
    });
  } catch (err) {
    next(err);
  }
}

/** Procesa la actualización de producto, inventario, proveedores y outbox. */
async function actualizar(req, res, next) {
  const { empresaId, sucursalId, usuarioId } = empresaDe(req);
  try {
    const producto = await Producto.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!producto) {
      req.session.flash = { error: 'Producto no encontrado.' };
      return res.redirect('/productos');
    }

    const { categorias, proveedores } = await loadCatalogData(empresaId);

    const nombre = (req.body.nombre || '').trim();
    const codigoBarras = (req.body.codigo_barras || '').trim() || null;
    const esGranel = req.body.es_granel === '1' || req.body.es_granel === 'on' || req.body.es_granel === 'true';
    const unidad = esGranel
      ? (UNIDADES_GRANEL.includes(req.body.unidad_medida) ? req.body.unidad_medida : 'kg')
      : 'pieza';
    const precioCompra = toNum(req.body.precio_compra, 0);
    const precioVenta = toNum(req.body.precio_venta, 0);
    const stock = esGranel ? r3(toNum(req.body.stock, 0)) : Math.round(toNum(req.body.stock, 0));
    const stockMinimo = esGranel ? r3(toNum(req.body.stock_minimo, 0)) : Math.round(toNum(req.body.stock_minimo, 0));
    const categoriaId = (req.body.categoria_id || '').trim() || null;
    const proveedorIds = parseProveedorIds(req.body.proveedor_ids);

    const error = validarCampos({ nombre, codigoBarras, precioCompra, precioVenta, stock, stockMinimo });
    if (error) {
      const state = buildFormState(req.body, categoriaId, esGranel, unidad, proveedorIds);
      return renderForm(res, { error, title: 'Editar Producto', activeNav: 'productos', formAction: `/productos/${producto.id}`, isEdit: true, ...state, categorias, proveedores });
    }

    if (codigoBarras) {
      const dup = await Producto.findOne({
        where: { empresa_id: empresaId, codigo_barras: codigoBarras, activo: true, id: { [Op.ne]: producto.id } },
      });
      if (dup) {
        const state = buildFormState(req.body, categoriaId, esGranel, unidad, proveedorIds);
        return renderForm(res, { error: `Ya existe un producto activo con el código de barras "${codigoBarras}".`, title: 'Editar Producto', activeNav: 'productos', formAction: `/productos/${producto.id}`, isEdit: true, ...state, categorias, proveedores });
      }
    }

    const t = await sequelize.transaction();
    try {
      await producto.update(
        { categoria_id: categoriaId, codigo_barras: codigoBarras, nombre, es_granel: esGranel, unidad_medida: unidad },
        { transaction: t }
      );

      let inventario = await InventarioSucursal.findOne({ where: { sucursal_id: sucursalId, producto_id: producto.id }, transaction: t });
      const stockAnterior = inventario ? Number(inventario.stock) : 0;

      if (inventario) {
        await inventario.update({ precio_compra: precioCompra, precio_venta: precioVenta, stock, stock_minimo: stockMinimo }, { transaction: t });
      } else {
        inventario = await InventarioSucursal.create(
          { sucursal_id: sucursalId, producto_id: producto.id, precio_compra: precioCompra, precio_venta: precioVenta, stock, stock_minimo: stockMinimo },
          { transaction: t }
        );
      }

      if (Number(stock) !== stockAnterior) {
        const delta = Number((Number(stock) - stockAnterior).toFixed(3));
        await MovimientoInventario.create(
          {
            sucursal_id: sucursalId,
            producto_id: producto.id,
            usuario_id: usuarioId,
            tipo: delta > 0 ? 'ajuste_positivo' : 'ajuste_negativo',
            delta_cantidad: delta,
            referencia_id: null,
          },
          { transaction: t }
        );
      }

      await ProductoProveedor.destroy({ where: { producto_id: producto.id }, transaction: t });
      for (const pid of proveedorIds) {
        await ProductoProveedor.create({ producto_id: producto.id, proveedor_id: pid }, { transaction: t });
      }

      await encolarEvento(
        {
          entidad: 'producto',
          entidadId: producto.id,
          operacion: 'UPDATE',
          payload: {
            producto: producto.toJSON(),
            inventario: inventario.toJSON(),
            proveedor_ids: proveedorIds,
          },
        },
        t
      );

      await t.commit();
      req.session.flash = { success: `Producto "${nombre}" actualizado correctamente.` };
      return res.redirect('/productos');
    } catch (err) {
      await t.rollback();
      if (err && err.name === 'SequelizeUniqueConstraintError') {
        const state = buildFormState(req.body, categoriaId, esGranel, unidad, proveedorIds);
        return renderForm(res, { error: `Ya existe un producto con el código de barras "${codigoBarras}".`, title: 'Editar Producto', activeNav: 'productos', formAction: `/productos/${producto.id}`, isEdit: true, ...state, categorias, proveedores });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Baja lógica: activo = false y encola UPDATE. */
async function eliminar(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const producto = await Producto.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!producto) {
      req.session.flash = { error: 'Producto no encontrado.' };
      return res.redirect('/productos');
    }

    const t = await sequelize.transaction();
    try {
      await producto.update({ activo: false }, { transaction: t });
      await encolarEvento(
        { entidad: 'producto', entidadId: producto.id, operacion: 'UPDATE', payload: { producto: producto.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Producto "${producto.nombre}" desactivado.` };
      return res.redirect('/productos');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

function validarCampos({ nombre, codigoBarras, precioCompra, precioVenta, stock, stockMinimo }) {
  if (!nombre) return 'El nombre del producto es obligatorio.';
  if (precioCompra < 0) return 'El precio de compra no puede ser negativo.';
  if (precioVenta < 0) return 'El precio de venta no puede ser negativo.';
  if (stock < 0) return 'El stock no puede ser negativo.';
  if (stockMinimo < 0) return 'El stock mínimo no puede ser negativo.';
  return null;
}

module.exports = { index, nuevo, crear, editar, actualizar, eliminar };
