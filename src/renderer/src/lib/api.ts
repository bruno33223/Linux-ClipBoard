import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ClipboardItem, Settings } from '../types';

export const api = {
    getHistory: () => invoke<ClipboardItem[]>('get_history'),
    deleteItem: (id: string) => invoke<ClipboardItem[]>('delete_item', { id }),
    togglePin: (id: string) => invoke<ClipboardItem[]>('toggle_pin', { id }),
    clearAll: () => invoke<ClipboardItem[]>('clear_all'),
    pasteItem: (id: string) => invoke<void>('paste_item', { id }),
    getSettings: () => invoke<Settings>('get_settings'),
    updateSetting: (key: string, value: any) => invoke<Settings>('update_setting', { key, value }),
    reorderItems: (activeId: string, overId: string) => invoke<ClipboardItem[]>('reorder_items', { active_id: activeId, over_id: overId }),
    hideWindow: () => invoke<void>('hide_window'),
    showWindow: () => invoke<void>('show_window'),
    startDragging: () => invoke<void>('start_dragging'),
    setZoom: (factor: number) => invoke<void>('set_zoom', { factor }),
    pasteContent: (content: string) => invoke<void>('paste_content', { content }),
    getAppPath: () => invoke<string>('get_app_path'),

    // Helper to get app path if needed, though backend handles image paths usually.
    // In Electron we had getAppPath. In Tauri maybe not needed or use path plugin.

    onClipboardChanged: (callback: (data: ClipboardItem[]) => void) => {
        let unlisten: UnlistenFn | undefined;
        const promise = listen<ClipboardItem[]>('clipboard-changed', (event) => {
            callback(event.payload);
        });
        promise.then(u => unlisten = u);

        return () => {
            if (unlisten) unlisten();
        };
    },

    onForceFocus: (callback: () => void) => {
        let unlisten: UnlistenFn | undefined;
        const promise = listen<void>('force-focus', () => {
            callback();
        });
        promise.then(u => unlisten = u);

        return () => {
            if (unlisten) unlisten();
        };
    }
};
