/**
 * Abono a cuenta de un cliente: reduce el saldo (fiado).
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Abono = sequelize.define(
    'Abono',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      monto: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
          esPositivo(value) {
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) {
              throw new Error('El monto debe ser mayor a cero');
            }
          },
        },
      },
      fecha_abono: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      notas: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      /** Usuario que registró el abono en caja */
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      /** Referencia opcional a una venta a crédito */
      venta_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    { tableName: 'abonos' }
  );

  return Abono;
};
