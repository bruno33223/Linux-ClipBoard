import { useState, useEffect, useMemo, useRef } from 'react';
import type { ClipboardItem, Settings as SettingsType } from './src/types';
import { ClipboardCard } from './components/ClipboardCard';
import { Settings } from './components/Settings';
import { Search, Trash2, Layout, Settings as SettingsIcon, Image as ImageIcon, Type, Grid, Smile, Sigma, Clipboard } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './components/SortableItem';
import { translations } from './locales';
import { EmojiPicker } from './components/EmojiPicker';
import { SymbolPicker } from './components/SymbolPicker';
import { api } from './src/lib/api';

function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<SettingsType>({
    position: 'cursor',
    grouping: 'categorized',
    zoom: 100,
    theme: 'dark',
    language: null,
    useInternalShortcut: false
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'text' | 'image'>('all');
  const [viewMode, setViewMode] = useState<'clipboard' | 'emojis' | 'symbols'>('clipboard');

  const inputRef = useRef<HTMLInputElement>(null);

  // Translations helper
  const t = translations[(settings.language as keyof typeof translations) || 'en'];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadInitialData();
    const unsubscribe = api.onClipboardChanged((data) => {
      setHistory(data);
    });

    const unsubscribeFocus = api.onForceFocus(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeFocus();
    };
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      // If we are forcing language selection, don't close
      if (!settings.language) return;

      // If settings are open, just close settings? Or close everything?
      // User request: "disappear (minimize) when clicking outside"
      // Usually this means hiding the app.
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else {
        api.hideWindow();
      }
    };

    // Add logic to grab focus when window is focused
    const handleFocus = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!settings.language) return;
        api.hideWindow();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!settings.language) return;
      e.preventDefault();
      api.hideWindow();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [settings.language]);

  const loadInitialData = async () => {
    const [data, currentSettings] = await Promise.all([
      api.getHistory(),
      api.getSettings()
    ]);
    setHistory(data);
    if (currentSettings) {
      setSettings(currentSettings);
      if (!currentSettings.language) {
        setIsSettingsOpen(true);
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteItem(id);
    const newHistory = await api.getHistory();
    setHistory(newHistory);
  };

  const handlePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.map(item =>
      item.id === id ? { ...item, isPinned: !item.isPinned } : item
    ));
    await api.togglePin(id);
    const newHistory = await api.getHistory();
    setHistory(newHistory);
  };

  const handleClearAll = async () => {
    await api.clearAll();
    const newHistory = await api.getHistory();
    setHistory(newHistory);
  };

  const handlePaste = async (id: string) => {
    await api.pasteItem(id);
  };

  const handleCopyAndPaste = async (content: string) => {
    await api.pasteContent(content);
  }

  const updateSetting = async (key: keyof SettingsType, value: any) => {
    const newSettings = await api.updateSetting(key, value);
    setSettings(newSettings);
    if (key === 'zoom') {
      const zoomValue = typeof value === 'number' ? value / 100 : 1.0;
      await api.setZoom(zoomValue);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && over?.id) {
      setHistory((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      await api.reorderItems(active.id as string, over.id as string);
    }
  };

  const filteredHistory = useMemo(() => {
    let data = history;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(item =>
        item.content.toLowerCase().includes(lowerQuery) ||
        (item.type === 'image' && 'image'.includes(lowerQuery))
      );
    }
    if (activeTab !== 'all') {
      data = data.filter(item => item.type === activeTab);
    }
    return data;
  }, [history, searchQuery, activeTab]);

  return (
    <div
      className={`flex h-screen flex-col overflow-hidden text-white transition-colors
             ${settings.theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-[#0f0f0f]'}
            `}
      style={{
        // transform: `scale(${settings.zoom / 100})`, // Transform can cause layout issues with fixed width/height
        // transformOrigin: 'top left',
        // zoom: settings.zoom / 100
      }}
    >
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => {
          if (settings.language) setIsSettingsOpen(false);
        }}
        settings={settings}
        onUpdate={(k, v) => { updateSetting(k, v); }}
        t={t}
      />

      {/* Header */}
      <div
        onMouseDown={() => api.startDragging()}
        className={`draggable flex items-center justify-between border-b p-3 select-none cursor-default
                ${settings.theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#1e1e1e]'}`}>
        <div data-tauri-drag-region className="flex items-center gap-2 pointer-events-none">
          <Layout className={settings.theme === 'light' ? 'text-blue-600' : 'text-blue-400'} size={18} />
          <span className="font-semibold text-sm">{t.appTitle}</span>
        </div>
        <div className="flex gap-2">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setIsSettingsOpen(true)}
            className={`rounded-full p-1.5 transition-colors ${settings.theme === 'light' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400'}`}
            title={t.actions.settings}
          >
            <SettingsIcon size={14} />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClearAll}
            className={`rounded-full p-1.5 transition-colors ${settings.theme === 'light' ? 'hover:bg-red-100 text-red-500' : 'hover:bg-red-500/20 text-red-400'}`}
            title={t.actions.clearAll}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Type Navigator */}
      <div className={`flex items-center justify-around border-b ${settings.theme === 'light' ? 'border-gray-200 bg-gray-50' : 'border-white/5 bg-[#0f0f0f]'}`}>
        <button
          onClick={() => setViewMode('clipboard')}
          className={`flex flex-1 flex-col items-center py-2 text-[10px] font-medium transition-colors border-b-2 
            ${viewMode === 'clipboard'
              ? (settings.theme === 'light' ? 'border-blue-600 text-blue-600' : 'border-blue-500 text-blue-400')
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
        >
          <Clipboard size={18} className="mb-1" />
          {t.typeNav.clipboard}
        </button>
        <button
          onClick={() => setViewMode('emojis')}
          className={`flex flex-1 flex-col items-center py-2 text-[10px] font-medium transition-colors border-b-2 
            ${viewMode === 'emojis'
              ? (settings.theme === 'light' ? 'border-blue-600 text-blue-600' : 'border-blue-500 text-blue-400')
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
        >
          <Smile size={18} className="mb-1" />
          {t.typeNav.emojis}
        </button>
        <button
          onClick={() => setViewMode('symbols')}
          className={`flex flex-1 flex-col items-center py-2 text-[10px] font-medium transition-colors border-b-2 
            ${viewMode === 'symbols'
              ? (settings.theme === 'light' ? 'border-blue-600 text-blue-600' : 'border-blue-500 text-blue-400')
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
        >
          <Sigma size={18} className="mb-1" />
          {t.typeNav.symbols}
        </button>
      </div>

      {/* Search & Tabs logic */}
      <div className={`p-3 space-y-3 ${settings.theme === 'light' ? 'bg-gray-50' : 'bg-[#0f0f0f]'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            ref={inputRef}
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-lg border py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                            ${settings.theme === 'light'
                ? 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
                : 'border-white/10 bg-[#1e1e1e] text-white placeholder-gray-600'
              }`}
          />
        </div>

        {viewMode === 'clipboard' && (
          <div className="flex rounded-lg bg-black/10 p-1">
            {[
              { id: 'all', label: t.tabs.all, icon: Grid },
              { id: 'text', label: t.tabs.text, icon: Type },
              { id: 'image', label: t.tabs.image, icon: ImageIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all ${activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'
                  }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'clipboard' && (
        <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredHistory.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {filteredHistory.map((item) => (
                  <SortableItem key={item.id} id={item.id}>
                    <ClipboardCard
                      key={item.id}
                      item={item}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      onClick={() => handlePaste(item.id)}
                      theme={settings.theme}
                      t={t}
                    />
                  </SortableItem>
                ))}
                {filteredHistory.length === 0 && (
                  <div className="flex h-32 flex-col items-center justify-center text-gray-500">
                    <p className="text-sm">{t.noItems}</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {viewMode === 'emojis' && (
        <EmojiPicker onSelect={handleCopyAndPaste} theme={settings.theme} searchQuery={searchQuery} t={t} />
      )}

      {viewMode === 'symbols' && (
        <SymbolPicker onSelect={handleCopyAndPaste} theme={settings.theme} t={t} />
      )}

      {/* Footer */}
      <div className={`border-t py-2 text-center text-[10px] ${settings.theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-white/5 text-white/20'}`}>
        {t.footer}
      </div>
    </div>
  );
}

export default App;
