const { Op } = require('sequelize');
const {
  sequelize,
  Cliente,
  Abono,
  Venta,
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

/** Listado paginado con búsqueda, filtro por adeudo y total por cobrar. */
async function index(req, res, next) {
  try {
    let perPage = parseInt(req.query.perPage, 10) || DEFAULT_PER_PAGE;
    if (!Number.isFinite(perPage)) perPage = DEFAULT_PER_PAGE;
    perPage = Math.min(MAX_PER_PAGE, Math.max(MIN_PER_PAGE, perPage));

    const q = (req.query.q || '').trim();
    const conAdeudo = req.query.con_adeudo === '1' || req.query.con_adeudo === 'true';

    const { empresaId } = empresaDe(req);

    const where = { empresa_id: empresaId, activo: true };
    if (conAdeudo) where.saldo_actual = { [Op.gt]: 0 };
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${q}%` } },
        { telefono: { [Op.like]: `%${q}%` } },
      ];
    }

    const totalPorCobrar = Number(
      (await Cliente.sum('saldo_actual', { where: { empresa_id: empresaId, activo: true } })) || 0
    );

    const total = await Cliente.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    let page = parseInt(req.query.page, 10) || 1;
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    const clientes = await Cliente.findAll({
      where,
      order: [['nombre', 'ASC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    });

    res.render('clientes/index', {
      title: 'Clientes',
      activeNav: 'clientes',
      clientes,
      totalPorCobrar,
      conAdeudo,
      pagination: { page, perPage, total, totalPages, q },
    });
  } catch (err) {
    next(err);
  }
}

/** Formulario de alta. */
async function nuevo(req, res) {
  res.render('clientes/form', {
    title: 'Nuevo Cliente',
    activeNav: 'clientes',
    formAction: '/clientes',
    isEdit: false,
    cliente: {},
    error: null,
  });
}

/** Alta de cliente. */
async function crear(req, res, next) {
  const { empresaId, sucursalId } = empresaDe(req);
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) {
      return res.render('clientes/form', {
        title: 'Nuevo Cliente',
        activeNav: 'clientes',
        formAction: '/clientes',
        isEdit: false,
        cliente: req.body,
        error: 'El nombre del cliente es obligatorio.',
      });
    }

    const limite = toNum(req.body.limite_credito, 0);

    const t = await sequelize.transaction();
    try {
      const cliente = await Cliente.create(
        {
          empresa_id: empresaId,
          sucursal_id: sucursalId || null,
          nombre,
          telefono: (req.body.telefono || '').trim() || null,
          limite_credito: limite,
          saldo_actual: 0,
          activo: true,
        },
        { transaction: t }
      );
      await encolarEvento(
        { entidad: 'cliente', entidadId: cliente.id, operacion: 'CREATE', payload: { cliente: cliente.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Cliente "${nombre}" creado correctamente.` };
      return res.redirect('/clientes');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Formulario de edición. */
async function editar(req, res, next) {
  try {
    const { empresaId } = empresaDe(req);
    const cliente = await Cliente.findOne({ where: { id: req.params.id, empresa_id: empresaId, activo: true } });
    if (!cliente) {
      req.session.flash = { error: 'Cliente no encontrado.' };
      return res.redirect('/clientes');
    }
    res.render('clientes/form', {
      title: 'Editar Cliente',
      activeNav: 'clientes',
      formAction: `/clientes/${cliente.id}`,
      isEdit: true,
      cliente,
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

/** Actualización de datos y límite de crédito. */
async function actualizar(req, res, next) {
  const { empresaId } = empresaDe(req);
  try {
    const cliente = await Cliente.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!cliente) {
      req.session.flash = { error: 'Cliente no encontrado.' };
      return res.redirect('/clientes');
    }

    const nombre = (req.body.nombre || '').trim();
    if (!nombre) {
      return res.render('clientes/form', {
        title: 'Editar Cliente',
        activeNav: 'clientes',
        formAction: `/clientes/${cliente.id}`,
        isEdit: true,
        cliente: { ...cliente.toJSON(), ...req.body },
        error: 'El nombre del cliente es obligatorio.',
      });
    }

    const t = await sequelize.transaction();
    try {
      await cliente.update(
        {
          nombre,
          telefono: (req.body.telefono || '').trim() || null,
          limite_credito: toNum(req.body.limite_credito, 0),
        },
        { transaction: t }
      );
      await encolarEvento(
        { entidad: 'cliente', entidadId: cliente.id, operacion: 'UPDATE', payload: { cliente: cliente.toJSON() } },
        t
      );
      await t.commit();
      req.session.flash = { success: `Cliente "${nombre}" actualizado correctamente.` };
      return res.redirect('/clientes');
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/** Estado de cuenta + historial de ventas a crédito y abonos. */
async function detalle(req, res, next) {
  await renderCuenta(req, res, next, { clienteId: req.params.id });
}

/** Control de abonos: selector de cliente + estado de cuenta. */
async function abonos(req, res, next) {
  await renderCuenta(req, res, next, { clienteId: (req.query.cliente_id || '').trim() || null });
}

async function renderCuenta(req, res, next, { clienteId }) {
  try {
    const { empresaId } = empresaDe(req);

    const clientes = await Cliente.findAll({
      where: { empresa_id: empresaId, activo: true },
      order: [['nombre', 'ASC']],
    });

    let cliente = null;
    let historial = [];

    if (clienteId) {
      cliente = await Cliente.findOne({ where: { id: clienteId, empresa_id: empresaId, activo: true } });
      if (!cliente) {
        req.session.flash = { error: 'Cliente no encontrado.' };
        return res.redirect('/clientes/abonos');
      }

      const [ventasCredito, abonos] = await Promise.all([
        Venta.findAll({
          where: { cliente_id: cliente.id, tipo_pago: 'credito' },
          order: [['fecha_venta', 'DESC']],
        }),
        Abono.findAll({
          where: { cliente_id: cliente.id },
          order: [['fecha_abono', 'DESC']],
        }),
      ]);

      historial = [
        ...ventasCredito.map((v) => ({
          tipo: 'venta',
          fecha: v.fecha_venta,
          descripcion: `Venta a crédito #${String(v.folio_local || '').padStart(4, '0')}`,
          cargo: Number(v.total),
          abono: 0,
        })),
        ...abonos.map((a) => ({
          tipo: 'abono',
          fecha: a.fecha_abono,
          descripcion: `Abono (${a.metodo_pago})${a.notas ? ' — ' + a.notas : ''}`,
          cargo: 0,
          abono: Number(a.monto),
        })),
      ].sort((x, y) => new Date(y.fecha) - new Date(x.fecha));
    }

    res.render('clientes/detalle', {
      title: 'Estado de Cuenta',
      activeNav: 'clientes',
      clientes,
      cliente,
      clienteId: cliente ? cliente.id : '',
      historial,
    });
  } catch (err) {
    next(err);
  }
}

/** Registro transaccional de abono. */
async function registrarAbono(req, res, next) {
  const { empresaId, sucursalId, usuarioId } = empresaDe(req);
  try {
    const cliente = await Cliente.findOne({ where: { id: req.params.id, empresa_id: empresaId } });
    if (!cliente) {
      req.session.flash = { error: 'Cliente no encontrado.' };
      return res.redirect('/clientes/abonos');
    }

    const monto = toNum(req.body.monto, 0);
    const saldoActual = Number(cliente.saldo_actual);

    if (!(monto > 0)) {
      req.session.flash = { error: 'El monto del abono debe ser mayor a cero.' };
      return res.redirect(`/clientes/${cliente.id}`);
    }
    if (monto > saldoActual) {
      req.session.flash = { error: `El monto excede el saldo pendiente ($${saldoActual.toFixed(2)}).` };
      return res.redirect(`/clientes/${cliente.id}`);
    }

    const t = await sequelize.transaction();
    try {
      const abono = await Abono.create(
        {
          empresa_id: empresaId,
          sucursal_id: sucursalId,
          cliente_id: cliente.id,
          usuario_id: usuarioId,
          monto,
          metodo_pago: (req.body.metodo_pago || 'efectivo').trim(),
          notas: (req.body.notas || '').trim() || null,
          fecha_abono: new Date(),
        },
        { transaction: t }
      );

      cliente.saldo_actual = Number((saldoActual - monto).toFixed(2));
      await cliente.save({ transaction: t });

      await encolarEvento(
        {
          entidad: 'abono',
          entidadId: abono.id,
          operacion: 'CREATE',
          payload: { abono: abono.toJSON(), clienteSaldoNuevo: cliente.saldo_actual },
        },
        t
      );

      await t.commit();
      req.session.flash = {
        success: `Abono de $${monto.toFixed(2)} registrado. Saldo pendiente: $${cliente.saldo_actual.toFixed(2)}.`,
      };
      return res.redirect(`/clientes/${cliente.id}`);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

module.exports = { index, nuevo, crear, editar, actualizar, detalle, abonos, registrarAbono };
