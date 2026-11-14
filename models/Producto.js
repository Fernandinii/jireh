/**
 * Producto (catálogo). Los precios y stock viven en InventarioSucursal por sucursal.
 * Soporta venta a granel mediante es_granel + unidad_medida.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Producto = sequelize.define(
    'Producto',
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
      categoria_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'categorias', key: 'id' },
      },
      codigo_barras: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      nombre: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } },
      },
      es_granel: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      unidad_medida: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'pieza',
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'productos',
      indexes: [
        { unique: true, fields: ['empresa_id', 'codigo_barras'] },
      ],
    }
  );

  return Producto;
};
