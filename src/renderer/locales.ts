export type Language = 'en' | 'pt-BR';

export const translations = {
    en: {
        appTitle: 'Clipboard Manager',
        searchPlaceholder: 'Search...',
        tabs: {
            all: 'All',
            text: 'Text',
            image: 'Images'
        },
        noItems: 'No items found',
        settings: {
            title: 'Settings',
            windowPosition: 'Window Position',
            positionFixed: 'Fixed',
            positionCursor: 'Cursor',
            positionMouse: 'Mouse', // Synonym in UI just in case
            grouping: 'Tab Organization', // Deprecated but might be needed if I overlooked something
            zoom: 'Size (Zoom)',
            shortcuts: 'Keyboard Shortcuts',
            shortcutsDesc: 'To open the app with a key (e.g. Super+V), create a shortcut in your Linux system:',
            shortcutsSteps: [
                'Go to **Settings > Keyboard > Shortcuts**',
                'Add a custom shortcut',
                'Name: **Clipboard**',
                'Command:'
            ],
            copyCommand: 'Copy',
            theme: 'Theme',
            themeDark: 'Dark',
            themeLight: 'Light',
            language: 'Language',
            closeHint: 'Close to save and apply.'
        },
        actions: {
            pin: 'Pin',
            unpin: 'Unpin',
            delete: 'Delete',
            clearAll: 'Clear All',
            settings: 'Settings'
        },
        typeNav: {
            clipboard: 'Clipboard',
            emojis: 'Emojis',
            symbols: 'Symbols'
        },
        emojiCategories: {
            recent: 'Recent',
            common: 'Common',
            hands: 'Hands',
            faces: 'Faces',
            objects: 'Objects/Symbols'
        },
        symbolCategories: {
            math: 'Math',
            currency: 'Currency',
            arrows: 'Arrows',
            punctuation: 'Punctuation & Layout',
            shapes: 'Shapes'
        },
        footer: 'powered by: Bruno33223'
    },
    'pt-BR': {
        appTitle: 'Gerenciador de Área de Transferência',
        searchPlaceholder: 'Pesquisar...',
        tabs: {
            all: 'Tudo',
            text: 'Texto',
            image: 'Imagens'
        },
        noItems: 'Nenhum item encontrado',
        settings: {
            title: 'Configurações',
            windowPosition: 'Posição da Janela',
            positionFixed: 'Fixa',
            positionCursor: 'Mouse',
            positionMouse: 'Mouse',
            grouping: 'Organização das Abas',
            zoom: 'Tamanho (Zoom)',
            shortcuts: 'Atalho de Teclado',
            shortcutsDesc: 'Para abrir o app com uma tecla (ex: Super+V), crie um atalho no seu sistema Linux:',
            shortcutsSteps: [
                'Vá em **Configurações > Teclado > Atalhos**',
                'Adicione um atalho personalizado',
                'Nome: **Clipboard**',
                'Comando:'
            ],
            copyCommand: 'Copiar',
            theme: 'Tema',
            themeDark: 'Escuro',
            themeLight: 'Claro',
            language: 'Idioma',
            closeHint: 'Feche para salvar e aplicar.'
        },
        actions: {
            pin: 'Fixar',
            unpin: 'Desafixar',
            delete: 'Excluir',
            clearAll: 'Limpar Tudo',
            settings: 'Configurações'
        },
        typeNav: {
            clipboard: 'Clipboard',
            emojis: 'Emojis',
            symbols: 'Símbolos'
        },
        emojiCategories: {
            recent: 'Recentes',
            common: 'Comum',
            hands: 'Mãos',
            faces: 'Rostos',
            objects: 'Objetos/Símbolos'
        },
        symbolCategories: {
            math: 'Matemática',
            currency: 'Moeda',
            arrows: 'Setas',
            punctuation: 'Pontuação e Layout',
            shapes: 'Formas'
        },
        footer: 'desenvolvido por: Bruno33223'
    }
};
