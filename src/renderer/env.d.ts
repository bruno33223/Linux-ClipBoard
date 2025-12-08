import { ClipboardItem, Settings } from '../../shared/types';

export interface ElectronAPI {
    getHistory: () => Promise<ClipboardItem[]>;
    deleteItem: (id: string) => Promise<void>;
    togglePin: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
    pasteItem: (id: string) => Promise<void>;
    getSettings: () => Promise<Settings>;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<Settings>;
    reorderItems: (activeId: string, overId: string) => Promise<void>;
    getAppPath: () => Promise<string>;
    hideWindow: () => Promise<void>;
    pasteContent: (content: string) => Promise<void>;
    onClipboardChanged: (callback: (history: ClipboardItem[]) => void) => () => void;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
