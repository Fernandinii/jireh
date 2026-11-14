/**
 * Worker de sincronización en segundo plano (Local-First / Offline-First).
 * No bloquea el hilo principal y no falla si no hay internet o si no hay
 * CLOUD_SYNC_URL configurado (modo "solo local").
 */
const { SyncQueue } = require('../models');
const outboxService = require('./outboxService');

const CLOUD_SYNC_URL = process.env.CLOUD_SYNC_URL || '';
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS) || 15000;
const SYNC_API_KEY = process.env.SYNC_API_KEY || '';

let timer = null;
let sincronizando = false;

let online = false;
let ultimoSync = null;
let pendientesCount = 0;
let ultimoError = null;

async function ciclo() {
  if (sincronizando) return;
  sincronizando = true;

  try {
    pendientesCount = await SyncQueue.count({ where: { estado: 'pendiente' } });

    if (!CLOUD_SYNC_URL) {
      online = false;
      return;
    }

    // Health check con timeout de 4s.
    let saludOk = false;
    try {
      const res = await fetch(`${CLOUD_SYNC_URL}/health`, {
        signal: AbortSignal.timeout(4000),
      });
      saludOk = res.ok;
    } catch (_) {
      saludOk = false;
    }

    if (!saludOk) {
      online = false;
      return;
    }

    online = true;

    const eventos = await outboxService.obtenerPendientes(50);
    if (!eventos.length) {
      ultimoSync = new Date();
      return;
    }

    const ids = eventos.map((e) => e.id);
    const cuerpo = {
      eventos: eventos.map((e) => ({
        id: e.id,
        event_uuid: e.event_uuid,
        entidad: e.entidad,
        entidad_id: e.entidad_id,
        operacion: e.operacion,
        payload_json: e.payload_json,
      })),
    };

    const headers = { 'Content-Type': 'application/json' };
    if (SYNC_API_KEY) headers.Authorization = `Bearer ${SYNC_API_KEY}`;

    try {
      const res = await fetch(`${CLOUD_SYNC_URL}/api/sync/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 200 || res.status === 201) {
        await outboxService.marcarSincronizados(ids);
        ultimoSync = new Date();
      } else {
        throw new Error(`Respuesta inesperada de la nube: ${res.status}`);
      }
    } catch (err) {
      ultimoError = err.message;
      for (const id of ids) {
        await outboxService.registrarFallo(id, err.message);
      }
    }
  } catch (err) {
    ultimoError = err.message;
  } finally {
    sincronizando = false;
  }
}

/**
 * Inicia el worker (idempotente). Ejecuta un primer ciclo y luego por intervalo.
 */
function iniciarSyncWorker() {
  if (timer) return;
  ciclo();
  timer = setInterval(ciclo, SYNC_INTERVAL_MS);
  timer.unref?.();
}

/**
 * Estado actual del worker, para exponerlo a la UI (Electron/web).
 */
function obtenerEstadoSync() {
  return {
    online,
    ultimoSync,
    pendientesCount,
    ultimoError,
  };
}

module.exports = {
  iniciarSyncWorker,
  obtenerEstadoSync,
};
