export interface ClipboardItem {
    id: string;
    type: 'text' | 'image' | 'html';
    content: string; // Plain text or Path to image file
    timestamp: number;
    isPinned: boolean;
    metadata?: {
        appSource?: string;
        imagePreview?: string; // Base64 thumbnail if needed
    };
}

// IPC Channel Names
export const IPC_CHANNELS = {
    GET_HISTORY: 'get-history',
    DELETE_ITEM: 'delete-item',
    TOGGLE_PIN: 'toggle-pin',
    CLEAR_ALL: 'clear-all',
    PASTE_ITEM: 'paste-item',
    GET_SETTINGS: 'get-settings',
    UPDATE_SETTING: 'update-setting',
    REORDER_ITEMS: 'reorder-items',
    CLIPBOARD_CHANGED: 'clipboard-changed',
    HIDE_WINDOW: 'hide-window'
} as const;

export interface Settings {
    position: 'fixed' | 'cursor';
    grouping: 'combined' | 'categorized';
    zoom: number; // 50-200
    theme: 'light' | 'dark';
}

