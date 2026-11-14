/**
 * Compra (cabecera): entrada de mercancía de un proveedor a una sucursal.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Compra = sequelize.define(
    'Compra',
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
      proveedor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'proveedores', key: 'id' },
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      folio_factura: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      fecha_compra: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      notas: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    { tableName: 'compras' }
  );

  return Compra;
};
