/**
 * Línea de compra con cantidades (3 decimales para granel) y costos.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DetalleCompra = sequelize.define(
    'DetalleCompra',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      compra_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'compras', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      cantidad: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
      },
      costo_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
    },
    { tableName: 'detalle_compras' }
  );

  return DetalleCompra;
};
