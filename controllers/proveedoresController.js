const { Op } = require('sequelize');
const { sequelize, Proveedor, Producto } = require('../models');
const { encolarEvento } = require('../services/outboxService');

const DEFAULT_PER_PAGE = 25;
const MIN_PER_PAGE = 5;
const MAX_PER_PAGE = 100;

function empresaDe(req) {
  const u = req.session.user || {};
  return { empresaId: u.empresa_id || null };
}

/** Listado paginado con búsqueda por nombre/contacto/teléfono y conteo de productos. */
async function index(req, res, next) {
  try {
    let perPage = parseInt(req.query.perPage, 10) || DEFAULT_PER_PAGE;
    if (!Number.isFinite(perPage)) perPage = DEFAULT_PER_PAGE;
    perPage = Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, perPage));

    const q = (req.query.q || '').trim();
    const { empresaId } = empresaDe(req);

    const where = { empresa_id: empresaId, activo: true };
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${q}%` } },
        { contacto: { [Op.like]: `%${q}%` } },
        { telefono: { [Op.like]: `%${q}%` } },
      ];
    }

    const total = await Proveedor.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    let page = parseInt(req.query.page, 10) || 1;
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const offset = (page - 1) * perPage;

    const proveedores = await Proveedor.findAll({
      where,
      include: [{ model: Producto, as: 'productos', attributes: ['id', 'nombre'], through: { attributes: [] }, required: false }],
      order: [['nombre', 'ASC']],
      limit: perPage,
      offset,
      subQuery: false,
    });

    res.render('proveedores/index', {
      title: 'Proveedores',
      activeNav: 'proveedores',
      proveedores,
      pagination: { page, perPage, total, totalPages, q },
    });
  } catch (err) {
    next(err);
  }
}

/** Formulario de alta. */
async function nuevo(req, res, next) {
  res.render('proveedores/form', {
    title: 'Nuevo Proveedor',
    activeNav: 'proveedores',
    formAction: '/proveedores',
    isEdit: false,
    proveedor: {},
    error: null,
  });
}

async function crear(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) {
      return res.render('proveedores/form', {
        title: 'Nuevo Proveedor',
        activeNav: 'proveedores',
        formAction: '/proveedores',
        isEdit: false,
        proveedor: req.body,
        error: 'El nombre del proveedor es obligatorio.',
      });
    }

    const t = await sequelize.transaction();
    try {
      const proveedor = await Proveedor.create(
        {
          empresa_id: empresaId,
          nombre,
          contacto: (req.body.contacto || '').trim() || null,
          telefono: (req.body.telefono || '').trim() || null,
          email: (req.body.email || '').trim() || null,
          direccion: (req.body.direccion || '').trim() || null,
          activo: true,
        },
        { transaction: t }
      );
      await encolarEvento(
        { entidad: 'proveedor', entidadId: proveedor.id, operacion: 'CREATE', payload: { proveedor: proveedor.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Proveedor "${nombre}" creado correctamente.` };
      return res.redirect('/proveedores');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const { empresaId } = empresaDe(req);
    const proveedor = await Proveedor.findOne({ where: { id: req.params.id, empresa_id: empresaId, activo: true } });
    if (!proveedor) {
      req.session.flash = { error: 'Proveedor no encontrado.' };
      return res.redirect('/proveedores');
    }
    res.render('proveedores/form', {
      title: 'Editar Proveedor',
      activeNav: 'proveedores',
      formAction: `/proveedores/${proveedor.id}`,
      isEdit: true,
      proveedor,
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

async function actualizar(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const proveedor = await Proveedor.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!proveedor) {
      req.session.flash = { error: 'Proveedor no encontrado.' };
      return res.redirect('/proveedores');
    }

    const nombre = (req.body.nombre || '').trim();
    if (!nombre) {
      return res.render('proveedores/form', {
        title: 'Editar Proveedor',
        activeNav: 'proveedores',
        formAction: `/proveedores/${proveedor.id}`,
        isEdit: true,
        proveedor: { ...proveedor.toJSON(), ...req.body },
        error: 'El nombre del proveedor es obligatorio.',
      });
    }

    const t = await sequelize.transaction();
    try {
      await proveedor.update(
        {
          nombre,
          contacto: (req.body.contacto || '').trim() || null,
          telefono: (req.body.telefono || '').trim() || null,
          email: (req.body.email || '').trim() || null,
          direccion: (req.body.direccion || '').trim() || null,
        },
        { transaction: t }
      );
      await encolarEvento(
        { entidad: 'proveedor', entidadId: proveedor.id, operacion: 'UPDATE', payload: { proveedor: proveedor.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Proveedor "${nombre}" actualizado correctamente.` };
      return res.redirect('/proveedores');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const proveedor = await Proveedor.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!proveedor) {
      req.session.flash = { error: 'Proveedor no encontrado.' };
      return res.redirect('/proveedores');
    }

    const t = await sequelize.transaction();
    try {
      await proveedor.update({ activo: false }, { transaction: t });
      await encolarEvento(
        { entidad: 'proveedor', entidadId: proveedor.id, operacion: 'UPDATE', payload: { proveedor: proveedor.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Proveedor "${proveedor.nombre}" desactivado.` };
      return res.redirect('/proveedores');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { index, nuevo, crear, editar, actualizar, eliminar };
