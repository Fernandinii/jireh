const {
  sequelize,
  Faltante,
  Producto,
  InventarioSucursal,
  Proveedor,
} = require('../models');
const { encolarEvento } = require('../services/outboxService');

function empresaDe(req) {
  const u = req.session.user || {};
  return { empresaId: u.empresa_id || null, sucursalId: u.sucursal_id || null };
}

function toNum(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/** Listado de faltantes abiertos + historial de resueltos recientes. */
async function index(req, res, next) {
  try {
    const { sucursalId } = empresaDe(req);

    const includeProducto = {
      model: Producto,
      as: 'producto',
      attributes: ['id', 'nombre', 'unidad_medida', 'es_granel'],
      required: false,
      include: [
        {
          model: InventarioSucursal,
          as: 'inventarioSucursal',
          attributes: ['stock', 'stock_minimo'],
          where: { sucursal_id: sucursalId },
          required: false,
        },
        { model: Proveedor, as: 'proveedores', attributes: ['id', 'nombre'], through: { attributes: [] }, required: false },
      ],
    };

    const [abiertos, resueltos] = await Promise.all([
      Faltante.findAll({
        where: { sucursal_id: sucursalId, resuelto: false },
        include: [includeProducto],
        order: [['created_at', 'DESC']],
      }),
      Faltante.findAll({
        where: { sucursal_id: sucursalId, resuelto: true },
        include: [includeProducto],
        order: [['updated_at', 'DESC']],
        limit: 10,
      }),
    ]);

    res.render('faltantes/index', {
      title: 'Faltantes',
      activeNav: 'faltantes',
      abiertos,
      resueltos,
    });
  } catch (err) {
    next(err);
  }
}

/** Registra un faltante manual (petición de cliente). */
async function crear(req, res, next) {
  const { empresaId, sucursalId } = empresaDe(req);
  try {
    let producto = null;
    const productoId = (req.body.producto_id || '').trim() || null;
    if (productoId) {
      producto = await Producto.findOne({ where: { id: productoId, empresa_id: empresaId } });
    }

    const descripcion = (req.body.descripcion || '').trim() || (producto ? producto.nombre : '');
    if (!descripcion) {
      req.session.flash = { error: 'Indica qué falta pedir (descripción).' };
      return res.redirect('/faltantes');
    }

    let cantidad = toNum(req.body.cantidad_sugerida, 1);
    if (!(cantidad > 0)) cantidad = 1;

    const t = await sequelize.transaction();
    try {
      const faltante = await Faltante.create(
        {
          sucursal_id: sucursalId,
          producto_id: producto ? producto.id : null,
          descripcion,
          cantidad_sugerida: cantidad,
          origen: 'peticion_cliente',
          resuelto: false,
        },
        { transaction: t }
      );
      await encolarEvento(
        { entidad: 'faltante', entidadId: faltante.id, operacion: 'CREATE', payload: { faltante: faltante.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: 'Faltante registrado.' };
      return res.redirect('/faltantes');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Marca un faltante como surtido. */
async function resolver(req, res, next) {
  const { sucursalId } = empresaDe(req);
  try {
    const faltante = await Faltante.findOne({ where: { id: req.params.id, sucursal_id: sucursalId } });
    if (!faltante) {
      req.session.flash = { error: 'Faltante no encontrado.' };
      return res.redirect('/faltantes');
    }

    const t = await sequelize.transaction();
    try {
      await faltante.update({ resuelto: true }, { transaction: t });
      await encolarEvento(
        { entidad: 'faltante', entidadId: faltante.id, operacion: 'UPDATE', payload: { faltante: faltante.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: 'Faltante marcado como surtido.' };
      return res.redirect('/faltantes');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Elimina un faltante capturado por error. */
async function eliminar(req, res, next) {
  const { sucursalId } = empresaDe(req);
  try {
    const faltante = await Faltante.findOne({ where: { id: req.params.id, sucursal_id: sucursalId } });
    if (!faltante) {
      req.session.flash = { error: 'Faltante no encontrado.' };
      return res.redirect('/faltantes');
    }

    const t = await sequelize.transaction();
    try {
      await encolarEvento(
        { entidad: 'faltante', entidadId: faltante.id, operacion: 'DELETE', payload: { faltante: faltante.toJSON() } },
        t
      );
      await faltante.destroy({ transaction: t });
      await t.commit();
      req.session.flash = { success: 'Faltante eliminado.' };
      return res.redirect('/faltantes');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { index, crear, resolver, eliminar };
