import type { Settings as SettingsType } from '../../shared/types';
import { X, Sun, Monitor, Layers, ZoomIn, Keyboard } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SettingsType;
    onUpdate: (key: keyof SettingsType, value: any) => void;
}

export const Settings = ({ isOpen, onClose, settings, onUpdate }: SettingsProps) => {
    const [appPath, setAppPath] = useState<string>('...');

    useEffect(() => {
        window.electron.getAppPath().then(setAppPath);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="flex w-full max-w-sm flex-col rounded-xl border border-white/10 bg-[#1e1e1e] shadow-2xl max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-white/5 p-4">
                    <h2 className="text-lg font-bold text-white">Configurações</h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10">
                        <X size={20} className="text-white/70" />
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-4 scrollbar-hide">
                    {/* Position */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                            <Monitor size={16} /> Posição da Janela
                        </label>
                        <div className="flex rounded-lg bg-black/20 p-1">
                            <button
                                onClick={() => onUpdate('position', 'fixed')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.position === 'fixed'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Fixa
                            </button>
                            <button
                                onClick={() => onUpdate('position', 'cursor')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.position === 'cursor'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Mouse
                            </button>
                        </div>
                    </div>

                    {/* Grouping */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                            <Layers size={16} /> Organização das Abas
                        </label>
                        <div className="flex rounded-lg bg-black/20 p-1">
                            <button
                                onClick={() => onUpdate('grouping', 'combined')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.grouping === 'combined'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Tudo Junto
                            </button>
                            <button
                                onClick={() => onUpdate('grouping', 'categorized')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.grouping === 'categorized'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Categorias
                            </button>
                        </div>
                    </div>

                    {/* Zoom */}
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                                <ZoomIn size={16} /> Tamanho (Zoom)
                            </label>
                            <span className="text-xs text-white/50">{settings.zoom}%</span>
                        </div>
                        <input
                            type="range"
                            min="50"
                            max="200"
                            step="10"
                            value={settings.zoom}
                            onChange={(e) => onUpdate('zoom', Number(e.target.value))}
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-black/20 accent-blue-600"
                        />
                    </div>

                    {/* Shortcuts */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                            <Keyboard size={16} /> Atalho de Teclado
                        </label>
                        <div className="rounded-lg bg-black/20 p-3 text-sm text-white/80">
                            <p className="mb-2 text-xs text-white/50">
                                Para abrir o app com uma tecla (ex: Super+V), crie um atalho no seu sistema Linux:
                            </p>
                            <ol className="list-decimal space-y-1 pl-4 text-xs text-white/60">
                                <li>Vá em <strong>Configurações &gt; Teclado &gt; Atalhos</strong></li>
                                <li>Adicione um atalho personalizado</li>
                                <li>Nome: <strong>Clipboard</strong></li>
                                <li>Comando:</li>
                            </ol>
                            <div className="mt-2 flex items-center gap-2 rounded bg-black/30 p-2 font-mono text-xs text-blue-300">
                                <span className="flex-1 truncate select-all">{appPath}</span>
                                <button
                                    className="text-white/30 hover:text-white"
                                    onClick={() => navigator.clipboard.writeText(appPath)}
                                    title="Copiar comando"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Theme */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-white/70">
                            <Sun size={16} /> Tema
                        </label>
                        <div className="flex rounded-lg bg-black/20 p-1">
                            <button
                                onClick={() => onUpdate('theme', 'dark')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.theme === 'dark'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Escuro
                            </button>
                            <button
                                onClick={() => onUpdate('theme', 'light')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.theme === 'light'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                Claro
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/5 p-4 text-center text-xs text-white/30">
                    Feche para salvar e aplicar.
                </div>
            </div>
        </div>
    );
};
