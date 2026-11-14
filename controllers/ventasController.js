const { Op } = require('sequelize');
const {
  Producto,
  InventarioSucursal,
  Categoria,
  Cliente,
  Venta,
  DetalleVenta,
  Usuario,
  Sucursal,
  Empresa,
} = require('../models');
const { registrarVenta } = require('../services/ventaService');

/**
 * Búsqueda JSON para el buscador y lector de código de barras.
 * - Si `q` coincide exactamente con `codigo_barras`, devuelve { exacto: true }.
 * - Si no, devuelve hasta 15 coincidencias parciales por nombre o código.
 */
async function buscarProductosApi(req, res) {
  const user = req.session.user;
  const q = (req.query.q || '').trim();

  const base = { empresa_id: user.empresa_id, activo: true };
  const include = [
    { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'], required: false },
    {
      model: InventarioSucursal,
      as: 'inventarioSucursal',
      attributes: ['id', 'sucursal_id', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo'],
      where: { sucursal_id: user.sucursal_id },
      required: true,
    },
  ];

  if (!q) {
    return res.json({ exacto: false, productos: [] });
  }

  const exacto = await Producto.findOne({
    where: { ...base, codigo_barras: q },
    include,
  });
  if (exacto) {
    return res.json({ exacto: true, productos: [exacto] });
  }

  const productos = await Producto.findAll({
    where: {
      ...base,
      [Op.or]: [
        { nombre: { [Op.like]: `%${q}%` } },
        { codigo_barras: { [Op.like]: `%${q}%` } },
      ],
    },
    include,
    order: [['nombre', 'ASC']],
    limit: 15,
  });

  return res.json({ exacto: false, productos });
}

/** Pantalla principal de Caja / POS. */
async function nueva(req, res) {
  const user = req.session.user;
  const clientes = await Cliente.findAll({
    where: { empresa_id: user.empresa_id, activo: true },
    order: [['nombre', 'ASC']],
  });

  res.render('ventas/nueva', {
    title: 'Nueva Venta',
    activeNav: 'ventas-nueva',
    headerSubtitle: 'Punto de venta',
    clientes,
  });
}

/** Procesa el cobro invocando ventaService.registrarVenta. */
async function crear(req, res) {
  const user = req.session.user;
  const { clienteId, tipoPago, montoRecibido, items } = req.body || {};

  try {
    const result = await registrarVenta({
      empresaId: user.empresa_id,
      sucursalId: user.sucursal_id,
      usuarioId: user.id,
      clienteId: clienteId || null,
      tipoPago: tipoPago || 'contado',
      montoRecibido: Number(montoRecibido || 0),
      items: items || [],
    });

    return res.status(201).json({ ok: true, venta: result.venta });
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
}

/** Historial paginado de ventas de la sucursal. */
async function listar(req, res, next) {
  try {
    const user = req.session.user;
    const limit = 20;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const where = { sucursal_id: user.sucursal_id };

    if (req.query.fecha && !Number.isNaN(Date.parse(req.query.fecha))) {
      const fecha = req.query.fecha;
      where.fecha_venta = {
        [Op.between]: [new Date(`${fecha}T00:00:00`), new Date(`${fecha}T23:59:59.999`)],
      };
    }
    if (req.query.tipo_pago === 'contado' || req.query.tipo_pago === 'credito') {
      where.tipo_pago = req.query.tipo_pago;
    }

    const total = await Venta.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const ventas = await Venta.findAll({
      where,
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre_usuario', 'nombre_completo'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre'], required: false },
      ],
      order: [['fecha_venta', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.render('ventas/index', {
      title: 'Ventas',
      activeNav: 'ventas',
      ventas,
      fecha: req.query.fecha || '',
      tipoPago: req.query.tipo_pago || '',
      pagination: { page, perPage: limit, total, totalPages, q: '' },
    });
  } catch (err) {
    next(err);
  }
}

/** Ticket imprimible de una venta. */
async function ticket(req, res, next) {
  try {
    const user = req.session.user;
    const venta = await Venta.findOne({
      where: { id: req.params.id, sucursal_id: user.sucursal_id },
      include: [
        {
          model: DetalleVenta,
          as: 'detalles',
          include: [
            { model: Producto, as: 'producto', attributes: ['id', 'nombre', 'unidad_medida', 'es_granel'] },
          ],
        },
        { model: Usuario, as: 'usuario', attributes: ['id', 'nombre_usuario', 'nombre_completo'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'nombre'], required: false },
        { model: Sucursal, as: 'sucursal', attributes: ['id', 'nombre', 'direccion', 'telefono'] },
        { model: Empresa, as: 'empresa', attributes: ['id', 'nombre', 'rfc'] },
      ],
    });

    if (!venta) {
      return res.status(404).render('errors/404', { title: 'No encontrado' });
    }

    res.render('ventas/ticket', { venta });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  buscarProductosApi,
  nueva,
  crear,
  listar,
  ticket,
};
