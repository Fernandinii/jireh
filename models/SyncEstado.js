/**
 * Estado de sincronización (clave/valor), p. ej. último cursor replicado.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SyncEstado = sequelize.define(
    'SyncEstado',
    {
      clave: {
        type: DataTypes.STRING(50),
        primaryKey: true,
      },
      valor: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    { tableName: 'sync_estado', timestamps: false }
  );

  return SyncEstado;
};
