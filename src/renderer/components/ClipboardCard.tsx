import React from 'react';
import type { ClipboardItem } from 'src/shared/types'; // We need to fix relative path resolution or copy types
import { Trash2, Pin, GripVertical } from 'lucide-react';

interface ClipboardCardProps {
    item: ClipboardItem;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onPin: (id: string, e: React.MouseEvent) => void;
    onClick: (item: ClipboardItem) => void;
    theme: 'light' | 'dark';
}

export const ClipboardCard: React.FC<ClipboardCardProps> = ({ item, onDelete, onPin, onClick, theme }) => {
    return (
        <div
            className="group relative flex items-center p-3 bg-gray-800 hover:bg-gray-700 rounded-lg mb-2 transition-colors cursor-pointer border border-transparent hover:border-gray-600"
            onClick={() => onClick(item)}
        >
            {/* Type Indicator / Icon */}
            <div className="mr-3 text-gray-400">
                <GripVertical size={16} />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {item.type === 'text' ? (
                    <p className="font-mono whitespace-pre-wrap break-words text-sm text-gray-200 line-clamp-3">
                        {item.content}
                    </p>
                ) : (
                    <img
                        src={`app://clipboard-manager/images/${item.content}`}
                        alt="Clipboard Image"
                        className="max-h-48 w-full rounded object-contain bg-black/50"
                    />
                )}
                <div className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                </div>
            </div>

            {/* Actions (Visible on Hover or if Pinned) */}
            <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                    onClick={(e) => onPin(item.id, e)}
                    className={`rounded p-1 transition-colors ${item.isPinned
                        ? 'text-yellow-400 hover:bg-yellow-400/10'
                        : theme === 'light' ? 'text-gray-400 hover:bg-gray-200 hover:text-gray-600' : 'text-gray-500 hover:bg-white/10 hover:text-gray-300'
                        }`}
                    title={item.isPinned ? "Unpin" : "Pin"}
                >
                    <Pin size={14} className={item.isPinned ? "fill-current" : ""} />
                </button>
                <button
                    onClick={(e) => onDelete(item.id, e)}
                    className={`rounded p-1 transition-colors ${theme === 'light' ? 'text-gray-400 hover:bg-red-100 hover:text-red-500' : 'text-gray-500 hover:bg-red-500/20 hover:text-red-400'
                        }`}
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};
