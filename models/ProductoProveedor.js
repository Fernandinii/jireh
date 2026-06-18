const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductoProveedor = sequelize.define(
    'ProductoProveedor',
    {
      producto_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
        onDelete: 'CASCADE',
      },
      proveedor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'proveedores', key: 'id' },
        onDelete: 'CASCADE',
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
