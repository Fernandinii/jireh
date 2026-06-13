/**
 * Proveedor: datos de contacto; un proveedor tiene muchos productos.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Proveedor = sequelize.define(
    'Proveedor',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } },
      },
      contacto: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      telefono: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      direccion: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    { tableName: 'proveedores' }
  );

  return Proveedor;
};
