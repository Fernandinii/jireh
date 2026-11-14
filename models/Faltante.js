/**
 * Faltante: producto que necesita reabastecimiento en una sucursal.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Faltante = sequelize.define(
    'Faltante',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      sucursal_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'sucursales', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'productos', key: 'id' },
      },
      descripcion: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      cantidad_sugerida: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 1,
      },
      origen: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'stock_bajo',
      },
      resuelto: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    { tableName: 'faltantes' }
  );

  return Faltante;
};
