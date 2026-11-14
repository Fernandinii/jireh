/**
 * Movimiento de inventario (auditoría): entrada, salida, ajuste, venta, compra, etc.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MovimientoInventario = sequelize.define(
    'MovimientoInventario',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      sucursal_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'sucursales', key: 'id' },
      },
      producto_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'productos', key: 'id' },
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'usuarios', key: 'id' },
      },
      tipo: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      delta_cantidad: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
      },
      referencia_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    { tableName: 'movimientos_inventario' }
  );

  return MovimientoInventario;
};
