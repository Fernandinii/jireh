/**
 * Venta (cabecera POS): contado o crédito (fiado con cliente).
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Venta = sequelize.define(
    'Venta',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'El total no puede ser negativo' } },
      },
      /** contado: cobro inmediato; credito: aumenta saldo del cliente */
      tipo_pago: {
        type: DataTypes.ENUM('contado', 'credito'),
        allowNull: false,
        defaultValue: 'contado',
      },
      fecha_venta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      notas: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      /** Obligatorio si tipo_pago = credito */
      cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'ventas',
      hooks: {
        beforeValidate: (venta) => {
          if (venta.tipo_pago === 'credito' && !venta.cliente_id) {
            throw new Error('Las ventas a crédito deben tener un cliente');
          }
        },
      },
    }
  );

  return Venta;
};
