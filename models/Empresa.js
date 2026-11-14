/**
 * Empresa (tenant). Todas las entidades cuelgan de una empresa para multi-tenencia.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Empresa = sequelize.define(
    'Empresa',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } },
      },
      rfc: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      plan: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'basico',
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    { tableName: 'empresas' }
  );

  return Empresa;
};
