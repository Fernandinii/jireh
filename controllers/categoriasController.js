const { sequelize, Categoria, Producto } = require('../models');
const { encolarEvento } = require('../services/outboxService');

function empresaDe(req) {
  const u = req.session.user || {};
  return { empresaId: u.empresa_id || null };
}

/** Lista categorías con conteo de productos activos. */
async function index(req, res, next) {
  try {
    const { empresaId } = empresaDe(req);
    const categorias = await Categoria.findAll({
      where: { empresa_id: empresaId },
      attributes: {
        include: [[sequelize.fn('COUNT', sequelize.col('productos.id')), 'productosCount']],
      },
      include: [
        { model: Producto, as: 'productos', attributes: [], where: { activo: true }, required: false },
      ],
      group: ['Categoria.id'],
      order: [['nombre', 'ASC']],
      subQuery: false,
    });
    res.render('productos/categorias', {
      title: 'Categorías',
      activeNav: 'productos-categorias',
      categorias,
    });
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const nombre = (req.body.nombre || '').trim();
    const colorHex = (req.body.color_hex || '').trim() || '#6c757d';
    if (!nombre) {
      req.session.flash = { error: 'El nombre de la categoría es obligatorio.' };
      return res.redirect('/productos/categorias');
    }

    const t = await sequelize.transaction();
    try {
      const categoria = await Categoria.create({ empresa_id: empresaId, nombre, color_hex: colorHex }, { transaction: t });
      await encolarEvento(
        { entidad: 'categoria', entidadId: categoria.id, operacion: 'CREATE', payload: { categoria: categoria.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Categoría "${nombre}" creada.` };
      return res.redirect('/productos/categorias');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const categoria = await Categoria.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!categoria) {
      req.session.flash = { error: 'Categoría no encontrada.' };
      return res.redirect('/productos/categorias');
    }

    const nombre = (req.body.nombre || '').trim();
    const colorHex = (req.body.color_hex || '').trim() || categoria.color_hex;
    if (!nombre) {
      req.session.flash = { error: 'El nombre de la categoría es obligatorio.' };
      return res.redirect('/productos/categorias');
    }

    const t = await sequelize.transaction();
    try {
      await categoria.update({ nombre, color_hex: colorHex }, { transaction: t });
      await encolarEvento(
        { entidad: 'categoria', entidadId: categoria.id, operacion: 'UPDATE', payload: { categoria: categoria.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Categoría "${nombre}" actualizada.` };
      return res.redirect('/productos/categorias');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Elimina la categoría; si tiene productos, los desasocia (categoria_id = null). */
async function eliminar(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const categoria = await Categoria.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!categoria) {
      req.session.flash = { error: 'Categoría no encontrada.' };
      return res.redirect('/productos/categorias');
    }

    const t = await sequelize.transaction();
    try {
      const productos = await Producto.findAll({ where: { categoria_id: categoria.id, empresa_id: empresaId }, transaction: t });
      const desasociados = [];
      for (const p of productos) {
        await p.update({ categoria_id: null }, { transaction: t });
        desasociados.push(p.id);
      }

      await categoria.destroy({ transaction: t });
      await encolarEvento(
        {
          entidad: 'categoria',
          entidadId: categoria.id,
          operacion: 'DELETE',
          payload: { categoria: categoria.toJSON(), productosDesasociados: desasociados },
        },
        t
      );
      await t.commit();

      const msg = desasociados.length
        ? `Categoría "${categoria.nombre}" eliminada (${desasociados.length} producto(s) quedaron sin categoría).`
        : `Categoría "${categoria.nombre}" eliminada.`;
      req.session.flash = { success: msg };
      return res.redirect('/productos/categorias');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { index, crear, actualizar, eliminar };
