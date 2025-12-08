import { useState, useEffect } from 'react';
import { translations } from '../locales';

interface EmojiCategory {
    id: string; // added ID for translation mapping
    name: string; // Fallback or key
    emojis: { char: string; name: string }[];
}

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    theme: 'light' | 'dark';
    searchQuery?: string;
    t: typeof translations['en']; // Added back
}

const CLEAN_EMOJIS: EmojiCategory[] = [
    {
        id: 'common',
        name: 'Common',
        emojis: [
            { char: '😂', name: 'joy tears' }, { char: '❤️', name: 'red heart' }, { char: '🤣', name: 'rolling on floor laughing' }, { char: '👍', name: 'thumbs up' },
            { char: '😭', name: 'loudly crying' }, { char: '🙏', name: 'folded hands' }, { char: '😘', name: 'blow kiss' }, { char: '🥰', name: 'smiling hearts' },
            { char: '😍', name: 'heart eyes' }, { char: '😊', name: 'blush smile' }, { char: '🎉', name: 'party popper' }, { char: '😁', name: 'beaming smile' },
            { char: '💕', name: 'two hearts' }, { char: '🥺', name: 'pleading face' }, { char: '😅', name: 'sweat smile' }, { char: '🔥', name: 'fire' },
            { char: '☺️', name: 'smiling face' }, { char: '🤦', name: 'facepalm' }, { char: '♥️', name: 'heart suit' }, { char: '🤷', name: 'shrug' },
            { char: '🙄', name: 'eye roll' }, { char: '😆', name: 'grinning squint' }, { char: '🤗', name: 'hugging face' }, { char: '😉', name: 'wink' },
            { char: '🎂', name: 'birthday cake' }, { char: '🤔', name: 'thinking face' }, { char: '👏', name: 'clapping hands' }, { char: '🙂', name: 'slightly smiling' },
            { char: '😳', name: 'flushed face' }, { char: '🥳', name: 'partying face' }, { char: '😎', name: 'sunglasses' }, { char: '👌', name: 'ok hand' },
            { char: '💜', name: 'purple heart' }, { char: '😔', name: 'pensive face' }, { char: '💪', name: 'biceps' }, { char: '✨', name: 'sparkles' },
            { char: '💖', name: 'sparkling heart' }, { char: '👀', name: 'eyes' }, { char: '😋', name: 'yummy' }, { char: '😏', name: 'smirking' },
            { char: '😢', name: 'crying face' }, { char: '👉', name: 'point right' }, { char: '💗', name: 'growing heart' }, { char: '😩', name: 'weary face' },
            { char: '💯', name: 'hundred points' }, { char: '🌹', name: 'rose' }, { char: '💞', name: 'revolving hearts' }, { char: '🎈', name: 'balloon' },
            { char: '💙', name: 'blue heart' }, { char: '😃', name: 'grinning face with big eyes' }, { char: '😡', name: 'pouting face' }
        ]
    },
    {
        id: 'hands',
        name: 'Hands',
        emojis: [
            { char: '👍', name: 'thumbs up' }, { char: '👎', name: 'thumbs down' }, { char: '👋', name: 'wave' }, { char: '🙌', name: 'raising hands' },
            { char: '👐', name: 'open hands' }, { char: '🧡', name: 'orange heart' }, { char: '🤚', name: 'raised back of hand' }, { char: '🖐️', name: 'hand with fingers splayed' },
            { char: '✋', name: 'raised hand' }, { char: '🖖', name: 'vulcan salute' }, { char: '👌', name: 'ok hand' }, { char: '🤏', name: 'pinching hand' },
            { char: '✌️', name: 'victory hand' }, { char: '🤞', name: 'crossed fingers' }, { char: '🤟', name: 'love you gesture' }, { char: '🤘', name: 'sign of the horns' },
            { char: '🤙', name: 'call me hand' }, { char: '👈', name: 'point left' }, { char: '👉', name: 'point right' }, { char: '👆', name: 'point up' },
            { char: '🖕', name: 'middle finger' }, { char: '👇', name: 'point down' }, { char: '☝️', name: 'index pointing up' }, { char: '👊', name: 'oncoming fist' },
            { char: '🤛', name: 'left-facing fist' }, { char: '🤜', name: 'right-facing fist' }, { char: '👏', name: 'clapping hands' }, { char: '🤲', name: 'palms up together' },
            { char: '🤝', name: 'handshake' }, { char: '🙏', name: 'folded hands' }
        ]
    },
    {
        id: 'faces',
        name: 'Faces',
        emojis: [
            { char: '😀', name: 'grinning face' }, { char: '😃', name: 'grinning face with big eyes' }, { char: '😄', name: 'grinning face with smiling eyes' }, { char: '😁', name: 'beaming face with smiling eyes' },
            { char: '😆', name: 'grinning squinting face' }, { char: '😅', name: 'grinning face with sweat' }, { char: '😂', name: 'face with tears of joy' }, { char: '🤣', name: 'rolling on the floor laughing' },
            { char: '🙂', name: 'slightly smiling face' }, { char: '🙃', name: 'upside-down face' }, { char: '😉', name: 'winking face' }, { char: '😊', name: 'smiling face with smiling eyes' },
            { char: '😇', name: 'smiling face with halo' }, { char: '🥰', name: 'smiling face with hearts' }, { char: '😍', name: 'smiling face with heart-eyes' }, { char: '🤩', name: 'star-struck' },
            { char: '😘', name: 'face blowing a kiss' }, { char: '😗', name: 'kissing face' }, { char: '☺️', name: 'smiling face' }, { char: '😚', name: 'kissing face with closed eyes' },
            { char: '😙', name: 'kissing face with smiling eyes' }, { char: '😋', name: 'face savoring food' }, { char: '😛', name: 'face with tongue' }, { char: '😜', name: 'winking face with tongue' },
            { char: '🤪', name: 'zany face' }, { char: '😝', name: 'squinting face with tongue' }, { char: '🤑', name: 'money-mouth face' }, { char: '🤗', name: 'hugging face' },
            { char: '🤭', name: 'face with hand over mouth' }, { char: '🤫', name: 'shushing face' }, { char: '🤔', name: 'thinking face' }, { char: '🤐', name: 'zipper-mouth face' },
            { char: '🤨', name: 'face with raised eyebrow' }, { char: '😐', name: 'neutral face' }, { char: '😑', name: 'expressionless face' }, { char: '😶', name: 'face without mouth' },
            { char: '😏', name: 'smirking face' }, { char: '😒', name: 'unamused face' }, { char: '🙄', name: 'face with rolling eyes' }, { char: '😬', name: 'grimacing face' },
            { char: '🤥', name: 'lying face' }, { char: '😌', name: 'relieved face' }, { char: '😔', name: 'pensive face' }, { char: '😪', name: 'sleepy face' },
            { char: '🤤', name: 'drooling face' }, { char: '😴', name: 'sleeping face' }, { char: '😷', name: 'face with medical mask' }, { char: '🤒', name: 'face with thermometer' },
            { char: '🤕', name: 'face with head-bandage' }, { char: '🤢', name: 'nauseated face' }, { char: '🤮', name: 'face vomiting' }, { char: '🤧', name: 'sneezing face' },
            { char: '🥵', name: 'hot face' }, { char: '🥶', name: 'cold face' }, { char: '🥴', name: 'woozy face' }, { char: '😵', name: 'dizzy face' },
            { char: '🤯', name: 'exploding head' }, { char: '🤠', name: 'cowboy hat face' }, { char: '🥳', name: 'partying face' }, { char: '😎', name: 'smiling face with sunglasses' },
            { char: '🤓', name: 'nerd face' }, { char: '🧐', name: 'face with monocle' }, { char: '😕', name: 'confused face' }, { char: '😟', name: 'worried face' },
            { char: '🙁', name: 'slightly frowning face' }, { char: '😮', name: 'face with open mouth' }, { char: '😯', name: 'hushed face' }, { char: '😲', name: 'astonished face' },
            { char: '😳', name: 'flushed face' }, { char: '🥺', name: 'pleading face' }, { char: '😦', name: 'frowning face with open mouth' }, { char: '😧', name: 'anguished face' },
            { char: '😨', name: 'fearful face' }, { char: '😰', name: 'anxious face with sweat' }, { char: '😥', name: 'sad but relieved face' }, { char: '😢', name: 'crying face' },
            { char: '😭', name: 'loudly crying face' }, { char: '😱', name: 'face screaming in fear' }, { char: '😖', name: 'confounded face' }, { char: '😣', name: 'persevering face' },
            { char: '😞', name: 'disappointed face' }, { char: '😓', name: 'downcast face with sweat' }, { char: '😩', name: 'weary face' }, { char: '😫', name: 'tired face' },
            { char: '🥱', name: 'yawning face' }, { char: '😤', name: 'face with steam from nose' }, { char: '😡', name: 'pouting face' }, { char: '😠', name: 'angry face' },
            { char: '🤬', name: 'face with symbols on mouth' }, { char: '😈', name: 'smiling face with horns' }, { char: '👿', name: 'angry face with horns' }, { char: '💀', name: 'skull' },
            { char: '☠️', name: 'skull and crossbones' }
        ]
    },
    {
        id: 'objects',
        name: 'Objects/Symbols',
        emojis: [
            { char: '❤️', name: 'red heart' }, { char: '🧡', name: 'orange heart' }, { char: '💛', name: 'yellow heart' }, { char: '💚', name: 'green heart' },
            { char: '💙', name: 'blue heart' }, { char: '💜', name: 'purple heart' }, { char: '🖤', name: 'black heart' }, { char: '🤍', name: 'white heart' },
            { char: '🤎', name: 'brown heart' }, { char: '💔', name: 'broken heart' }, { char: '💯', name: 'hundred points' }, { char: '💢', name: 'anger symbol' },
            { char: '💥', name: 'collision' }, { char: '💫', name: 'dizzy' }, { char: '💦', name: 'sweat droplets' }, { char: '💨', name: 'dashing away' },
            { char: '🕳️', name: 'hole' }, { char: '💣', name: 'bomb' }, { char: '💬', name: 'speech balloon' }, { char: '👁️‍🗨️', name: 'eye in speech bubble' },
            { char: '🗨️', name: 'left speech bubble' }, { char: '🗯️', name: 'right anger bubble' }, { char: '💭', name: 'thought balloon' }, { char: '💤', name: 'zzz' },
            { char: '👋', name: 'wave' }, { char: '🤚', name: 'raised back of hand' }, { char: '🖐️', name: 'hand with fingers splayed' }, { char: '✋', name: 'raised hand' },
            { char: '🖖', name: 'vulcan salute' }, { char: '👌', name: 'ok hand' }, { char: '🤏', name: 'pinching hand' }, { char: '✌️', name: 'victory hand' },
            { char: '🤞', name: 'crossed fingers' }, { char: '🤟', name: 'love you gesture' }, { char: '🤘', name: 'sign of the horns' }, { char: '🤙', name: 'call me hand' },
            { char: '👈', name: 'point left' }, { char: '👉', name: 'point right' }, { char: '👆', name: 'point up' }, { char: '🖕', name: 'middle finger' },
            { char: '👇', name: 'point down' }, { char: '☝️', name: 'index pointing up' }, { char: '👍', name: 'thumbs up' }, { char: '👎', name: 'thumbs down' },
            { char: '✊', name: 'raised fist' }, { char: '👊', name: 'oncoming fist' }, { char: '🤛', name: 'left-facing fist' }, { char: '🤜', name: 'right-facing fist' },
            { char: '👏', name: 'clapping hands' }, { char: '🙌', name: 'raising hands' }, { char: '👐', name: 'open hands' }, { char: '🤲', name: 'palms up together' },
            { char: '🤝', name: 'handshake' }, { char: '🙏', name: 'folded hands' }, { char: '✍️', name: 'writing hand' }, { char: '💅', name: 'nail polish' },
            { char: '🤳', name: 'selfie' }, { char: '💪', name: 'flexed biceps' }, { char: '🦾', name: 'mechanical arm' }, { char: '🦿', name: 'mechanical leg' },
            { char: '🦵', name: 'leg' }, { char: '🦶', name: 'foot' }, { char: '👂', name: 'ear' }, { char: '🦻', name: 'ear with hearing aid' },
            { char: '👃', name: 'nose' }, { char: '🧠', name: 'brain' }, { char: '🦷', name: 'tooth' }, { char: '🦴', name: 'bone' },
            { char: '👀', name: 'eyes' }, { char: '👁️', name: 'eye' }, { char: '👅', name: 'tongue' }, { char: '👄', name: 'mouth' },
            { char: '💋', name: 'kiss mark' }
        ]
    }
];

export const EmojiPicker = ({ onSelect, theme, searchQuery = '', t }: EmojiPickerProps) => {
    const isLight = theme === 'light';
    const bgHover = isLight ? 'hover:bg-gray-200' : 'hover:bg-white/10';

    const [recentEmojis, setRecentEmojis] = useState<{ char: string; name: string }[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('recentEmojis');
        if (stored) {
            try {
                setRecentEmojis(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse recent emojis', e);
            }
        }
    }, []);

    const handleSelect = (emoji: { char: string; name: string }) => {
        onSelect(emoji.char);

        setRecentEmojis(prev => {
            const others = prev.filter(e => e.char !== emoji.char);
            const newList = [emoji, ...others].slice(0, 24); // Limit to 24 (3 rows of 8)
            localStorage.setItem('recentEmojis', JSON.stringify(newList));
            return newList;
        });
    };

    // Construct valid categories
    const allCategories = [
        ...(recentEmojis.length > 0 ? [{
            id: 'recent',
            name: t.emojiCategories?.recent || 'Recent',
            emojis: recentEmojis
        }] : []),
        ...CLEAN_EMOJIS.map(cat => ({
            ...cat,
            name: t.emojiCategories?.[cat.id as keyof typeof t.emojiCategories] || cat.name
        }))
    ];

    // Filter categories and emojis based on search query
    const filteredCategories = allCategories.map(cat => ({
        ...cat,
        emojis: cat.emojis.filter(emoji =>
            emoji.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emoji.char.includes(searchQuery)
        )
    })).filter(cat => cat.emojis.length > 0);

    return (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="space-y-6">
                {filteredCategories.length > 0 ? (
                    filteredCategories.map((category) => (
                        <div key={category.id || category.name}>
                            <h3 className={`mb-2 text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                                {category.name}
                            </h3>
                            <div className="grid grid-cols-8 gap-1">
                                {category.emojis.map((emoji, index) => (
                                    <button
                                        key={`${category.id}-${index}`}
                                        onClick={() => handleSelect(emoji)}
                                        className={`aspect-square rounded flex items-center justify-center text-xl transition-colors ${bgHover}`}
                                        title={emoji.name}
                                    >
                                        {emoji.char}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500 text-sm py-8">
                        {t.noItems}
                    </div>
                )}
            </div>
            <div className="h-4"></div>
        </div>
    );
};
