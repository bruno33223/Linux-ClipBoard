import { ipcMain, clipboard, nativeImage, app, BrowserWindow } from 'electron';
import { IPC_CHANNELS, Settings } from '../shared/types';
import { getHistory, deleteItem, togglePin, clearAll, getDb, getSettings, updateSetting, imagesDir, reorderItems } from './store';
import { exec } from 'node:child_process';
import path from 'node:path';

export const registerIpcHandlers = () => {
    ipcMain.handle(IPC_CHANNELS.GET_HISTORY, async () => {
        return await getHistory();
    });

    ipcMain.handle(IPC_CHANNELS.DELETE_ITEM, async (_, id: string) => {
        await deleteItem(id);
        return await getHistory();
    });

    ipcMain.handle(IPC_CHANNELS.TOGGLE_PIN, async (_, id: string) => {
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

    ipcMain.handle(IPC_CHANNELS.UPDATE_SETTING, async (event, key: keyof Settings, value: any) => {
        const result = await updateSetting(key, value);

        if (key === 'zoom') {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (win) {
                const zoom = Number(value); // Ensure number
                const baseWidth = 400;
                const baseHeight = 600;
                const width = Math.round(baseWidth * (zoom / 100));
                const height = Math.round(baseHeight * (zoom / 100));

                // Apply zoom to webContents
                win.webContents.setZoomFactor(zoom / 100);

                // On Linux, setSize won't shrink the window if it's not resizable.
                // We need to temporarily enable resizing.
                win.setResizable(true);
                win.setSize(width, height);
                // Debounce the disable to ensure WM has time to process the resize
                setTimeout(() => {
                    win.setResizable(false);
                }, 100);
            }
        }

        return result;
    });

    ipcMain.handle(IPC_CHANNELS.REORDER_ITEMS, async (_, activeId: string, overId: string) => {
        return await reorderItems(activeId, overId);
    });

    ipcMain.handle(IPC_CHANNELS.HIDE_WINDOW, (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.minimize();
    });

    ipcMain.handle('get-app-path', () => {
        if (app.isPackaged) {
            return process.execPath;
        }
        return `${process.execPath} ${app.getAppPath()}`;
    });

    ipcMain.handle(IPC_CHANNELS.PASTE_ITEM, async (event, id: string) => {
        console.log(`[IPC] PASTE_ITEM called for id: ${id}`);
        const history = await getHistory();
        const item = history.find(i => i.id === id);

        if (!item) {
            console.log('[IPC] Item not found for paste');
            return;
        }

        // Hide window FIRST to return focus to previous app
        // Hide window FIRST to return focus to previous app
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.minimize();

        // Small delay to ensure focus has switched
        setTimeout(() => {
            if (item.type === 'text') {
                clipboard.writeText(item.content);
                // Focus click? No, bad idea. Removed because it moves cursor to mouse position.
                exec('xdotool key --clearmodifiers ctrl+v', (error) => {
                    if (error) console.error('Failed to paste:', error);
                });
            } else if (item.type === 'image') {
                try {
                    const imagePath = path.join(imagesDir, item.content);
                    const image = nativeImage.createFromPath(imagePath);
                    clipboard.writeImage(image);
                    exec('xdotool key --clearmodifiers ctrl+v', (error) => {
                        if (error) console.error('Failed to paste image:', error);
                    });
                } catch (e) {
                    console.error("Failed to write image to clipboard", e);
                }
            }
        }, 500); // Increased to 500ms for testing
    });
};
