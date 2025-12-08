"use strict";
const electron = require("electron");
const IPC_CHANNELS = {
  GET_HISTORY: "get-history",
  DELETE_ITEM: "delete-item",
  TOGGLE_PIN: "toggle-pin",
  CLEAR_ALL: "clear-all",
  PASTE_ITEM: "paste-item",
  GET_SETTINGS: "get-settings",
  UPDATE_SETTING: "update-setting",
  REORDER_ITEMS: "reorder-items",
  CLIPBOARD_CHANGED: "clipboard-changed",
  HIDE_WINDOW: "hide-window"
};
electron.contextBridge.exposeInMainWorld("electron", {
  getHistory: () => electron.ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY),
  deleteItem: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.DELETE_ITEM, id),
  togglePin: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_PIN, id),
  clearAll: () => electron.ipcRenderer.invoke(IPC_CHANNELS.CLEAR_ALL),
  pasteItem: (id) => electron.ipcRenderer.invoke(IPC_CHANNELS.PASTE_ITEM, id),
  getSettings: () => electron.ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  updateSetting: (key, value) => electron.ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTING, key, value),
  reorderItems: (activeId, overId) => electron.ipcRenderer.invoke(IPC_CHANNELS.REORDER_ITEMS, activeId, overId),
  hideWindow: () => electron.ipcRenderer.invoke(IPC_CHANNELS.HIDE_WINDOW),
  getAppPath: () => electron.ipcRenderer.invoke("get-app-path"),
  onClipboardChanged: (callback) => {
    const subscription = (_, data) => callback(data);
    electron.ipcRenderer.on(IPC_CHANNELS.CLIPBOARD_CHANGED, subscription);
    return () => {
      electron.ipcRenderer.removeListener(IPC_CHANNELS.CLIPBOARD_CHANGED, subscription);
    };
  }
});
