/**
 * Línea de venta: cantidades y precios al momento de la venta (histórico).
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DetalleVenta = sequelize.define(
    'DetalleVenta',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: { args: [1], msg: 'La cantidad debe ser al menos 1' } },
      },
      /** Precio de venta unitario aplicado en caja */
      precio_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: { min: { args: [0], msg: 'El precio no puede ser negativo' } },
      },
      /** Costo unitario al momento de la venta (para reportes de ganancia) */
      costo_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: { min: { args: [0], msg: 'El subtotal no puede ser negativo' } },
      },
      venta_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      producto_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    { tableName: 'detalle_ventas' }
  );

  return DetalleVenta;
};
