import type { Settings as SettingsType } from '../src/types';
import { X, Sun, Monitor, ZoomIn, Keyboard, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { translations } from '../locales';
import { api } from '../src/lib/api';

interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SettingsType;
    onUpdate: (key: keyof SettingsType, value: any) => void;
    t: typeof translations['en'];
}

export const Settings = ({ isOpen, onClose, settings, onUpdate, t }: SettingsProps) => {
    const [appPath, setAppPath] = useState<string>('...');

    useEffect(() => {
        api.getAppPath().then(setAppPath);
    }, []);

    if (!isOpen) return null;

    const isLight = settings.theme === 'light';
    const bgColor = isLight ? 'bg-white' : 'bg-[#1e1e1e]';
    const textColor = isLight ? 'text-gray-900' : 'text-white';
    const secondaryText = isLight ? 'text-gray-600' : 'text-white/70';
    const borderColor = isLight ? 'border-gray-200' : 'border-white/5';
    const inputBg = isLight ? 'bg-gray-100' : 'bg-black/20';
    const inactiveText = isLight ? 'text-gray-500 hover:text-gray-900' : 'text-white/50 hover:text-white';
    const closeBtnHover = isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10';
    const closeBtnIcon = isLight ? 'text-gray-500' : 'text-white/70';
    // Highlight if language is missing
    const isLangMissing = !settings.language;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`flex w-full max-w-sm flex-col rounded-xl border shadow-2xl max-h-[90vh] ${bgColor} ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
                <div className={`flex items-center justify-between border-b p-4 ${borderColor}`}>
                    <h2 className={`text-lg font-bold ${textColor}`}>{t.settings.title}</h2>
                    {!isLangMissing && (
                        <button onClick={onClose} className={`rounded-full p-1 ${closeBtnHover}`}>
                            <X size={20} className={closeBtnIcon} />
                        </button>
                    )}
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-4 scrollbar-hide">

                    {/* Language */}
                    <div className={`space-y-3 ${isLangMissing ? 'animate-pulse' : ''}`}>
                        <label className={`flex items-center gap-2 text-sm font-medium ${isLangMissing ? 'text-blue-500 font-bold' : secondaryText}`}>
                            <Globe size={16} /> {t.settings.language}
                        </label>
                        <div className={`flex rounded-lg p-1 ${inputBg} ${isLangMissing ? 'ring-2 ring-blue-500' : ''}`}>
                            <button
                                onClick={() => onUpdate('language', 'pt-BR')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.language === 'pt-BR'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : inactiveText
                                    }`}
                            >
                                Português
                            </button>
                            <button
                                onClick={() => onUpdate('language', 'en')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.language === 'en'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : inactiveText
                                    }`}
                            >
                                English
                            </button>
                        </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-3">
                        <label className={`flex items-center gap-2 text-sm font-medium ${secondaryText}`}>
                            <Monitor size={16} /> {t.settings.windowPosition}
                        </label>
                        <div className={`flex rounded-lg p-1 ${inputBg}`}>
                            <button
                                onClick={() => onUpdate('position', 'fixed')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.position === 'fixed'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : inactiveText
                                    }`}
                            >
                                {t.settings.positionFixed}
                            </button>
                            <button
                                onClick={() => onUpdate('position', 'cursor')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.position === 'cursor'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : inactiveText
                                    }`}
                            >
                                {t.settings.positionMouse}
                            </button>
                        </div>
                    </div>


                    {/* Zoom */}
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <label className={`flex items-center gap-2 text-sm font-medium ${secondaryText}`}>
                                <ZoomIn size={16} /> {t.settings.zoom}
                            </label>
                            <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>{settings.zoom}%</span>
                        </div>
                        <input
                            type="range"
                            min="70"
                            max="200"
                            step="10"
                            value={settings.zoom}
                            onChange={(e) => onUpdate('zoom', Number(e.target.value))}
                            className={`h-2 w-full cursor-pointer appearance-none rounded-lg accent-blue-600 ${inputBg}`}
                        />
                    </div>

                    {/* Shortcuts */}
                    <div className="space-y-3">
                        <label className={`flex items-center gap-2 text-sm font-medium ${secondaryText}`}>
                            <Keyboard size={16} /> {t.settings.shortcuts}
                        </label>
                        <div className={`rounded-lg p-3 text-sm ${inputBg} ${isLight ? 'text-gray-700' : 'text-white/80'}`}>
                            <p className={`mb-2 text-xs ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
                                {t.settings.shortcutsDesc}
                            </p>
                            <ol className={`list-decimal space-y-1 pl-4 text-xs ${isLight ? 'text-gray-600' : 'text-white/60'}`}>
                                {t.settings.shortcutsSteps.map((step, i) => (
                                    <li key={i} dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                ))}
                            </ol>
                            <div className={`mt-2 flex items-center gap-2 rounded p-2 font-mono text-xs text-blue-300 ${isLight ? 'bg-white border border-gray-200 text-blue-600' : 'bg-black/30'}`}>
                                <span className="flex-1 truncate select-all">{appPath}</span>
                                <button
                                    className={`${isLight ? 'text-gray-400 hover:text-gray-600' : 'text-white/30 hover:text-white'}`}
                                    onClick={() => navigator.clipboard.writeText(appPath)}
                                    title={t.settings.copyCommand}
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Theme */}
                    <div className="space-y-3">
                        <label className={`flex items-center gap-2 text-sm font-medium ${secondaryText}`}>
                            <Sun size={16} /> {t.settings.theme}
                        </label>
                        <div className={`flex rounded-lg p-1 ${inputBg}`}>
                            <button
                                onClick={() => onUpdate('theme', 'dark')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.theme === 'dark'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : inactiveText
                                    }`}
                            >
                                {t.settings.themeDark}
                            </button>
                            <button
                                onClick={() => onUpdate('theme', 'light')}
                                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all ${settings.theme === 'light'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : inactiveText
                                    }`}
                            >
                                {t.settings.themeLight}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`border-t p-4 text-center text-xs ${borderColor} ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
                    {t.settings.closeHint}
                </div>
            </div>
        </div>
    );
};
