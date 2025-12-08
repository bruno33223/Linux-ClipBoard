import { translations } from '../locales';

interface SymbolPickerProps {
    onSelect: (symbol: string) => void;
    theme: 'light' | 'dark';
    t: typeof translations['en'];
}

const SYMBOL_CATEGORIES = [
    {
        id: 'math',
        symbols: ['+', '-', '×', '÷', '=', '≠', '≈', '>', '<', '≥', '≤', '±', '∞', '√', '∑', '∫', 'π', 'µ', '∆', 'Ω', '°', '%', '‰']
    },
    {
        id: 'currency',
        symbols: ['$', '€', '£', '¥', '¢', '₽', '₹', '₩', '₺', '₱', '฿', '₫', '₿', 'Ξ']
    },
    {
        id: 'arrows',
        symbols: ['←', '↑', '→', '↓', '↔', '↕', '↖', '↗', '↘', '↙', '↩', '↪', '⇒', '⇔', '➔', '▲', '▼', '◄', '►']
    },
    {
        id: 'punctuation',
        symbols: ['•', '—', '–', '…', '«', '»', '“', '”', '‘', '’', '§', '¶', '©', '®', '™', '@', '&', '|', '\\', '/', '[', ']', '{', '}']
    },
    {
        id: 'shapes',
        symbols: ['★', '☆', '✦', '✧', '●', '○', '■', '□', '▲', '△', '▼', '▽', '◆', '◇', '♠', '♣', '♥', '♦']
    }
];

export const SymbolPicker = ({ onSelect, theme, t }: SymbolPickerProps) => {
    const isLight = theme === 'light';
    const bgHover = isLight ? 'hover:bg-gray-200' : 'hover:bg-white/10';
    const textColor = isLight ? 'text-gray-800' : 'text-gray-200';

    return (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="space-y-6">
                {SYMBOL_CATEGORIES.map((category) => (
                    <div key={category.id}>
                        <h3 className={`mb-2 text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t.symbolCategories[category.id as keyof typeof t.symbolCategories]}
                        </h3>
                        <div className="grid grid-cols-8 gap-1">
                            {category.symbols.map((symbol, index) => (
                                <button
                                    key={index}
                                    onClick={() => onSelect(symbol)}
                                    className={`aspect-square rounded flex items-center justify-center text-lg font-mono transition-colors ${bgHover} ${textColor}`}
                                    title={symbol}
                                >
                                    {symbol}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="h-4"></div>
        </div>
    );
};
