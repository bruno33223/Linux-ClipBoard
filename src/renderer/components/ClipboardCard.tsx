import React from 'react';
import type { ClipboardItem } from '../../shared/types';
import { GripVertical, Pin, Trash2 } from 'lucide-react';
import { translations } from '../locales';

interface ClipboardCardProps {
    item: ClipboardItem;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onPin: (id: string, e: React.MouseEvent) => void;
    onClick: (item: ClipboardItem) => void;
    theme: 'light' | 'dark';
    t: typeof translations['en'];
}

export const ClipboardCard: React.FC<ClipboardCardProps> = ({ item, onDelete, onPin, onClick, theme, t }) => {
    const isLight = theme === 'light';

    return (
        <div
            className={`group relative flex items-center p-3 rounded-lg mb-2 transition-all cursor-pointer border
                ${isLight
                    ? 'bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400'
                    : 'bg-gray-800 border-transparent hover:bg-gray-700 hover:border-gray-600'
                }`}
            onClick={() => onClick(item)}
        >
            {/* Type Indicator / Icon */}
            <div className={`mr-3 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                <GripVertical size={16} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {item.type === 'text' ? (
                    <p className={`font-mono whitespace-pre-wrap break-words text-sm line-clamp-3 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                        {item.content}
                    </p>
                ) : (
                    <img
                        src={`app://clipboard-manager/images/${item.content}`}
                        alt="Clipboard Image"
                        className="max-h-48 w-full rounded object-contain bg-black/50"
                    />
                )}
                <div className={`text-xs mt-1 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                    {new Date(item.timestamp).toLocaleTimeString()}
                </div>
            </div>

            {/* Actions (Visible on Hover or if Pinned) */}
            <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    onClick={(e) => onPin(item.id, e)}
                    className={`rounded p-1 transition-colors ${item.isPinned
                        ? 'text-yellow-400 hover:bg-yellow-400/10'
                        : isLight ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600' : 'text-gray-500 hover:bg-white/10 hover:text-gray-300'
                        }`}
                    title={item.isPinned ? t.actions.unpin : t.actions.pin}
                >
                    <Pin size={14} className={item.isPinned ? "fill-current" : ""} />
                </button>
                <button
                    onClick={(e) => onDelete(item.id, e)}
                    className={`rounded p-1 transition-colors ${isLight ? 'text-gray-400 hover:bg-red-50 hover:text-red-500' : 'text-gray-500 hover:bg-red-500/20 hover:text-red-400'
                        }`}
                    title={t.actions.delete}
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};
