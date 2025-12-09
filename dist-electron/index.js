import { app as c, clipboard as m, ipcMain as h, BrowserWindow as y, nativeImage as k, protocol as U, net as J, globalShortcut as Q, Tray as Y, Menu as Z, screen as v } from "electron";
import d, { join as X, dirname as K, basename as tt } from "node:path";
import "node:fs";
import S, { writeFile as et, rename as nt, readFile as it } from "node:fs/promises";
import { fileURLToPath as G, pathToFileURL as st } from "node:url";
import { randomFillSync as at, randomUUID as ot } from "node:crypto";
import { exec as C } from "node:child_process";
const r = [];
for (let e = 0; e < 256; ++e)
  r.push((e + 256).toString(16).slice(1));
function rt(e, t = 0) {
  return (r[e[t + 0]] + r[e[t + 1]] + r[e[t + 2]] + r[e[t + 3]] + "-" + r[e[t + 4]] + r[e[t + 5]] + "-" + r[e[t + 6]] + r[e[t + 7]] + "-" + r[e[t + 8]] + r[e[t + 9]] + "-" + r[e[t + 10]] + r[e[t + 11]] + r[e[t + 12]] + r[e[t + 13]] + r[e[t + 14]] + r[e[t + 15]]).toLowerCase();
}
const P = new Uint8Array(256);
let T = P.length;
function ct() {
  return T > P.length - 16 && (at(P), T = 0), P.slice(T, T += 16);
}
const W = { randomUUID: ot };
function lt(e, t, n) {
  e = e || {};
  const i = e.random ?? e.rng?.() ?? ct();
  if (i.length < 16)
    throw new Error("Random bytes length must be >= 16");
  return i[6] = i[6] & 15 | 64, i[8] = i[8] & 63 | 128, rt(i);
}
function O(e, t, n) {
  return W.randomUUID && !e ? W.randomUUID() : lt(e);
}
function dt(e) {
  const t = e instanceof URL ? G(e) : e.toString();
  return X(K(t), `.${tt(t)}.tmp`);
}
async function ut(e, t, n) {
  for (let i = 0; i < t; i++)
    try {
      return await e();
    } catch (o) {
      if (i < t - 1)
        await new Promise((s) => setTimeout(s, n));
      else
        throw o;
    }
}
class ht {
  #t;
  #e;
  #n = !1;
  #s = null;
  #a = null;
  #o = null;
  #i = null;
  // File is locked, add data for later
  #r(t) {
    return this.#i = t, this.#o ||= new Promise((n, i) => {
      this.#a = [n, i];
    }), new Promise((n, i) => {
      this.#o?.then(n).catch(i);
    });
  }
  // File isn't locked, write data
  async #c(t) {
    this.#n = !0;
    try {
      await et(this.#e, t, "utf-8"), await ut(async () => {
        await nt(this.#e, this.#t);
      }, 10, 100), this.#s?.[0]();
    } catch (n) {
      throw n instanceof Error && this.#s?.[1](n), n;
    } finally {
      if (this.#n = !1, this.#s = this.#a, this.#a = this.#o = null, this.#i !== null) {
        const n = this.#i;
        this.#i = null, await this.write(n);
      }
    }
  }
  constructor(t) {
    this.#t = t, this.#e = dt(t);
  }
  async write(t) {
    return this.#n ? this.#r(t) : this.#c(t);
  }
}
class wt {
  #t;
  #e;
  constructor(t) {
    this.#t = t, this.#e = new ht(t);
  }
  async read() {
    let t;
    try {
      t = await it(this.#t, "utf-8");
    } catch (n) {
      if (n.code === "ENOENT")
        return null;
      throw n;
    }
    return t;
  }
  write(t) {
    return this.#e.write(t);
  }
}
class mt {
  #t;
  #e;
  #n;
  constructor(t, { parse: n, stringify: i }) {
    this.#t = new wt(t), this.#e = n, this.#n = i;
  }
  async read() {
    const t = await this.#t.read();
    return t === null ? null : this.#e(t);
  }
  write(t) {
    return this.#t.write(this.#n(t));
  }
}
class gt extends mt {
  constructor(t) {
    super(t, {
      parse: JSON.parse,
      stringify: (n) => JSON.stringify(n, null, 2)
    });
  }
}
class ft {
  #t = null;
  read() {
    return Promise.resolve(this.#t);
  }
  write(t) {
    return this.#t = t, Promise.resolve();
  }
}
function pt(e, t) {
  if (e === void 0)
    throw new Error("lowdb: missing adapter");
  if (t === void 0)
    throw new Error("lowdb: missing default data");
}
class yt {
  adapter;
  data;
  constructor(t, n) {
    pt(t, n), this.adapter = t, this.data = n;
  }
  async read() {
    const t = await this.adapter.read();
    t && (this.data = t);
  }
  async write() {
    this.data && await this.adapter.write(this.data);
  }
  async update(t) {
    t(this.data), await this.write();
  }
}
async function bt(e, t) {
  const n = process.env.NODE_ENV === "test" ? new ft() : new gt(e), i = new yt(n, t);
  return await i.read(), i;
}
const M = {
  history: [],
  settings: {
    position: "cursor",
    // Default to cursor as per user request
    grouping: "categorized",
    zoom: 100,
    theme: "dark",
    // Assuming dark theme default
    language: null
  }
}, Tt = d.join(c.getPath("userData"), "db.json");
let A = !1;
const H = [], j = async () => {
  if (A) return;
  const e = H.shift();
  if (e) {
    A = !0;
    try {
      await e();
    } catch (t) {
      console.error("DB Write Error:", t);
    } finally {
      A = !1, j();
    }
  }
}, f = async (e) => new Promise((t, n) => {
  H.push(async () => {
    try {
      await (await _()).update(e), t();
    } catch (i) {
      n(i);
    }
  }), j();
}), _ = async () => {
  const e = await bt(Tt, M);
  return e.data.settings || (e.data.settings = M.settings, await e.write()), e;
}, p = d.join(c.getPath("userData"), "images");
(async () => {
  try {
    await S.mkdir(p, { recursive: !0 });
  } catch (e) {
    console.error("Failed to create images directory", e);
  }
})();
const Et = async (e) => {
  const t = e.toPNG(), n = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`, i = d.join(p, n);
  return await S.writeFile(i, t), n;
}, z = async (e) => {
  await f(({ history: t }) => {
    t.length > 0 && t[0].content === e.content && t[0].type === e.type || (t.unshift(e), t.length > 100);
  });
}, w = async () => (await _()).data.history, R = async () => (await _()).data.settings, It = async (e, t) => (await f(({ settings: i }) => {
  i[e] = t;
}), (await _()).data.settings), Pt = async (e) => {
  await f(({ history: t }) => {
    const n = t.findIndex((i) => i.id === e);
    if (n > -1) {
      const i = t[n];
      if (i.type === "image") {
        const o = d.join(p, i.content);
        S.unlink(o).catch((s) => console.error("Failed to delete image file", s));
      }
      t.splice(n, 1);
    }
  });
}, xt = async (e) => {
  await f(({ history: t }) => {
    const n = t.find((i) => i.id === e);
    n && (n.isPinned = !n.isPinned);
  });
}, Dt = async () => {
  await f(({ history: e }) => {
    const t = e.filter((n) => n.isPinned);
    e.forEach((n) => {
      if (!n.isPinned && n.type === "image") {
        const i = d.join(p, n.content);
        S.unlink(i).catch((o) => console.error("Failed to delete image file", o));
      }
    }), e.length = 0, e.push(...t);
  });
}, St = async (e, t) => {
  await f(({ history: n }) => {
    const i = n.findIndex((s) => s.id === e), o = n.findIndex((s) => s.id === t);
    if (i !== -1 && o !== -1) {
      const [s] = n.splice(i, 1);
      n.splice(o, 0, s);
    }
  });
}, l = {
  GET_HISTORY: "get-history",
  DELETE_ITEM: "delete-item",
  TOGGLE_PIN: "toggle-pin",
  CLEAR_ALL: "clear-all",
  PASTE_ITEM: "paste-item",
  GET_SETTINGS: "get-settings",
  UPDATE_SETTING: "update-setting",
  REORDER_ITEMS: "reorder-items",
  CLIPBOARD_CHANGED: "clipboard-changed",
  HIDE_WINDOW: "hide-window",
  PASTE_CONTENT: "paste-content"
};
let b = null, E = "", F = "", x = null;
const _t = (e) => {
  x = e;
}, Ct = (e) => {
  if (b) return;
  E = m.readText();
  const t = m.readImage();
  F = t.isEmpty() ? "" : t.toDataURL(), b = setInterval(async () => {
    const n = m.readText(), i = m.readImage(), o = i.isEmpty() ? "" : i.toDataURL();
    if (n && n !== E) {
      if (x && n === x) {
        E = n, x = null;
        return;
      }
      E = n;
      const s = {
        id: O(),
        type: "text",
        content: n,
        timestamp: Date.now(),
        isPinned: !1
      };
      await z(s);
      const u = await w();
      e.isDestroyed() || e.webContents.send(l.CLIPBOARD_CHANGED, u);
    } else if (!i.isEmpty() && o !== F) {
      F = o;
      const s = await Et(i), u = {
        id: O(),
        type: "image",
        content: s,
        // Store filename/path
        timestamp: Date.now(),
        isPinned: !1
      };
      await z(u);
      const g = await w();
      e.isDestroyed() || e.webContents.send(l.CLIPBOARD_CHANGED, g);
    }
  }, 1e3);
}, At = () => {
  b && (clearInterval(b), b = null);
}, Ft = () => {
  h.handle(l.GET_HISTORY, async () => await w()), h.handle(l.DELETE_ITEM, async (e, t) => (await Pt(t), await w())), h.handle(l.TOGGLE_PIN, async (e, t) => (await xt(t), await w())), h.handle(l.CLEAR_ALL, async () => (await Dt(), await w())), h.handle(l.GET_SETTINGS, async () => await R()), h.handle(l.UPDATE_SETTING, async (e, t, n) => {
    const i = await It(t, n);
    if (t === "zoom") {
      const o = y.fromWebContents(e.sender);
      if (o) {
        const s = Number(n), u = 400, g = 600, $ = Math.round(u * (s / 100)), q = Math.round(g * (s / 100));
        o.webContents.setZoomFactor(s / 100), o.setResizable(!0), o.setSize($, q), setTimeout(() => {
          o.setResizable(!1);
        }, 100);
      }
    }
    return i;
  }), h.handle(l.REORDER_ITEMS, async (e, t, n) => await St(t, n)), h.handle(l.HIDE_WINDOW, (e) => {
    y.fromWebContents(e.sender)?.minimize();
  }), h.handle("get-app-path", () => c.isPackaged ? process.execPath : `${process.execPath} ${c.getAppPath()}`), h.handle(l.PASTE_ITEM, async (e, t) => {
    console.log(`[IPC] PASTE_ITEM called for id: ${t}`);
    const i = (await w()).find((s) => s.id === t);
    if (!i) {
      console.log("[IPC] Item not found for paste");
      return;
    }
    y.fromWebContents(e.sender)?.minimize(), setTimeout(() => {
      if (i.type === "text")
        m.writeText(i.content), C("xdotool key --clearmodifiers ctrl+v", (s) => {
          s && console.error("Failed to paste:", s);
        });
      else if (i.type === "image")
        try {
          const s = d.join(p, i.content), u = k.createFromPath(s);
          m.writeImage(u), C("xdotool key --clearmodifiers ctrl+v", (g) => {
            g && console.error("Failed to paste image:", g);
          });
        } catch (s) {
          console.error("Failed to write image to clipboard", s);
        }
    }, 10);
  }), h.handle(l.PASTE_CONTENT, (e, t) => {
    _t(t), m.writeText(t), y.fromWebContents(e.sender)?.minimize(), setTimeout(() => {
      C("xdotool key --clearmodifiers ctrl+v", (i) => {
        i && console.error("Failed to paste content:", i);
      });
    }, 100);
  });
}, Lt = G(import.meta.url), D = d.dirname(Lt);
U.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: !0, standard: !0, supportFetchAPI: !0, corsEnabled: !0 } }
]);
let a = null, I = null;
const B = c.isPackaged ? d.join(D, "../dist/icon.png") : d.join(D, "../public/icon.png");
let L = !1;
const Nt = async () => {
  const t = (await R().catch(() => null))?.zoom || 100, n = 400, i = 600, o = Math.round(n * (t / 100)), s = Math.round(i * (t / 100));
  a = new y({
    width: o,
    height: s,
    x: void 0,
    y: void 0,
    frame: !1,
    resizable: !1,
    fullscreenable: !1,
    alwaysOnTop: !0,
    transparent: !0,
    skipTaskbar: !0,
    type: "utility",
    icon: B,
    webPreferences: {
      preload: d.join(D, "preload.cjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), a.minimize(), process.env.VITE_DEV_SERVER_URL ? (a.loadURL(process.env.VITE_DEV_SERVER_URL), a.webContents.setZoomFactor(t / 100)) : (a.loadFile(d.join(D, "../dist/index.html")), a.webContents.setZoomFactor(t / 100)), a.on("blur", () => {
    if (L) {
      console.log("[Window] Blur ignored (debounce).");
      return;
    }
    a && !a.webContents.isDevToolsOpened() && (a.isMinimized() || (console.log("[Window] Blur event triggered. Hiding."), V()));
  });
}, V = () => {
  a && a.minimize();
}, Rt = async () => {
  if (!a) return;
  const e = await R();
  if (a.restore(), a.setAlwaysOnTop(!0), a.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), e && e.zoom) {
    const i = Math.round(400 * (e.zoom / 100)), o = Math.round(600 * (e.zoom / 100));
    (a.getBounds().width !== i || a.getBounds().height !== o) && a.setSize(i, o);
  }
  if (e && e.position === "cursor") {
    const { x: t, y: n } = v.getCursorScreenPoint(), i = v.getDisplayNearestPoint({ x: t, y: n }), o = a.getBounds();
    let s = t, u = n;
    s + o.width > i.bounds.x + i.bounds.width && (s = i.bounds.x + i.bounds.width - o.width), u + o.height > i.bounds.y + i.bounds.height && (u = i.bounds.y + i.bounds.height - o.height), a.setPosition(s, u);
  } else e && e.position === "fixed" || a.center();
  a.setSkipTaskbar(!0), a.focus();
}, N = async () => {
  if (!a) return;
  const e = a.isMinimized();
  a.isVisible() && !e && a.isFocused() ? V() : (L = !0, setTimeout(() => {
    L = !1;
  }, 300), await Rt());
}, vt = () => {
  const e = k.createFromPath(B).resize({ width: 24, height: 24 });
  I = new Y(e);
  const t = Z.buildFromTemplate([
    { label: "Show Clipboard", click: () => N() },
    { label: "Quit", click: () => c.quit() }
  ]);
  I.setToolTip("Clipboard Manager"), I.setContextMenu(t), I.on("click", () => N());
}, Wt = c.requestSingleInstanceLock();
Wt ? (c.on("second-instance", (e, t, n) => {
  console.log("[Main] Second instance detected. Toggling window."), N();
}), c.whenReady().then(async () => {
  U.handle("app", (e) => {
    const t = e.url;
    if (t.includes("/images/")) {
      const n = t.split("/images/")[1], i = d.join(p, n);
      return J.fetch(st(i).toString());
    }
    return new Response("Not Found", { status: 404 });
  }), Ft(), vt(), await Nt(), a && Ct(a), c.isPackaged && c.setLoginItemSettings({
    openAtLogin: !0,
    path: process.execPath
  });
})) : c.quit();
c.on("window-all-closed", () => {
  process.platform;
});
c.on("will-quit", () => {
  Q.unregisterAll(), At();
});
