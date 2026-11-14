/**
 * Proceso principal de Electron.
 * Arranca el servidor Express en localhost y abre la ventana que carga la app web.
 */
const path = require('path');
const { app, BrowserWindow } = require('electron');
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';

let mainWindow = null;

// Evitar dos instancias simultáneas (chocan en el puerto 3000).
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // En producción, guardar SQLite fuera del paquete asar (carpeta de datos del usuario).
  if (!process.env.DB_STORAGE && (process.env.NODE_ENV === 'production' || app.isPackaged)) {
    process.env.DB_STORAGE = path.join(app.getPath('userData'), 'pos.sqlite');
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const { startServer } = require('./app');
      await startServer(PORT, HOST);
      createWindow();
    } catch (err) {
      console.error('No se pudo iniciar el servidor Express:', err);
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadURL(`http://${HOST}:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Opcional: abrir DevTools en desarrollo
  if (process.env.ELECTRON_DEV === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}
