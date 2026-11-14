/**
 * Línea de venta: cantidades (3 decimales para granel) y precios históricos.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DetalleVenta = sequelize.define(
    'DetalleVenta',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      venta_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'ventas', key: 'id' },
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
      precio_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      costo_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
    },
    { tableName: 'detalle_ventas' }
  );

  return DetalleVenta;
};
