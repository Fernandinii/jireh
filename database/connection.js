/**
 * Conexión Sequelize + SQLite.
 * Ruta del archivo: carpeta database del proyecto en desarrollo;
 * en Electron empaquetado conviene usar app.getPath('userData') (comentadoabajo).
 */
const path = require('path');
const { Sequelize } = require('sequelize');

function resolveStoragePath() {
  // Si en el futuro corres dentro de Electron ya iniciado, puedes usar:
  // try {
  //   const { app } = require('electron');
  //   if (app?.getPath) return path.join(app.getPath('userData'), 'pos.sqlite');
  // } catch (_) { /* no Electron */ }
  return path.join(__dirname, 'pos.sqlite');
}

const storagePath = resolveStoragePath();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: storagePath,
  logging: process.env.SQL_LOG === '1' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
});

module.exports = { sequelize, storagePath };
