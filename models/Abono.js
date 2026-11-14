/**
 * Abono a cuenta de un cliente (fiado): reduce saldo_actual.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Abono = sequelize.define(
    'Abono',
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
        allowNull: false,
        references: { model: 'sucursales', key: 'id' },
      },
      cliente_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
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
      metodo_pago: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'efectivo',
      },
      notas: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      fecha_abono: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    { tableName: 'abonos' }
  );

  return Abono;
};
