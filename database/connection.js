/**
 * Conexión Sequelize multi-dialecto:
 *  - SQLite (default, local / offline-first) apuntando a database/pos.sqlite
 *    o a process.env.DB_STORAGE si se define.
 *  - PostgreSQL (nube) cuando DATABASE_URL está presente o DIALECT=postgres.
 *
 * Configuración global: underscored: true, timestamps: true.
 * En SQLite se activa PRAGMA foreign_keys = ON para respetar las FKs.
 */
const path = require('path');
const { Sequelize } = require('sequelize');

const SQL_LOG = process.env.SQL_LOG === '1';

const define = {
  underscored: true,
  timestamps: true,
};

const dialect = process.env.DIALECT || (process.env.DATABASE_URL ? 'postgres' : 'sqlite');

let sequelize;

if (dialect === 'postgres') {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: SQL_LOG ? console.log : false,
    define,
    dialectOptions:
      process.env.PG_SSL === '1'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
  });
} else {
  let storagePath = process.env.DB_STORAGE;

  // En producción sin DB_STORAGE, evitar escribir dentro del paquete asar:
  // usar la carpeta de datos de Electron (userData) cuando esté disponible.
  if (!storagePath && process.env.NODE_ENV === 'production') {
    try {
      const { app } = require('electron');
      storagePath = path.join(app.getPath('userData'), 'pos.sqlite');
    } catch (_) {
      storagePath = path.join(__dirname, 'pos.sqlite');
    }
  }

  if (!storagePath) {
    storagePath = path.join(__dirname, 'pos.sqlite');
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: SQL_LOG ? console.log : false,
    define,
    hooks: {
      afterConnect: (connection) => {
        if (connection && typeof connection.run === 'function') {
          connection.run('PRAGMA foreign_keys = ON;');
        }
      },
    },
  });
}

module.exports = { sequelize };
