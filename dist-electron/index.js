import { app as c, clipboard as m, ipcMain as h, BrowserWindow as U, nativeImage as G, protocol as V, globalShortcut as $, Tray as z, Menu as q, screen as C } from "electron";
import d, { join as J, dirname as Q, basename as Y } from "node:path";
import "node:fs";
import I, { writeFile as X, rename as K, readFile as Z } from "node:fs/promises";
import { fileURLToPath as W } from "node:url";
import { randomFillSync as tt, randomUUID as et } from "node:crypto";
import { exec as S } from "node:child_process";
const r = [];
for (let e = 0; e < 256; ++e)
  r.push((e + 256).toString(16).slice(1));
function nt(e, t = 0) {
  return (r[e[t + 0]] + r[e[t + 1]] + r[e[t + 2]] + r[e[t + 3]] + "-" + r[e[t + 4]] + r[e[t + 5]] + "-" + r[e[t + 6]] + r[e[t + 7]] + "-" + r[e[t + 8]] + r[e[t + 9]] + "-" + r[e[t + 10]] + r[e[t + 11]] + r[e[t + 12]] + r[e[t + 13]] + r[e[t + 14]] + r[e[t + 15]]).toLowerCase();
}
const E = new Uint8Array(256);
let b = E.length;
function it() {
  return b > E.length - 16 && (tt(E), b = 0), E.slice(b, b += 16);
}
const k = { randomUUID: et };
function st(e, t, n) {
  e = e || {};
  const i = e.random ?? e.rng?.() ?? it();
  if (i.length < 16)
    throw new Error("Random bytes length must be >= 16");
  return i[6] = i[6] & 15 | 64, i[8] = i[8] & 63 | 128, nt(i);
}
function N(e, t, n) {
  return k.randomUUID && !e ? k.randomUUID() : st(e);
}
function at(e) {
  const t = e instanceof URL ? W(e) : e.toString();
  return J(Q(t), `.${Y(t)}.tmp`);
}
async function ot(e, t, n) {
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
class rt {
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
      await X(this.#e, t, "utf-8"), await ot(async () => {
        await K(this.#e, this.#t);
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
    this.#t = t, this.#e = at(t);
  }
  async write(t) {
    return this.#n ? this.#r(t) : this.#c(t);
  }
}
class ct {
  #t;
  #e;
  constructor(t) {
    this.#t = t, this.#e = new rt(t);
  }
  async read() {
    let t;
    try {
      t = await Z(this.#t, "utf-8");
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
class lt {
  #t;
  #e;
  #n;
  constructor(t, { parse: n, stringify: i }) {
    this.#t = new ct(t), this.#e = n, this.#n = i;
  }
  async read() {
    const t = await this.#t.read();
    return t === null ? null : this.#e(t);
  }
  write(t) {
    return this.#t.write(this.#n(t));
  }
}
class dt extends lt {
  constructor(t) {
    super(t, {
      parse: JSON.parse,
      stringify: (n) => JSON.stringify(n, null, 2)
    });
  }
}
class ut {
  #t = null;
  read() {
    return Promise.resolve(this.#t);
  }
  write(t) {
    return this.#t = t, Promise.resolve();
  }
}
function ht(e, t) {
  if (e === void 0)
    throw new Error("lowdb: missing adapter");
  if (t === void 0)
    throw new Error("lowdb: missing default data");
}
class gt {
  adapter;
  data;
  constructor(t, n) {
    ht(t, n), this.adapter = t, this.data = n;
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
async function wt(e, t) {
  const n = process.env.NODE_ENV === "test" ? new ut() : new dt(e), i = new gt(n, t);
  return await i.read(), i;
}
const O = {
  history: [],
  settings: {
    position: "cursor",
    // Default to cursor as per user request
    grouping: "combined",
    zoom: 100,
    theme: "dark"
    // Assuming dark theme default
  }
}, mt = d.join(c.getPath("userData"), "db.json");
let _ = !1;
const H = [], j = async () => {
  if (_) return;
  const e = H.shift();
  if (e) {
    _ = !0;
    try {
      await e();
    } catch (t) {
      console.error("DB Write Error:", t);
    } finally {
      _ = !1, j();
    }
  }
}, p = async (e) => new Promise((t, n) => {
  H.push(async () => {
    try {
      await (await x()).update(e), t();
    } catch (i) {
      n(i);
    }
  }), j();
}), x = async () => {
  const e = await wt(mt, O);
  return e.data.settings || (e.data.settings = O.settings, await e.write()), e;
}, y = d.join(c.getPath("userData"), "images");
(async () => {
  try {
    await I.mkdir(y, { recursive: !0 });
  } catch (e) {
    console.error("Failed to create images directory", e);
  }
})();
const pt = async (e) => {
  const t = e.toPNG(), n = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`, i = d.join(y, n);
  return await I.writeFile(i, t), n;
}, M = async (e) => {
  await p(({ history: t }) => {
    t.length > 0 && t[0].content === e.content && t[0].type === e.type || (t.unshift(e), t.length > 100);
  });
}, w = async () => (await x()).data.history, F = async () => (await x()).data.settings, ft = async (e, t) => (await p(({ settings: i }) => {
  i[e] = t;
}), (await x()).data.settings), yt = async (e) => {
  await p(({ history: t }) => {
    const n = t.findIndex((i) => i.id === e);
    if (n > -1) {
      const i = t[n];
      if (i.type === "image") {
        const o = d.join(y, i.content);
        I.unlink(o).catch((s) => console.error("Failed to delete image file", s));
      }
      t.splice(n, 1);
    }
  });
}, bt = async (e) => {
  await p(({ history: t }) => {
    const n = t.find((i) => i.id === e);
    n && (n.isPinned = !n.isPinned);
  });
}, Tt = async () => {
  await p(({ history: e }) => {
    const t = e.filter((n) => n.isPinned);
    e.forEach((n) => {
      if (!n.isPinned && n.type === "image") {
        const i = d.join(y, n.content);
        I.unlink(i).catch((o) => console.error("Failed to delete image file", o));
      }
    }), e.length = 0, e.push(...t);
  });
}, Et = async (e, t) => {
  await p(({ history: n }) => {
    const i = n.findIndex((s) => s.id === e), o = n.findIndex((s) => s.id === t);
    if (i !== -1 && o !== -1) {
      const [s] = n.splice(i, 1);
      n.splice(o, 0, s);
    }
  });
}, u = {
  GET_HISTORY: "get-history",
  DELETE_ITEM: "delete-item",
  TOGGLE_PIN: "toggle-pin",
  CLEAR_ALL: "clear-all",
  PASTE_ITEM: "paste-item",
  GET_SETTINGS: "get-settings",
  UPDATE_SETTING: "update-setting",
  REORDER_ITEMS: "reorder-items",
  CLIPBOARD_CHANGED: "clipboard-changed"
};
let f = null, L = "", A = "";
const Pt = (e) => {
  if (f) return;
  L = m.readText();
  const t = m.readImage();
  A = t.isEmpty() ? "" : t.toDataURL(), f = setInterval(async () => {
    const n = m.readText(), i = m.readImage(), o = i.isEmpty() ? "" : i.toDataURL();
    if (n && n !== L) {
      L = n;
      const s = {
        id: N(),
        type: "text",
        content: n,
        timestamp: Date.now(),
        isPinned: !1
      };
      await M(s);
      const l = await w();
      e.isDestroyed() || e.webContents.send(u.CLIPBOARD_CHANGED, l);
    } else if (!i.isEmpty() && o !== A) {
      A = o;
      const s = await pt(i), l = {
        id: N(),
        type: "image",
        content: s,
        // Store filename/path
        timestamp: Date.now(),
        isPinned: !1
      };
      await M(l);
      const g = await w();
      e.isDestroyed() || e.webContents.send(u.CLIPBOARD_CHANGED, g);
    }
  }, 1e3);
}, It = () => {
  f && (clearInterval(f), f = null);
}, xt = () => {
  h.handle(u.GET_HISTORY, async () => await w()), h.handle(u.DELETE_ITEM, async (e, t) => (await yt(t), await w())), h.handle(u.TOGGLE_PIN, async (e, t) => (await bt(t), await w())), h.handle(u.CLEAR_ALL, async () => (await Tt(), await w())), h.handle(u.GET_SETTINGS, async () => await F()), h.handle(u.UPDATE_SETTING, async (e, t, n) => await ft(t, n)), h.handle(u.REORDER_ITEMS, async (e, t, n) => await Et(t, n)), h.handle("get-app-path", () => c.isPackaged ? process.execPath : `${process.execPath} ${c.getAppPath()}`), h.handle(u.PASTE_ITEM, async (e, t) => {
    console.log(`[IPC] PASTE_ITEM called for id: ${t}`);
    const i = (await w()).find((s) => s.id === t);
    if (!i) {
      console.log("[IPC] Item not found for paste");
      return;
    }
    U.fromWebContents(e.sender)?.hide(), setTimeout(() => {
      if (i.type === "text")
        m.writeText(i.content), S("xdotool click 1", () => {
        }), S("xdotool key --clearmodifiers ctrl+v", (s) => {
          s && console.error("Failed to paste:", s);
        });
      else if (i.type === "image")
        try {
          const s = d.join(y, i.content), l = G.createFromPath(s);
          m.writeImage(l), S("xdotool key --clearmodifiers ctrl+v", (g) => {
            g && console.error("Failed to paste image:", g);
          });
        } catch (s) {
          console.error("Failed to write image to clipboard", s);
        }
    }, 500);
  });
}, Dt = W(import.meta.url), P = d.dirname(Dt);
V.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: !0, standard: !0, supportFetchAPI: !0, corsEnabled: !0 } }
]);
let a = null, T = null;
const B = c.isPackaged ? d.join(P, "../dist/icon.png") : d.join(P, "../public/icon.png");
let v = !1;
const St = async () => {
  const t = (await F().catch(() => null))?.zoom || 100, n = 400, i = 600, o = Math.round(n * (t / 100)), s = Math.round(i * (t / 100));
  a = new U({
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
    type: "dialog",
    icon: B,
    webPreferences: {
      preload: d.join(P, "preload.cjs"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), a.hide(), process.env.VITE_DEV_SERVER_URL ? a.loadURL(process.env.VITE_DEV_SERVER_URL) : a.loadFile(d.join(P, "../dist/index.html")), a.on("blur", () => {
    if (v) {
      console.log("[Window] Blur ignored (debounce).");
      return;
    }
    a && !a.webContents.isDevToolsOpened() && (console.log("[Window] Blur event triggered. Hiding."), a.hide());
  });
}, R = async () => {
  if (!a) return;
  const e = a.isVisible(), t = a.isFocused();
  if (console.log(`[Toggle] Triggered. Visible: ${e}, Focused: ${t}`), e && t)
    console.log("[Toggle] Hiding window"), a.hide();
  else {
    console.log("[Toggle] Showing window"), v = !0, setTimeout(() => {
      v = !1;
    }, 300);
    const n = await F();
    if (a.setAlwaysOnTop(!0), a.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }), n && n.zoom) {
      const s = Math.round(400 * (n.zoom / 100)), l = Math.round(600 * (n.zoom / 100));
      (a.getBounds().width !== s || a.getBounds().height !== l) && a.setSize(s, l);
    }
    if (n && n.position === "cursor") {
      const { x: i, y: o } = C.getCursorScreenPoint(), s = C.getDisplayNearestPoint({ x: i, y: o }), l = a.getBounds();
      let g = i, D = o;
      g + l.width > s.bounds.x + s.bounds.width && (g = s.bounds.x + s.bounds.width - l.width), D + l.height > s.bounds.y + s.bounds.height && (D = s.bounds.y + s.bounds.height - l.height), a.setPosition(g, D);
    }
    e || a.show(), a.focus(), setTimeout(() => {
      a?.isVisible() || (console.log("[Toggle] Retry showing window..."), a?.show(), a?.focus());
    }, 100);
  }
}, _t = () => {
  const e = G.createFromPath(B).resize({ width: 24, height: 24 });
  T = new z(e);
  const t = q.buildFromTemplate([
    { label: "Show Clipboard", click: () => R() },
    { label: "Quit", click: () => c.quit() }
  ]);
  T.setToolTip("Clipboard Manager"), T.setContextMenu(t), T.on("click", () => R());
}, Lt = c.requestSingleInstanceLock();
Lt ? (c.on("second-instance", (e, t, n) => {
  console.log("[Main] Second instance detected. Toggling window."), R();
}), c.whenReady().then(async () => {
  xt(), _t(), await St(), a && Pt(a), c.isPackaged && c.setLoginItemSettings({
    openAtLogin: !0,
    path: process.execPath
  });
})) : c.quit();
c.on("window-all-closed", () => {
  process.platform;
});
c.on("will-quit", () => {
  $.unregisterAll(), It();
});
