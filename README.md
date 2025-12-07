# Win-ClipBoard Manager

A modern and efficient clipboard manager for Linux (compatible with Linux Mint and other distributions), built with Electron, React, TypeScript, and Vite. Inspired by Windows Clipboard History (`Win+V`).

## 🚀 Features

- **Complete History**: Stores text and images copied to the clipboard.
- **Modern Interface**: "Card" style layout with support for **Light** and **Dark** themes.
- **Powerful Organization**:
  - **Categories**: Filter by "All", "Text", or "Images".
  - **Search**: Quickly find what you copied.
  - **Drag & Drop**: Reorder your items by dragging and dropping.
  - **Pin Items**: Keep important items pinned to the top.
- **Customization**:
  - **Zoom** adjustment for the interface.
  - Window positioning (follow the cursor).
- **System Integration**:
  - Runs in the background (System Tray).
  - Single instance behavior (toggles window visibility when opened again).

## 🛠️ Technologies

- [Electron](https://www.electronjs.org/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [dnd-kit](https://dndkit.com/) (Drag and Drop)
- [lowdb](https://github.com/typicode/lowdb) (Local storage)

## 📦 How to Use

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Win-ClipBoard.git
   cd Win-ClipBoard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running in Development

To start the application in development mode:

```bash
npm run dev
```

### Build (Production)

To create the executable or package for distribution:

```bash
npm run build
```

This will generate files in the `dist-electron` or `release` folder (depending on builder configuration).

## ⌨️ Setting up Global Shortcut (Linux)

To open the manager with a keyboard shortcut (like `Super+V`), it is recommended to configure a native shortcut in your desktop environment (Cinnamon, GNOME, KDE, etc.):

1. Go to **System Settings** > **Keyboard** > **Shortcuts**.
2. Add a **Custom Shortcut**.
3. In the command, place the path to the app executable (or `npm run dev` if in dev).
4. Define the desired shortcut key (e.g., `Super+V`).

*Note: The application uses a "Single Instance Lock" system. When attempting to open the app again via shortcut, it detects it is already running and simply toggles the window visibility, ensuring a fast response.*

## 📝 License

This project is under the MIT license.
