import { contextBridge, ipcRenderer } from 'electron';
import { ClipboardItem, IPC_CHANNELS } from '../shared/types';

contextBridge.exposeInMainWorld('electron', {
    getHistory: () => ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY),
    deleteItem: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_ITEM, id),
    togglePin: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_PIN, id),
    clearAll: () => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_ALL),
    pasteItem: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PASTE_ITEM, id),
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
    updateSetting: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTING, key, value),
    reorderItems: (activeId: string, overId: string) => ipcRenderer.invoke(IPC_CHANNELS.REORDER_ITEMS, activeId, overId),
    hideWindow: () => ipcRenderer.invoke(IPC_CHANNELS.HIDE_WINDOW),
    getAppPath: () => ipcRenderer.invoke('get-app-path'),
    onClipboardChanged: (callback: (data: ClipboardItem[]) => void) => {
        const subscription = (_: unknown, data: ClipboardItem[]) => callback(data);
        ipcRenderer.on(IPC_CHANNELS.CLIPBOARD_CHANGED, subscription);
        return () => {
            ipcRenderer.removeListener(IPC_CHANNELS.CLIPBOARD_CHANGED, subscription);
        };
    }
});
