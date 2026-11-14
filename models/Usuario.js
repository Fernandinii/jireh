/**
 * Usuario: login y roles. Ligado a una empresa y, opcionalmente, a una sucursal.
 * La contraseña se guarda hasheada (bcrypt) vía hooks beforeCreate/beforeUpdate.
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

module.exports = (sequelize) => {
  const Usuario = sequelize.define(
    'Usuario',
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
      nombre_usuario: {
        type: DataTypes.STRING(80),
        allowNull: false,
        validate: { notEmpty: { msg: 'El usuario es obligatorio' } },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      nombre_completo: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      rol: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'cajero',
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'usuarios',
      indexes: [
        { unique: true, fields: ['empresa_id', 'nombre_usuario'] },
      ],
      hooks: {
        beforeCreate: async (user) => {
          if (user.password_hash && !user.password_hash.startsWith('$2')) {
            user.password_hash = await bcrypt.hash(user.password_hash, SALT_ROUNDS);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed('password_hash') && user.password_hash && !user.password_hash.startsWith('$2')) {
            user.password_hash = await bcrypt.hash(user.password_hash, SALT_ROUNDS);
          }
        },
      },
      defaultScope: {
        attributes: { exclude: ['password_hash'] },
      },
      scopes: {
        withPassword: { attributes: { exclude: [] } },
      },
    }
  );

  Usuario.prototype.validarPassword = function validarPassword(plain) {
    return bcrypt.compare(plain, this.password_hash);
  };

  /** Asigna contraseña en texto plano (el hook la hashea). */
  Usuario.prototype.setPasswordPlain = async function setPasswordPlain(plain) {
    this.password_hash = plain;
    await this.save({ fields: ['password_hash'] });
  };

  return Usuario;
};
