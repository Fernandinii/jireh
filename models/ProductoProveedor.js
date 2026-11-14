/**
 * Relación N:M Producto <-> Proveedor con costo de referencia y proveedor preferido.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductoProveedor = sequelize.define(
    'ProductoProveedor',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      proveedor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'proveedores', key: 'id' },
      },
      costo_referencia: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      es_preferido: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'producto_proveedor',
      indexes: [
        { unique: true, fields: ['producto_id', 'proveedor_id'] },
      ],
    }
  );

  return ProductoProveedor;
};
