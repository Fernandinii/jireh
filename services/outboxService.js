/**
 * Patrón Outbox: encola cambios locales en sync_queue para replicarlos a la nube.
 * Todas las escrituras reciben `transaction` para ser atómicas con la operación padre.
 */
const { Op } = require('sequelize');
const { sequelize, SyncQueue } = require('../models');

/**
 * Inserta un evento en la cola de sincronización.
 * @param {Object} args
 * @param {string} args.entidad
 * @param {string} args.entidadId
 * @param {string} args.operacion
 * @param {Object} args.payload
 * @param {import('sequelize').Transaction} transaction
 */
async function encolarEvento({ entidad, entidadId, operacion, payload }, transaction) {
  return SyncQueue.create(
    {
      entidad,
      entidad_id: entidadId,
      operacion,
      payload_json: JSON.stringify(payload),
      estado: 'pendiente',
      intentos: 0,
    },
    { transaction }
  );
}

/**
 * Eventos pendientes de sincronizar (FIFO estricto por id).
 * Incluye los que ya fallaron pero aún no superan el máximo de intentos.
 * @param {number} limite
 */
async function obtenerPendientes(limite = 50) {
  return SyncQueue.findAll({
    where: {
      [Op.or]: [{ estado: 'pendiente' }, { estado: 'error', intentos: { [Op.lt]: 5 } }],
    },
    order: [['id', 'ASC']],
    limit: limite,
  });
}

/**
 * Marca como sincronizados los ids indicados.
 * @param {number[]} ids
 */
async function marcarSincronizados(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  await SyncQueue.update({ estado: 'sincronizado' }, { where: { id: { [Op.in]: ids } } });
}

/**
 * Registra un fallo de sincronización: incrementa intentos, guarda el error
 * y cambia el estado a 'error'.
 * @param {number} id
 * @param {string} mensajeError
 */
async function registrarFallo(id, mensajeError) {
  await SyncQueue.update(
    {
      estado: 'error',
      ultimo_error: mensajeError,
      intentos: sequelize.literal('intentos + 1'),
    },
    { where: { id } }
  );
}

module.exports = {
  encolarEvento,
  obtenerPendientes,
  marcarSincronizados,
  registrarFallo,
};
