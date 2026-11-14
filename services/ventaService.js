/**
 * Lógica transaccional de caja: registrarVenta.
 * Todo ocurre en una única transacción Sequelize con rollback ante cualquier error.
 */
const {
  sequelize,
  Producto,
  InventarioSucursal,
  Cliente,
  Venta,
  DetalleVenta,
  MovimientoInventario,
  Faltante,
} = require('../models');
const { encolarEvento } = require('./outboxService');

/**
 * Registra una venta (contado o crédito/fiado).
 * @param {Object} datosVenta
 * @param {string} datosVenta.empresaId
 * @param {string} datosVenta.sucursalId
 * @param {string} datosVenta.usuarioId
 * @param {string|null} datosVenta.clienteId
 * @param {string} datosVenta.tipoPago - 'contado' | 'credito'
 * @param {number} datosVenta.montoRecibido
 * @param {Array<{productoId: string, cantidad: number}>} datosVenta.items
 */
async function registrarVenta(datosVenta) {
  const {
    empresaId,
    sucursalId,
    usuarioId,
    clienteId = null,
    tipoPago = 'contado',
    montoRecibido = 0,
    items = [],
  } = datosVenta || {};

  if (!empresaId || !sucursalId || !usuarioId) {
    throw new Error('empresaId, sucursalId y usuarioId son obligatorios');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La venta debe incluir al menos un producto');
  }

  const t = await sequelize.transaction();

  try {
    const soportaLock = sequelize.getDialect() === 'postgres';
    const lineas = [];

    // ---- Validación y carga de productos + inventario (bloqueo de fila) ----
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error('Cada cantidad debe ser mayor a cero');
      }

      const producto = await Producto.findByPk(item.productoId, { transaction: t });
      if (!producto || !producto.activo || producto.empresa_id !== empresaId) {
        throw new Error('Producto no encontrado o inactivo');
      }

      const inventarioQuery = {
        where: { sucursal_id: sucursalId, producto_id: item.productoId },
        transaction: t,
      };
      if (soportaLock) inventarioQuery.lock = t.LOCK.UPDATE;

      const inventario = await InventarioSucursal.findOne(inventarioQuery);
      if (!inventario) {
        throw new Error(`No hay inventario para "${producto.nombre}" en esta sucursal`);
      }

      if (!producto.es_granel && !Number.isInteger(cantidad)) {
        throw new Error(`El producto "${producto.nombre}" no admite fracciones`);
      }

      if (Number(inventario.stock) < cantidad) {
        throw new Error(
          `Stock insuficiente para "${producto.nombre}" (disponible: ${Number(inventario.stock)})`
        );
      }

      lineas.push({ producto, inventario, cantidad });
    }

    // ---- Cálculo de totales y folio local ----
    let total = 0;
    for (const linea of lineas) {
      const precioVenta = Number(linea.inventario.precio_venta);
      const subtotal = Number((linea.cantidad * precioVenta).toFixed(2));
      linea.subtotal = subtotal;
      total = Number((total + subtotal).toFixed(2));
    }

    let cambio = 0;
    if (tipoPago === 'contado') {
      if (Number(montoRecibido) < total) {
        throw new Error('El monto recibido es menor al total de la venta');
      }
      cambio = Number((Number(montoRecibido) - total).toFixed(2));
    }

    const maxFolio = await Venta.max('folio_local', {
      where: { sucursal_id: sucursalId },
      transaction: t,
    });
    const folioLocal = (Number(maxFolio) || 0) + 1;

    // ---- Validación de crédito / fiado ----
    let cliente = null;
    if (tipoPago === 'credito') {
      if (!clienteId) {
        throw new Error('Las ventas a crédito deben tener un cliente');
      }
      cliente = await Cliente.findOne({
        where: { id: clienteId, empresa_id: empresaId },
        transaction: t,
      });
      if (!cliente) {
        throw new Error('Cliente no encontrado o no pertenece a esta empresa');
      }

      const limite = Number(cliente.limite_credito);
      const saldo = Number(cliente.saldo_actual);
      if (limite > 0 && saldo + total > limite) {
        throw new Error(`Límite de crédito excedido para "${cliente.nombre}"`);
      }

      cliente.saldo_actual = Number((saldo + total).toFixed(2));
      await cliente.save({ transaction: t });
    }

    // ---- Persistencia de venta ----
    const venta = await Venta.create(
      {
        empresa_id: empresaId,
        sucursal_id: sucursalId,
        usuario_id: usuarioId,
        cliente_id: clienteId,
        folio_local: folioLocal,
        total,
        tipo_pago: tipoPago,
        monto_recibido: tipoPago === 'contado' ? Number(montoRecibido) : 0,
        cambio,
        estado: 'completada',
        fecha_venta: new Date(),
      },
      { transaction: t }
    );

    const detalles = [];
    for (const linea of lineas) {
      const detalle = await DetalleVenta.create(
        {
          venta_id: venta.id,
          producto_id: linea.producto.id,
          cantidad: linea.cantidad,
          precio_unitario: Number(linea.inventario.precio_venta),
          costo_unitario: Number(linea.inventario.precio_compra),
          subtotal: linea.subtotal,
        },
        { transaction: t }
      );
      detalles.push(detalle);
    }

    // ---- Stock, kardex y faltantes automáticos ----
    const movimientos = [];
    for (const linea of lineas) {
      const { producto, inventario, cantidad } = linea;

      inventario.stock = Number((Number(inventario.stock) - cantidad).toFixed(3));
      await inventario.save({ transaction: t });

      const movimiento = await MovimientoInventario.create(
        {
          sucursal_id: sucursalId,
          producto_id: producto.id,
          usuario_id: usuarioId,
          tipo: 'venta',
          delta_cantidad: -Math.abs(cantidad),
          referencia_id: venta.id,
        },
        { transaction: t }
      );
      movimientos.push(movimiento);

      const nuevoStock = Number(inventario.stock);
      if (nuevoStock <= Number(inventario.stock_minimo)) {
        const existente = await Faltante.findOne({
          where: { sucursal_id: sucursalId, producto_id: producto.id, resuelto: false },
          transaction: t,
        });
        if (!existente) {
          const cantidadSugerida = Math.max(
            1,
            Number(inventario.stock_minimo) * 2 - nuevoStock
          );
          await Faltante.create(
            {
              sucursal_id: sucursalId,
              producto_id: producto.id,
              descripcion: producto.nombre,
              cantidad_sugerida: Number(cantidadSugerida.toFixed(3)),
              origen: 'stock_bajo',
              resuelto: false,
            },
            { transaction: t }
          );
        }
      }
    }

    // ---- Outbox: encolar dentro de la misma transacción ----
    await encolarEvento(
      {
        entidad: 'venta',
        entidadId: venta.id,
        operacion: 'CREATE',
        payload: {
          venta: venta.toJSON(),
          detalles: detalles.map((d) => d.toJSON()),
          movimientos: movimientos.map((m) => m.toJSON()),
          clienteActualizado: cliente ? cliente.toJSON() : null,
        },
      },
      t
    );

    await t.commit();

    return { venta, detalles };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

module.exports = { registrarVenta };
