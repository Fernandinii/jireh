/**
 * Categoría de productos, por empresa.
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Categoria = sequelize.define(
    'Categoria',
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
      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: { notEmpty: { msg: 'El nombre es obligatorio' } },
      },
      color_hex: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#6c757d',
      },
    },
    { tableName: 'categorias' }
  );

  return Categoria;
};
