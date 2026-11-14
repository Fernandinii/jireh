const { Op } = require('sequelize');
const {
  Venta,
  DetalleVenta,
  Abono,
  Usuario,
  Cliente,
  Producto,
} = require('../models');

const TIPOS_PAGO = ['contado', 'credito', 'transferencia', 'tarjeta'];

function empresaDe(req) {
  const u = req.session.user || {};
  return { empresaId: u.empresa_id || null, sucursalId: u.sucursal_id || null };
}

function r2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Rango de fechas (hoy por defecto) convertido a timestamps locales. */
function resolverRango(req) {
  const hoy = localDateStr(new Date());
  const desde = (req.query.desde || '').trim() || hoy;
  const hasta = (req.query.hasta || '').trim() || hoy;
  const desdeDt = new Date(`${desde}T00:00:00.000`);
  const hastaDt = new Date(`${hasta}T23:59:59.999`);
  return { desde, hasta, desdeDt, hastaDt };
}

/** Filtro base para Venta completada de la sucursal en el rango. */
function ventasWhere(sucursalId, desdeDt, hastaDt) {
  return {
    sucursal_id: sucursalId,
    estado: 'completada',
    fecha_venta: { [Op.between]: [desdeDt, hastaDt] },
  };
}

function formatearCantidadProducto(detalle) {
  const p = detalle.producto || {};
  const c = Number(detalle.cantidad) || 0;
  if (p.es_granel) return `${c.toFixed(3)}${p.unidad_medida || ''}`;
  return `${Number.isInteger(c) ? c : c}x`;
}

function resumenProductos(detalles) {
  return (detalles || [])
    .map((d) => `${formatearCantidadProducto(d)} ${(d.producto && d.producto.nombre) || 'Producto'}`.trim())
    .join('; ');
}

async function index(req, res, next) {
  try {
    const { empresaId, sucursalId } = empresaDe(req);
    const { desde, hasta, desdeDt, hastaDt } = resolverRango(req);

    // ---- Ventas completadas (para métricas, tipos de pago y cajeros) ----
    const ventas = await Venta.findAll({
      where: ventasWhere(sucursalId, desdeDt, hastaDt),
      attributes: ['id', 'total', 'tipo_pago', 'usuario_id'],
      include: [
        { model: Usuario, as: 'usuario', attributes: ['nombre_completo', 'nombre_usuario'], required: false },
      ],
      raw: true,
    });

    let totalVendido = 0;
    const porTipo = {};
    TIPOS_PAGO.forEach((t) => { porTipo[t] = { total: 0, tickets: 0 }; });
    const cajeroMap = new Map();

    for (const v of ventas) {
      const total = Number(v.total) || 0;
      totalVendido += total;

      const tipo = v.tipo_pago && porTipo[v.tipo_pago] ? v.tipo_pago : 'contado';
      porTipo[tipo].total += total;
      porTipo[tipo].tickets += 1;

      const uid = v.usuario_id;
      if (!cajeroMap.has(uid)) {
        cajeroMap.set(uid, {
          nombre: v['usuario.nombre_completo'] || v['usuario.nombre_usuario'] || '—',
          tickets: 0,
          total: 0,
        });
      }
      const cajero = cajeroMap.get(uid);
      cajero.tickets += 1;
      cajero.total += total;
    }

    totalVendido = r2(totalVendido);
    const tickets = ventas.length;
    const ticketPromedio = tickets > 0 ? r2(totalVendido / tickets) : 0;

    // ---- Detalle de venta: utilidad bruta + top productos ----
    const detalles = await DetalleVenta.findAll({
      include: [
        { model: Venta, as: 'venta', where: ventasWhere(sucursalId, desdeDt, hastaDt), attributes: [], required: true },
        { model: Producto, as: 'producto', attributes: ['nombre', 'unidad_medida', 'es_granel'], required: true },
      ],
      attributes: ['producto_id', 'cantidad', 'costo_unitario', 'subtotal'],
      raw: true,
    });

    let ingresosTotales = 0;
    let costoMercanciaVendida = 0;
    const productoMap = new Map();

    for (const d of detalles) {
      const subtotal = Number(d.subtotal) || 0;
      const cantidad = Number(d.cantidad) || 0;
      const costo = Number(d.costo_unitario) || 0;
      ingresosTotales += subtotal;
      costoMercanciaVendida += cantidad * costo;

      const key = d.producto_id;
      if (!productoMap.has(key)) {
        productoMap.set(key, {
          nombre: d['producto.nombre'] || 'Producto',
          unidad_medida: d['producto.unidad_medida'] || '',
          es_granel: !!d['producto.es_granel'],
          cantidad: 0,
          total: 0,
          costo: 0,
        });
      }
      const prod = productoMap.get(key);
      prod.cantidad += cantidad;
      prod.total += subtotal;
      prod.costo += cantidad * costo;
    }

    ingresosTotales = r2(ingresosTotales);
    costoMercanciaVendida = r2(costoMercanciaVendida);
    const utilidadBruta = r2(ingresosTotales - costoMercanciaVendida);
    const margenPorcentaje = ingresosTotales > 0 ? r2((utilidadBruta / ingresosTotales) * 100) : 0;

    const topProductos = Array.from(productoMap.values())
      .map((p) => ({ ...p, total: r2(p.total), costo: r2(p.costo), utilidad: r2(p.total - p.costo) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const porCajero = Array.from(cajeroMap.values())
      .map((c) => ({ ...c, total: r2(c.total) }))
      .sort((a, b) => b.total - a.total);

    // ---- Abonos cobrados en el rango ----
    const abonos = await Abono.findAll({
      where: { sucursal_id: sucursalId, fecha_abono: { [Op.between]: [desdeDt, hastaDt] } },
      attributes: ['monto', 'metodo_pago'],
      raw: true,
    });

    let abonosTotal = 0;
    let abonosEfectivo = 0;
    for (const a of abonos) {
      const monto = Number(a.monto) || 0;
      abonosTotal += monto;
      if (a.metodo_pago === 'efectivo') abonosEfectivo += monto;
    }
    abonosTotal = r2(abonosTotal);
    abonosEfectivo = r2(abonosEfectivo);
    const abonosOtros = r2(abonosTotal - abonosEfectivo);

    // ---- Corte de caja: contado + abonos en efectivo ----
    const efectivoEsperado = r2(porTipo.contado.total + abonosEfectivo);

    res.render('reportes/index', {
      title: 'Reportes',
      activeNav: 'reportes',
      desde,
      hasta,
      totalVendido,
      tickets,
      ticketPromedio,
      utilidadBruta,
      margenPorcentaje,
      abonosTotal,
      abonosEfectivo,
      abonosOtros,
      efectivoEsperado,
      porTipo,
      topProductos,
      porCajero,
    });
  } catch (err) {
    next(err);
  }
}

async function exportarCsv(req, res, next) {
  try {
    const { sucursalId } = empresaDe(req);
    const { desde, hasta, desdeDt, hastaDt } = resolverRango(req);

    const ventas = await Venta.findAll({
      where: ventasWhere(sucursalId, desdeDt, hastaDt),
      include: [
        { model: Usuario, as: 'usuario', attributes: ['nombre_completo', 'nombre_usuario'] },
        { model: Cliente, as: 'cliente', attributes: ['nombre'], required: false },
        {
          model: DetalleVenta,
          as: 'detalles',
          include: [{ model: Producto, as: 'producto', attributes: ['nombre', 'unidad_medida', 'es_granel'] }],
        },
      ],
      order: [['fecha_venta', 'ASC'], ['folio_local', 'ASC']],
    });

    const encabezado = 'Folio,Fecha,Hora,Cajero,Cliente,Tipo_Pago,Total_Venta,Costo_Total,Utilidad_Neta,Productos';
    const lineas = [encabezado];

    for (const v of ventas) {
      const fecha = new Date(v.fecha_venta);
      let costoTotal = 0;
      for (const d of v.detalles || []) {
        costoTotal += (Number(d.cantidad) || 0) * (Number(d.costo_unitario) || 0);
      }
      costoTotal = r2(costoTotal);
      const total = Number(v.total) || 0;
      const utilidadNeta = r2(total - costoTotal);

      lineas.push(
        [
          `#${String(v.folio_local || '').padStart(4, '0')}`,
          fecha.toLocaleDateString('es-MX'),
          fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          v.usuario ? (v.usuario.nombre_completo || v.usuario.nombre_usuario) : '—',
          v.cliente ? v.cliente.nombre : '—',
          v.tipo_pago,
          total.toFixed(2),
          costoTotal.toFixed(2),
          utilidadNeta.toFixed(2),
          resumenProductos(v.detalles),
        ]
          .map((celda) => `"${String(celda == null ? '' : celda).replace(/"/g, '""')}"`)
          .join(',')
      );
    }

    const csv = lineas.join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="corte-jireh-${desde}-a-${hasta}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (err) {
    next(err);
  }
}

module.exports = { index, exportarCsv };
