import { useState, useEffect, useMemo } from 'react';
import type { ClipboardItem, Settings as SettingsType } from '../shared/types';
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

function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<SettingsType>({
    position: 'cursor',
    grouping: 'categorized',
    zoom: 100,
    theme: 'dark',
    language: null
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'text' | 'image'>('all');
  const [viewMode, setViewMode] = useState<'clipboard' | 'emojis' | 'symbols'>('clipboard');

  // Translations helper
  const t = translations[settings.language || 'en']; // Default to EN for display if null, but force settings open

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
    const unsubscribe = window.electron.onClipboardChanged((data) => {
      setHistory(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      // Don't close if we are forcing language selection
      if (!settings.language) return;
      setIsSettingsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!settings.language) return;
        window.electron.hideWindow();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (!settings.language) return;
      e.preventDefault();
      window.electron.hideWindow();
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [settings.language]); // Re-bind when language changes (to enable/disable closing)

  const loadInitialData = async () => {
    const [data, currentSettings] = await Promise.all([
      window.electron.getHistory(),
      window.electron.getSettings()
    ]);
    setHistory(data);
    if (currentSettings) {
      setSettings(currentSettings);
      // Force settings open if no language set
      if (!currentSettings.language) {
        setIsSettingsOpen(true);
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.electron.deleteItem(id);
    const newHistory = await window.electron.getHistory();
    setHistory(newHistory);
  };

  const handlePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic update
    setHistory(prev => prev.map(item =>
      item.id === id ? { ...item, isPinned: !item.isPinned } : item
    ));
    await window.electron.togglePin(id);
    // Sync with backend to be sure
    const newHistory = await window.electron.getHistory();
    setHistory(newHistory);
  };

  const handleClearAll = async () => {
    await window.electron.clearAll();
    const newHistory = await window.electron.getHistory();
    setHistory(newHistory);
  };

  const handlePaste = async (id: string) => {
    await window.electron.pasteItem(id);
  };

  // For emojis and symbols - we technically need to add them to history or just copy them.
  // Ideally, 'pasteItem' is for existing history items.
  // We can create a temporary item or use IPC to just write to clipboard and paste.
  // For simplicity: We will insert into history as a new item and then paste that.
  // OR better: use navigator.clipboard.writeText then hide + simulate paste if possible. 
  // BUT app is transparent/unfocused? No, we are focused.
  // Let's rely on the main process 'pasteItem' if we add it to history first?
  // Actually, let's just use navigator.clipboard to write, then hide. The user can paste manually? 
  // User expects "paste".
  // Let's create a new 'ad-hoc' copy-paste flow or just reusing `addClipboardItem` from main?
  // Easiest: Copy to clipboard -> App detects change -> Adds to history -> User pastes.
  // But we want to auto-paste. 
  // Let's assume we copy to clipboard, and then tell main process to "hide and paste".
  // But "hide and paste" in main relies on an ID.
  // Let's manually invoke the "hide window" and let user paste? Or can we trigger paste?
  // Let's try: Write to clipboard -> Wait for "clipboard-changed" (optional) -> Hide.
  // The user asked "add a navigator...".
  // Let's just write to clipboard and hide window. The user can Ctrl+V.
  // Wait, if I click an emoji, I expect it to appear in my document.
  // I should probably implement a "copyAndPaste" IPC or similar.
  // For now: I will write to clipboard and hide.
  const handleCopyAndPaste = async (content: string) => {
    await window.electron.pasteContent(content);
  }

  const updateSetting = async (key: keyof SettingsType, value: any) => {
    const newSettings = await window.electron.updateSetting(key, value);
    setSettings(newSettings);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && over?.id) {
      setHistory((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      await window.electron.reorderItems(active.id as string, over.id as string);
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
    >
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => {
          if (settings.language) setIsSettingsOpen(false);
        }}
        settings={settings}
        onUpdate={updateSetting}
        t={t}
      />

      {/* Header */}
      <div className={`draggable flex items-center justify-between border-b p-3
                ${settings.theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#1e1e1e]'}`}>
        <div className="flex items-center gap-2">
          <Layout className={settings.theme === 'light' ? 'text-blue-600' : 'text-blue-400'} size={18} />
          <span className="font-semibold text-sm">{t.appTitle}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`rounded-full p-1.5 transition-colors ${settings.theme === 'light' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400'}`}
            title={t.actions.settings}
          >
            <SettingsIcon size={14} />
          </button>
          <button
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

      {/* Search & Tabs logic - Repositioned: Search is global now, Tabs only for clipboard */}
      <div className={`p-3 space-y-3 ${settings.theme === 'light' ? 'bg-gray-50' : 'bg-[#0f0f0f]'}`}>
        {/* Global Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
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

        {/* Conditional Tabs (Only for Clipboard) */}
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
