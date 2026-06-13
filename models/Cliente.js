/**
 * Cliente (fiado): saldo representa deuda pendiente; abonos la reducen.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cliente = sequelize.define(
    'Cliente',
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
      /** Deuda actual del cliente (ventas a crédito menos abonos) */
      saldo: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El saldo no puede ser negativo' } },
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
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
