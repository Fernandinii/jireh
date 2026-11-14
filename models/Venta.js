/**
 * Venta (cabecera POS): contado o crédito, con monto recibido y cambio.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Venta = sequelize.define(
    'Venta',
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
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      cliente_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'clientes', key: 'id' },
      },
      folio_local: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      tipo_pago: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'contado',
      },
      monto_recibido: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      cambio: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      estado: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'completada',
      },
      fecha_venta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    { tableName: 'ventas' }
  );

  return Venta;
};
