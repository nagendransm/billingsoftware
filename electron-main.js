const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverInstance = null;

function checkPort(url) {
  return new Promise((resolve) => {
    const req = http.get(url + '/api/health', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServerStarted() {
  const isUp = await checkPort('http://localhost:5000');
  if (isUp) return;

  // Start internal server
  try {
    serverInstance = require('./server/index');
  } catch (err) {
    console.error('Failed to import server:', err);
  }

  // Poll until ready (up to 5 seconds)
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 200));
    const ready = await checkPort('http://localhost:5000');
    if (ready) break;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'தமிழ்நாடு மளிகை ஜிஎஸ்டி பில்லிங்',
    icon: path.join(__dirname, 'app.ico'),
    autoHideMenuBar: true,
    backgroundColor: '#064e3b',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });

  // Remove standard browser menu
  Menu.setApplicationMenu(null);

  // Load local POS app with automatic retry
  const loadPOS = () => {
    mainWindow.loadURL('http://localhost:5000').catch((err) => {
      console.log('Retrying loadURL in 500ms...', err);
      setTimeout(loadPOS, 500);
    });
  };
  loadPOS();

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log(`Failed to load ${validatedURL}: ${errorCode} - ${errorDescription}, retrying in 1s...`);
    setTimeout(loadPOS, 1000);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await ensureServerStarted();
  createWindow();

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
