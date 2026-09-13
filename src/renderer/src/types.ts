export interface ClipboardItem {
    id: string;
    type: 'text' | 'image';
    content: string;
    thumbnail?: string;
    timestamp: number;
    isPinned: boolean;
}

export interface Settings {
    position: 'cursor' | 'fixed';
    grouping: 'categorized' | 'none';
    zoom: number;
    theme: 'dark' | 'light';
    language: string | null;
    useInternalShortcut: boolean;
}
