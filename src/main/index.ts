import { app, BrowserWindow, globalShortcut, screen, Tray, Menu, nativeImage, protocol, net } from 'electron';
import path from 'node:path';
import { startClipboardWatcher, stopClipboardWatcher } from './clipboard-watcher';
import { registerIpcHandlers } from './ipc-handlers';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getSettings, imagesDir } from './store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register scheme as privileged
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } }
]);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const iconPath = path.join(__dirname, '../public/icon.svg'); // Vite copies public to root dist/

let ignoreBlur = false;

const createWindow = async () => {
    const settings = await getSettings().catch(() => null);
    const zoom = settings?.zoom || 100;
    const baseWidth = 400;
    const baseHeight = 600;
    const width = Math.round(baseWidth * (zoom / 100));
    const height = Math.round(baseHeight * (zoom / 100));

    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        x: undefined,
        y: undefined,
        frame: false,
        resizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        transparent: true,
        skipTaskbar: true,
        type: 'dialog',
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Default hiding
    mainWindow.hide();

    // Serve development or production
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadURL('app://./index.html');
    }

    // REMOVED: Internal Global Shortcut
    // const ret = globalShortcut.register('Super+V', toggleWindow);
    // console.log('Global shortcut registration result:', ret);

    // if (!ret) {
    //     console.error('Registration failed.');
    // }

    // // Check if item is registered
    // console.log('Is Super+V registered?', globalShortcut.isRegistered('Super+V'));

    // Blur event to hide the window
    mainWindow.on('blur', () => {
        if (ignoreBlur) {
            console.log('[Window] Blur ignored (debounce).');
            return;
        }

        if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
            console.log('[Window] Blur event triggered. Hiding.');
            mainWindow.hide();
        }
    });
};

const toggleWindow = async () => {
    if (!mainWindow) return;

    const isVisible = mainWindow.isVisible();
    const isFocused = mainWindow.isFocused();
    console.log(`[Toggle] Triggered. Visible: ${isVisible}, Focused: ${isFocused}`);

    if (isVisible && isFocused) {
        console.log('[Toggle] Hiding window');
        mainWindow.hide();
    } else {
        console.log('[Toggle] Showing window');

        // Block blur events for a short time to prevent immediate hiding/focus loss issues
        ignoreBlur = true;
        setTimeout(() => { ignoreBlur = false; }, 300);

        const settings = await getSettings();

        // Ensure availability
        mainWindow.setAlwaysOnTop(true);
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

        // Update size
        if (settings && settings.zoom) {
            const baseWidth = 400;
            const baseHeight = 600;
            const width = Math.round(baseWidth * (settings.zoom / 100));
            const height = Math.round(baseHeight * (settings.zoom / 100));
            if (mainWindow.getBounds().width !== width || mainWindow.getBounds().height !== height) {
                mainWindow.setSize(width, height);
            }
        }


        if (settings && settings.position === 'cursor') {
            const { x, y } = screen.getCursorScreenPoint();
            const display = screen.getDisplayNearestPoint({ x, y });
            const winBounds = mainWindow.getBounds();

            let newX = x;
            let newY = y;

            // Keep in bounds
            if (newX + winBounds.width > display.bounds.x + display.bounds.width) {
                newX = display.bounds.x + display.bounds.width - winBounds.width;
            }
            if (newY + winBounds.height > display.bounds.y + display.bounds.height) {
                newY = display.bounds.y + display.bounds.height - winBounds.height;
            }

            mainWindow.setPosition(newX, newY);
        }

        if (!isVisible) {
            mainWindow.show();
        }
        mainWindow.focus();

        // Hack: Check if it actually became visible, if not, try force showing again
        setTimeout(() => {
            if (!mainWindow?.isVisible()) {
                console.log('[Toggle] Retry showing window...');
                mainWindow?.show();
                mainWindow?.focus();
            }
        }, 100);
    }
};

const createTray = () => {
    // In dev, icon is in public. In prod, it's in root of dist (one level up from dist-electron? No, dist/assets)
    // Let's rely on a reliable path or generate one.
    // Use an empty image if fail, or try to load vite.svg
    let iconPath = path.join(__dirname, '../renderer/vite.svg');
    if (app.isPackaged) {
        iconPath = path.join(process.resourcesPath, 'app.asar.unpacked/dist/vite.svg'); // This pathing is tricky in packed app
        // simpler: just usage text based tray if image fails?
        // nativeImage.createEmpty()
    }

    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Clipboard', click: () => toggleWindow() },
        { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setToolTip('Clipboard Manager');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => toggleWindow());
};


// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        console.log('[Main] Second instance detected. Toggling window.');
        toggleWindow();
    });

    // Create window when ready
    app.whenReady().then(async () => {
        registerIpcHandlers();
        createTray();
        await createWindow();

        // Auto-launch
        if (app.isPackaged) {
            app.setLoginItemSettings({
                openAtLogin: true,
                path: process.execPath,
            });
        }
    });
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Don't quit, keep running in tray
        // app.quit(); 
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopClipboardWatcher();
});
