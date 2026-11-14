/**
 * Proveedor de una empresa.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Proveedor = sequelize.define(
    'Proveedor',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      empresa_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'empresas', key: 'id' },
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
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      direccion: {
        type: DataTypes.TEXT,
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
