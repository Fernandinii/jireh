/**
 * Cola de sincronización offline-first: registra cambios locales para replicarlos
 * a la nube (PostgreSQL) cuando haya conexión.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SyncQueue = sequelize.define(
    'SyncQueue',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      event_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
      },
      entidad: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entidad_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      operacion: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      payload_json: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pendiente',
      },
      intentos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      ultimo_error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    { tableName: 'sync_queue' }
  );

  return SyncQueue;
};
