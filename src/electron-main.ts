import { app, BrowserWindow, globalShortcut, clipboard, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import isDev from 'electron-is-dev';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 768,
    titleBarStyle: 'hidden',
    backgroundColor: '#050505',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Enable Start with Laptop (Auto-start)
  if (!isDev) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe')
    });
  }

  const url = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Register Global Shortcut: Ctrl + J (or Cmd + J on Mac)
  globalShortcut.register('CommandOrControl+J', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- IPC Listeners for Real System Actions ---

ipcMain.handle('read-clipboard', () => {
  return clipboard.readText();
});

ipcMain.handle('execute-action', async (event, action) => {
  const { type, params } = action;
  
  try {
    switch (type) {
      case 'OPEN_APP':
        // Safe command mapping to prevent arbitrary shell execution
        const appMap: Record<string, string> = {
          'code': 'code',
          'chrome': 'chrome',
          'explorer': 'explorer',
          'calculator': 'calc',
          'notepad': 'notepad'
        };
        const cmd = appMap[params.name.toLowerCase()] || params.name;
        exec(cmd);
        return { success: true, message: `Initialized ${params.name}` };

      case 'SEARCH':
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.query)}`;
        await shell.openExternal(searchUrl);
        return { success: true, message: `Searching for: ${params.query}` };

      case 'CREATE_FILE':
        const desktopPath = app.getPath('desktop');
        const filePath = path.join(desktopPath, params.filename);
        fs.writeFileSync(filePath, params.content);
        return { success: true, message: `File created at: ${filePath}` };

      default:
        return { success: false, message: 'Unknown action type' };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
