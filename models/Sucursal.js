/**
 * Sucursal de una empresa. El inventario y las ventas se registran por sucursal.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sucursal = sequelize.define(
    'Sucursal',
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
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } },
      },
      direccion: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      telefono: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    { tableName: 'sucursales' }
  );

  return Sucursal;
};
