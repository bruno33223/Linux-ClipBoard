import { app, nativeImage } from 'electron';
import { JSONFilePreset } from 'lowdb/node';
import path from 'node:path';
import { ClipboardItem, Settings } from '../shared/types';
import fs from 'node:fs/promises';

type Data = {
    history: ClipboardItem[];
    settings: Settings;
};

const defaultData: Data = {
    history: [],
    settings: {
        position: 'cursor', // Default to cursor as per user request
        grouping: 'categorized',
        zoom: 100,
        theme: 'dark', // Assuming dark theme default
        language: null
    }
};

const dbPath = path.join(app.getPath('userData'), 'db.json');

// Mutex for DB writes
let isWriting = false;
const writeQueue: (() => Promise<void>)[] = [];

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

const safeUpdate = async (updater: (data: Data) => void) => {
    return new Promise<void>((resolve, reject) => {
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

// Initialize db
export const getDb = async () => {
    const db = await JSONFilePreset<Data>(dbPath, defaultData);
    // Migration: If settings is missing (from old DB), add it
    if (!db.data.settings) {
        db.data.settings = defaultData.settings;
        await db.write();
    }
    return db;
};

export const imagesDir = path.join(app.getPath('userData'), 'images');

// Ensure images dir exists
(async () => {
    try {
        await fs.mkdir(imagesDir, { recursive: true });
    } catch (e) {
        console.error('Failed to create images directory', e);
    }
})();

export const saveImage = async (image: Electron.NativeImage): Promise<string> => {
    const buffer = image.toPNG();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const filePath = path.join(imagesDir, filename);
    await fs.writeFile(filePath, buffer);
    return filename; // Return relative filename, or absolute path? Relative is safer for resizing/moving userData, but absolute is easier for loading.
    // Let's store absolute path for now, or handle 'imagesDir' joining in renderer (via app:// protocol).
    // Using filename is cleanest. Renderer can use `app://clipboard-manager/images/${filename}` maybe?
    // Wait, protocol handler points to `dist`. I need to handle `app://clipboard-manager/images/` to point to `userData/images`.
    return filename;
};

export const addClipboardItem = async (item: ClipboardItem) => {
    await safeUpdate(({ history }) => {
        // Deduplication logic: check if top item is identical
        if (history.length > 0 && history[0].content === item.content && history[0].type === item.type) {
            return;
        }
        history.unshift(item);
        // Limit history size? Let's say 100 items.
        if (history.length > 100) {
            // TODO: Implement cleanup for old items/images
        }
    });
};

export const getHistory = async () => {
    const db = await getDb();
    return db.data.history;
};

export const getSettings = async () => {
    const db = await getDb();
    return db.data.settings;
};

export const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    await safeUpdate(({ settings }) => {
        settings[key] = value;
    });
    const db = await getDb();
    return db.data.settings;
};

export const deleteItem = async (id: string) => {
    await safeUpdate(({ history }) => {
        const index = history.findIndex(i => i.id === id);
        if (index > -1) {
            // If image, delete file
            const item = history[index];
            if (item.type === 'image') {
                const filePath = path.join(imagesDir, item.content);
                fs.unlink(filePath).catch(err => console.error("Failed to delete image file", err));
            }
            history.splice(index, 1);
        }
    });
};

export const togglePin = async (id: string) => {
    await safeUpdate(({ history }) => {
        const item = history.find(i => i.id === id);
        if (item) {
            item.isPinned = !item.isPinned;
        }
    });
};

export const clearAll = async () => {
    await safeUpdate(({ history }) => {
        // Keep only pinned items
        const pinned = history.filter(i => i.isPinned);

        // Delete images of unpinned items
        history.forEach(item => {
            if (!item.isPinned && item.type === 'image') {
                const filePath = path.join(imagesDir, item.content);
                fs.unlink(filePath).catch(err => console.error("Failed to delete image file", err));
            }
        });

        history.length = 0;
        history.push(...pinned);
    });
};

export const reorderItems = async (activeId: string, overId: string) => {
    await safeUpdate(({ history }) => {
        const oldIndex = history.findIndex((item) => item.id === activeId);
        const newIndex = history.findIndex((item) => item.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
            const [movedItem] = history.splice(oldIndex, 1);
            history.splice(newIndex, 0, movedItem);
        }
    });
};
