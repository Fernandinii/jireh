/**
 * Modelo Usuario: login, roles administrador | vendedor.
 * La contraseña se guarda hasheada (bcrypt); no exponer el hash en JSON por defecto.
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

module.exports = (sequelize) => {
  const Usuario = sequelize.define(
    'Usuario',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre_usuario: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: { msg: 'El nombre de usuario ya existe' },
        validate: {
          notEmpty: { msg: 'El usuario es obligatorio' },
        },
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
        type: DataTypes.ENUM('administrador', 'vendedor'),
        allowNull: false,
        defaultValue: 'vendedor',
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'usuarios',
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

  Usuario.prototype.comparePassword = function comparePassword(plain) {
    return bcrypt.compare(plain, this.password_hash);
  };

  /** Asigna contraseña en texto plano (el hook la hashea) */
  Usuario.prototype.setPasswordPlain = async function setPasswordPlain(plain) {
    this.password_hash = plain;
    await this.save({ fields: ['password_hash'] });
  };

  return Usuario;
};
