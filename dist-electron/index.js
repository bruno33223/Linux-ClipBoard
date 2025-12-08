import { app, clipboard, ipcMain, BrowserWindow, nativeImage, protocol, globalShortcut, Tray, Menu, screen } from "electron";
import path, { join, dirname, basename } from "node:path";
import "node:fs";
import fs, { writeFile, rename, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomFillSync, randomUUID } from "node:crypto";
import { exec } from "node:child_process";
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID };
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v4(options);
}
function getTempFilename(file) {
  const f = file instanceof URL ? fileURLToPath(file) : file.toString();
  return join(dirname(f), `.${basename(f)}.tmp`);
}
async function retryAsyncOperation(fn, maxRetries, delayMs) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }
}
class Writer {
  #filename;
  #tempFilename;
  #locked = false;
  #prev = null;
  #next = null;
  #nextPromise = null;
  #nextData = null;
  // File is locked, add data for later
  #add(data) {
    this.#nextData = data;
    this.#nextPromise ||= new Promise((resolve, reject) => {
      this.#next = [resolve, reject];
    });
    return new Promise((resolve, reject) => {
      this.#nextPromise?.then(resolve).catch(reject);
    });
  }
  // File isn't locked, write data
  async #write(data) {
    this.#locked = true;
    try {
      await writeFile(this.#tempFilename, data, "utf-8");
      await retryAsyncOperation(async () => {
        await rename(this.#tempFilename, this.#filename);
      }, 10, 100);
      this.#prev?.[0]();
    } catch (err) {
      if (err instanceof Error) {
        this.#prev?.[1](err);
      }
      throw err;
    } finally {
      this.#locked = false;
      this.#prev = this.#next;
      this.#next = this.#nextPromise = null;
      if (this.#nextData !== null) {
        const nextData = this.#nextData;
        this.#nextData = null;
        await this.write(nextData);
      }
    }
  }
  constructor(filename) {
    this.#filename = filename;
    this.#tempFilename = getTempFilename(filename);
  }
  async write(data) {
    return this.#locked ? this.#add(data) : this.#write(data);
  }
}
class TextFile {
  #filename;
  #writer;
  constructor(filename) {
    this.#filename = filename;
    this.#writer = new Writer(filename);
  }
  async read() {
    let data;
    try {
      data = await readFile(this.#filename, "utf-8");
    } catch (e) {
      if (e.code === "ENOENT") {
        return null;
      }
      throw e;
    }
    return data;
  }
  write(str) {
    return this.#writer.write(str);
  }
}
class DataFile {
  #adapter;
  #parse;
  #stringify;
  constructor(filename, { parse, stringify }) {
    this.#adapter = new TextFile(filename);
    this.#parse = parse;
    this.#stringify = stringify;
  }
  async read() {
    const data = await this.#adapter.read();
    if (data === null) {
      return null;
    } else {
      return this.#parse(data);
    }
  }
  write(obj) {
    return this.#adapter.write(this.#stringify(obj));
  }
}
class JSONFile extends DataFile {
  constructor(filename) {
    super(filename, {
      parse: JSON.parse,
      stringify: (data) => JSON.stringify(data, null, 2)
    });
  }
}
class Memory {
  #data = null;
  read() {
    return Promise.resolve(this.#data);
  }
  write(obj) {
    this.#data = obj;
    return Promise.resolve();
  }
}
function checkArgs(adapter, defaultData2) {
  if (adapter === void 0)
    throw new Error("lowdb: missing adapter");
  if (defaultData2 === void 0)
    throw new Error("lowdb: missing default data");
}
class Low {
  adapter;
  data;
  constructor(adapter, defaultData2) {
    checkArgs(adapter, defaultData2);
    this.adapter = adapter;
    this.data = defaultData2;
  }
  async read() {
    const data = await this.adapter.read();
    if (data)
      this.data = data;
  }
  async write() {
    if (this.data)
      await this.adapter.write(this.data);
  }
  async update(fn) {
    fn(this.data);
    await this.write();
  }
}
async function JSONFilePreset(filename, defaultData2) {
  const adapter = process.env.NODE_ENV === "test" ? new Memory() : new JSONFile(filename);
  const db = new Low(adapter, defaultData2);
  await db.read();
  return db;
}
const defaultData = {
  history: [],
  settings: {
    position: "cursor",
    // Default to cursor as per user request
    grouping: "combined",
    zoom: 100,
    theme: "dark"
    // Assuming dark theme default
  }
};
const dbPath = path.join(app.getPath("userData"), "db.json");
let isWriting = false;
const writeQueue = [];
const processQueue = async () => {
  if (isWriting) return;
  const next = writeQueue.shift();
  if (!next) return;
  isWriting = true;
  try {
    await next();
  } catch (e) {
    console.error("DB Write Error:", e);
  } finally {
    isWriting = false;
    processQueue();
  }
};
const safeUpdate = async (updater) => {
  return new Promise((resolve, reject) => {
    writeQueue.push(async () => {
      try {
        const db = await getDb();
        await db.update(updater);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    processQueue();
  });
};
const getDb = async () => {
  const db = await JSONFilePreset(dbPath, defaultData);
  if (!db.data.settings) {
    db.data.settings = defaultData.settings;
    await db.write();
  }
  return db;
};
const imagesDir = path.join(app.getPath("userData"), "images");
(async () => {
  try {
    await fs.mkdir(imagesDir, { recursive: true });
  } catch (e) {
    console.error("Failed to create images directory", e);
  }
})();
const saveImage = async (image) => {
  const buffer = image.toPNG();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const filePath = path.join(imagesDir, filename);
  await fs.writeFile(filePath, buffer);
  return filename;
};
const addClipboardItem = async (item) => {
  await safeUpdate(({ history }) => {
    if (history.length > 0 && history[0].content === item.content && history[0].type === item.type) {
      return;
    }
    history.unshift(item);
    if (history.length > 100) ;
  });
};
const getHistory = async () => {
  const db = await getDb();
  return db.data.history;
};
const getSettings = async () => {
  const db = await getDb();
  return db.data.settings;
};
const updateSetting = async (key, value) => {
  await safeUpdate(({ settings }) => {
    settings[key] = value;
  });
  const db = await getDb();
  return db.data.settings;
};
const deleteItem = async (id) => {
  await safeUpdate(({ history }) => {
    const index = history.findIndex((i) => i.id === id);
    if (index > -1) {
      const item = history[index];
      if (item.type === "image") {
        const filePath = path.join(imagesDir, item.content);
        fs.unlink(filePath).catch((err) => console.error("Failed to delete image file", err));
      }
      history.splice(index, 1);
    }
  });
};
const togglePin = async (id) => {
  await safeUpdate(({ history }) => {
    const item = history.find((i) => i.id === id);
    if (item) {
      item.isPinned = !item.isPinned;
    }
  });
};
const clearAll = async () => {
  await safeUpdate(({ history }) => {
    const pinned = history.filter((i) => i.isPinned);
    history.forEach((item) => {
      if (!item.isPinned && item.type === "image") {
        const filePath = path.join(imagesDir, item.content);
        fs.unlink(filePath).catch((err) => console.error("Failed to delete image file", err));
      }
    });
    history.length = 0;
    history.push(...pinned);
  });
};
const reorderItems = async (activeId, overId) => {
  await safeUpdate(({ history }) => {
    const oldIndex = history.findIndex((item) => item.id === activeId);
    const newIndex = history.findIndex((item) => item.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      const [movedItem] = history.splice(oldIndex, 1);
      history.splice(newIndex, 0, movedItem);
    }
  });
};
const IPC_CHANNELS = {
  GET_HISTORY: "get-history",
  DELETE_ITEM: "delete-item",
  TOGGLE_PIN: "toggle-pin",
  CLEAR_ALL: "clear-all",
  PASTE_ITEM: "paste-item",
  GET_SETTINGS: "get-settings",
  UPDATE_SETTING: "update-setting",
  REORDER_ITEMS: "reorder-items",
  CLIPBOARD_CHANGED: "clipboard-changed",
  HIDE_WINDOW: "hide-window"
};
let intervalId = null;
let lastText = "";
let lastImageDataUrl = "";
const startClipboardWatcher = (win) => {
  if (intervalId) return;
  lastText = clipboard.readText();
  const img = clipboard.readImage();
  lastImageDataUrl = img.isEmpty() ? "" : img.toDataURL();
  intervalId = setInterval(async () => {
    const text = clipboard.readText();
    const image = clipboard.readImage();
    const imageDataUrl = image.isEmpty() ? "" : image.toDataURL();
    if (text && text !== lastText) {
      lastText = text;
      const newItem = {
        id: v4(),
        type: "text",
        content: text,
        timestamp: Date.now(),
        isPinned: false
      };
      await addClipboardItem(newItem);
      const history = await getHistory();
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.CLIPBOARD_CHANGED, history);
      }
    } else if (!image.isEmpty() && imageDataUrl !== lastImageDataUrl) {
      lastImageDataUrl = imageDataUrl;
      const filename = await saveImage(image);
      const newItem = {
        id: v4(),
        type: "image",
        content: filename,
        // Store filename/path
        timestamp: Date.now(),
        isPinned: false
      };
      await addClipboardItem(newItem);
      const history = await getHistory();
      if (!win.isDestroyed()) {
        win.webContents.send(IPC_CHANNELS.CLIPBOARD_CHANGED, history);
      }
    }
  }, 1e3);
};
const stopClipboardWatcher = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
const registerIpcHandlers = () => {
  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, async () => {
    return await getHistory();
  });
  ipcMain.handle(IPC_CHANNELS.DELETE_ITEM, async (_, id) => {
    await deleteItem(id);
    return await getHistory();
  });
  ipcMain.handle(IPC_CHANNELS.TOGGLE_PIN, async (_, id) => {
    await togglePin(id);
    return await getHistory();
  });
  ipcMain.handle(IPC_CHANNELS.CLEAR_ALL, async () => {
    await clearAll();
    return await getHistory();
  });
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return await getSettings();
  });
  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTING, async (event, key, value) => {
    const result = await updateSetting(key, value);
    if (key === "zoom") {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        const zoom = Number(value);
        const baseWidth = 400;
        const baseHeight = 600;
        const width = Math.round(baseWidth * (zoom / 100));
        const height = Math.round(baseHeight * (zoom / 100));
        win.webContents.setZoomFactor(zoom / 100);
        win.setResizable(true);
        win.setSize(width, height);
        setTimeout(() => {
          win.setResizable(false);
        }, 100);
      }
    }
    return result;
  });
  ipcMain.handle(IPC_CHANNELS.REORDER_ITEMS, async (_, activeId, overId) => {
    return await reorderItems(activeId, overId);
  });
  ipcMain.handle(IPC_CHANNELS.HIDE_WINDOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
  });
  ipcMain.handle("get-app-path", () => {
    if (app.isPackaged) {
      return process.execPath;
    }
    return `${process.execPath} ${app.getAppPath()}`;
  });
  ipcMain.handle(IPC_CHANNELS.PASTE_ITEM, async (event, id) => {
    console.log(`[IPC] PASTE_ITEM called for id: ${id}`);
    const history = await getHistory();
    const item = history.find((i) => i.id === id);
    if (!item) {
      console.log("[IPC] Item not found for paste");
      return;
    }
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.minimize();
    setTimeout(() => {
      if (item.type === "text") {
        clipboard.writeText(item.content);
        exec("xdotool key --clearmodifiers ctrl+v", (error) => {
          if (error) console.error("Failed to paste:", error);
        });
      } else if (item.type === "image") {
        try {
          const imagePath = path.join(imagesDir, item.content);
          const image = nativeImage.createFromPath(imagePath);
          clipboard.writeImage(image);
          exec("xdotool key --clearmodifiers ctrl+v", (error) => {
            if (error) console.error("Failed to paste image:", error);
          });
        } catch (e) {
          console.error("Failed to write image to clipboard", e);
        }
      }
    }, 500);
  });
};
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);
let mainWindow = null;
let tray = null;
const iconPath = app.isPackaged ? path.join(__dirname$1, "../dist/icon.png") : path.join(__dirname$1, "../public/icon.png");
let ignoreBlur = false;
const createWindow = async () => {
  const settings = await getSettings().catch(() => null);
  const zoom = settings?.zoom || 100;
  const baseWidth = 400;
  const baseHeight = 600;
  const width = Math.round(baseWidth * (zoom / 100));
  const height = Math.round(baseHeight * (zoom / 100));
  mainWindow = new BrowserWindow({
    width,
    height,
    x: void 0,
    y: void 0,
    frame: false,
    resizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    transparent: true,
    skipTaskbar: true,
    type: "utility",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.minimize();
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.setZoomFactor(zoom / 100);
  } else {
    mainWindow.loadFile(path.join(__dirname$1, "../dist/index.html"));
    mainWindow.webContents.setZoomFactor(zoom / 100);
  }
  mainWindow.on("blur", () => {
    if (ignoreBlur) {
      console.log("[Window] Blur ignored (debounce).");
      return;
    }
    if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
      if (!mainWindow.isMinimized()) {
        console.log("[Window] Blur event triggered. Hiding.");
        hideWindow();
      }
    }
  });
};
const hideWindow = () => {
  if (!mainWindow) return;
  mainWindow.minimize();
};
const showWindow = async () => {
  if (!mainWindow) return;
  const settings = await getSettings();
  mainWindow.restore();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (settings && settings.zoom) {
    const baseWidth = 400;
    const baseHeight = 600;
    const width = Math.round(baseWidth * (settings.zoom / 100));
    const height = Math.round(baseHeight * (settings.zoom / 100));
    if (mainWindow.getBounds().width !== width || mainWindow.getBounds().height !== height) {
      mainWindow.setSize(width, height);
    }
  }
  if (settings && settings.position === "cursor") {
    const { x, y } = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint({ x, y });
    const winBounds = mainWindow.getBounds();
    let newX = x;
    let newY = y;
    if (newX + winBounds.width > display.bounds.x + display.bounds.width) {
      newX = display.bounds.x + display.bounds.width - winBounds.width;
    }
    if (newY + winBounds.height > display.bounds.y + display.bounds.height) {
      newY = display.bounds.y + display.bounds.height - winBounds.height;
    }
    mainWindow.setPosition(newX, newY);
  } else if (settings && settings.position === "fixed") ;
  else {
    mainWindow.center();
  }
  mainWindow.setSkipTaskbar(true);
  mainWindow.focus();
};
const toggleWindow = async () => {
  if (!mainWindow) return;
  const isMinimized = mainWindow.isMinimized();
  const isVisible = mainWindow.isVisible() && !isMinimized && mainWindow.isFocused();
  if (isVisible) {
    hideWindow();
  } else {
    ignoreBlur = true;
    setTimeout(() => {
      ignoreBlur = false;
    }, 300);
    await showWindow();
  }
};
const createTray = () => {
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 });
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Clipboard", click: () => toggleWindow() },
    { label: "Quit", click: () => app.quit() }
  ]);
  tray.setToolTip("Clipboard Manager");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => toggleWindow());
};
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    console.log("[Main] Second instance detected. Toggling window.");
    toggleWindow();
  });
  app.whenReady().then(async () => {
    registerIpcHandlers();
    createTray();
    await createWindow();
    if (mainWindow) {
      startClipboardWatcher(mainWindow);
    }
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath
      });
    }
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") ;
});
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopClipboardWatcher();
});
