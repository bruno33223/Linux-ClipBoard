import { clipboard, nativeImage } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { addClipboardItem, getHistory, saveImage } from './store';
import { IPC_CHANNELS } from '../shared/types';
import { BrowserWindow } from 'electron';

let intervalId: NodeJS.Timeout | null = null;
let lastText = '';
let lastImageDataUrl = '';

export const startClipboardWatcher = (win: BrowserWindow) => {
    if (intervalId) return;

    lastText = clipboard.readText();
    const img = clipboard.readImage();
    lastImageDataUrl = img.isEmpty() ? '' : img.toDataURL();

    intervalId = setInterval(async () => {
        const text = clipboard.readText();
        const image = clipboard.readImage();
        const imageDataUrl = image.isEmpty() ? '' : image.toDataURL();

        if (text && text !== lastText) {
            lastText = text;
            const newItem = {
                id: uuidv4(),
                type: 'text' as const,
                content: text,
                timestamp: Date.now(),
                isPinned: false,
            };
            await addClipboardItem(newItem);
            const history = await getHistory();
            if (!win.isDestroyed()) {
                win.webContents.send(IPC_CHANNELS.CLIPBOARD_CHANGED, history);
            }
        } else if (!image.isEmpty() && imageDataUrl !== lastImageDataUrl) {
            lastImageDataUrl = imageDataUrl;
            // Also update lastText to avoid duplicate if image copy also has text (e.g. browser copy image)
            // Actually, if it has both, we might want both or prefer one.
            // Let's treat them as separate events or give preference.
            // If we copy an image in browser, usually we get image.

            // Save image to disk
            const filename = await saveImage(image);

            const newItem = {
                id: uuidv4(),
                type: 'image' as const,
                content: filename, // Store filename/path
                timestamp: Date.now(),
                isPinned: false,
            };

            await addClipboardItem(newItem);
            const history = await getHistory();
            if (!win.isDestroyed()) {
                win.webContents.send(IPC_CHANNELS.CLIPBOARD_CHANGED, history);
            }
        }
    }, 1000);
};

export const stopClipboardWatcher = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
};
