/**
 * Inventario por sucursal: precios y stock (con 3 decimales para granel).
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventarioSucursal = sequelize.define(
    'InventarioSucursal',
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
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      precio_compra: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      precio_venta: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      stock: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
      stock_minimo: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'inventario_sucursal',
      indexes: [
        { unique: true, fields: ['sucursal_id', 'producto_id'] },
      ],
    }
  );

  return InventarioSucursal;
};
