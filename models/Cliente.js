/**
 * Cliente (fiado). saldo_actual es la deuda pendiente; los abonos la reducen.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cliente = sequelize.define(
    'Cliente',
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
      sucursal_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'sucursales', key: 'id' },
      },
      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } },
      },
      telefono: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      limite_credito: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      saldo_actual: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    { tableName: 'clientes' }
  );

  return Cliente;
};
