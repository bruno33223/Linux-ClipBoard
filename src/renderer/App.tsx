import { useState, useEffect, useMemo } from 'react';
import type { ClipboardItem, Settings as SettingsType } from '../shared/types';
import { ClipboardCard } from './components/ClipboardCard';
import { Settings } from './components/Settings';
import { Search, Trash2, Layout, Settings as SettingsIcon, Image as ImageIcon, Type, Grid } from 'lucide-react';
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

function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState<SettingsType>({
    position: 'cursor',
    grouping: 'combined',
    zoom: 100,
    theme: 'dark'
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'text' | 'image'>('all');

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
      setIsSettingsOpen(false);
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const loadInitialData = async () => {
    const [data, currentSettings] = await Promise.all([
      window.electron.getHistory(),
      window.electron.getSettings()
    ]);
    setHistory(data);
    if (currentSettings) setSettings(currentSettings);
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
    if (settings.grouping === 'categorized' && activeTab !== 'all') {
      data = data.filter(item => item.type === activeTab);
    }
    return data;
  }, [history, searchQuery, settings.grouping, activeTab]);

  return (
    <div
      className={`flex h-screen flex-col overflow-hidden text-white transition-colors
             ${settings.theme === 'light' ? 'bg-gray-100 text-gray-900' : 'bg-[#0f0f0f]'}
            `}
    >
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdate={updateSetting}
      />

      {/* Header */}
      <div className={`draggable flex items-center justify-between border-b p-3
                ${settings.theme === 'light' ? 'border-gray-200 bg-white' : 'border-white/5 bg-[#1e1e1e]'}`}>
        <div className="flex items-center gap-2">
          <Layout className={settings.theme === 'light' ? 'text-blue-600' : 'text-blue-400'} size={18} />
          <span className="font-semibold text-sm">Clipboard Manager</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className={`rounded-full p-1.5 transition-colors ${settings.theme === 'light' ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-gray-400'}`}
            title="Settings"
          >
            <SettingsIcon size={14} />
          </button>
          <button
            onClick={handleClearAll}
            className={`rounded-full p-1.5 transition-colors ${settings.theme === 'light' ? 'hover:bg-red-100 text-red-500' : 'hover:bg-red-500/20 text-red-400'}`}
            title="Clear All"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className={`p-3 space-y-3 ${settings.theme === 'light' ? 'bg-gray-50' : 'bg-[#0f0f0f]'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-lg border py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                            ${settings.theme === 'light'
                ? 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
                : 'border-white/10 bg-[#1e1e1e] text-white placeholder-gray-600'
              }`}
          />
        </div>

        {settings.grouping === 'categorized' && (
          <div className="flex rounded-lg bg-black/10 p-1">
            {[
              { id: 'all', label: 'All', icon: Grid },
              { id: 'text', label: 'Text', icon: Type },
              { id: 'image', label: 'Images', icon: ImageIcon },
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

      {/* List */}
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
                  />
                </SortableItem>
              ))}
              {filteredHistory.length === 0 && (
                <div className="flex h-32 flex-col items-center justify-center text-gray-500">
                  <p className="text-sm">No items found</p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Footer */}
      <div className={`border-t py-2 text-center text-[10px] ${settings.theme === 'light' ? 'border-gray-200 text-gray-400' : 'border-white/5 text-white/20'}`}>
        powered by: Bruno33223
      </div>
    </div>
  );
}

export default App;
