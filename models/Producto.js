/**
 * Producto: inventario y precios; opcionalmente ligado a un proveedor.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Producto = sequelize.define(
    'Producto',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } },
      },
      codigo_barras: {
        type: DataTypes.STRING(80),
        allowNull: true,
        unique: { msg: 'El código de barras ya está registrado' },
      },
      precio_compra: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El precio de compra no puede ser negativo' } },
      },
      precio_venta: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El precio de venta no puede ser negativo' } },
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El stock no puede ser negativo' } },
      },
      stock_minimo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El stock mínimo no puede ser negativo' } },
      },
      proveedor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    { tableName: 'productos' }
  );

  return Producto;
};
