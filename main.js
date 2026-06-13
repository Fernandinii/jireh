/**
 * Proceso principal de Electron.
 * Arranca el servidor Express en localhost y abre la ventana que carga la app web.
 */
const { app, BrowserWindow } = require('electron');
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1';

let mainWindow = null;

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
