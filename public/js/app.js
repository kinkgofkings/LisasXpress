import { attachCallMedia, bindDesk, callLayer, clearCallSound, deskAction, deskNavigated, deskSubmit, deskTick, linkTools, messagesView, pageLink, paintDeskBadge, previewCallSound, ringerLabel, saveCallSound, searchView, warmRinger } from "./desk.js?v=26";
import { loadCart, shopClick, shopSubmit, shopView } from "./shop.js?v=5";

const API = window.APP_CONFIG?.apiBase || "";
const state = {
  user: null,
  recipes: [],
  notes: [],
  library: [],
  q: "",
  cuisine: "all",
  reader: null,
  toast: "",
  recording: null,
  shelf: [],
  shelfCategories: [],
  shelfCategory: "Chicken",
  shelfQ: "",
  shelfLoading: false,
  shelfError: "",
  shelfSeq: 0,
  shelfFocus: false,
  shelfCaret: 0,
  featured: [],
  worldCache: {},
  worldMiss: "",
  worldError: "",
  worldLoading: false,
  showInstall: "",
  noteDraft: "",
  homeNotes: 3,
  homePlates: 6,
  noteFiles: [],
  commentPicks: {},
  editingNote: "",
  filmDraft: { title: "", description: "" },
  libraryEdit: "",
  people: [],
  previews: {},
  bookHits: [],
  bookHitNote: "",
  bookHitSeq: 0,
  bookHitLoading: false,
  qFocus: false,
  qCaret: 0,
  shelfNotice: "",
  menu: false,
  menuFresh: false,
  unread: 0,
  incoming: null,
  activeUsers: [],
  shareDraft: null,
  activeModalPost: null,
  lightboxMediaIndex: 0,
  feedFilter: "all",
  noteTitleDraft: "",
  call: null,
  threads: [],
  threadListReady: "",
  threadFor: "",
  threadPerson: null,
  threadMessages: [],
  searchQ: "",
  searchResult: null,
  hostQ: "",
  hostAnswer: null,
  hostBusy: false,
  ringerName: "",
  ringingFor: "",
  notePosting: false,
  reacting: "",
  shopProducts: [],
  shopLoaded: false,
  shopLoading: false,
  shopError: "",
  shopCategory: "all",
  cart: [],
  cartOpen: false,
  shopMode: "local",
  shopDraft: {},
  shopEstimate: null,
  shopOrder: null,
  shopEditing: null,
  shopSaving: false,
  shopSending: false
};
state.cart = loadCart();
const timer = { endAt: 0, pausedRemaining: 0, running: false, handle: null, alerted: false };
let deferredInstall = null;
let wakeLock = null;

const $ = (html) => html;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

function asset(src) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/uploads/")) return `${API}${src}${src.includes("?") ? "&" : "?"}v=4`;
  return src;
}

function face(person, options = {}) {
  const p = person || { name: "Family" };
  const name = p.name || "Family";
  const initial = name.trim().charAt(0).toUpperCase() || "F";
  const src = p.avatar || p.avatarUrl;
  const img = src
    ? `<img class="face" src="${esc(asset(src))}" alt="${esc(name)}" loading="lazy" decoding="async">`
    : `<span class="face-ph" aria-label="${esc(name)}">${esc(initial)}</span>`;
  if (options.link === false || !p.id) return img;
  return `<a class="face-link" href="#/people/${esc(p.id)}" title="${esc(name)}">${img}</a>`;
}
window.face = face;
window.esc = esc;
window.asset = asset;

async function shrinkImage(file) {
  if (!file || typeof file === "string" || !file.type?.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1400;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function fileKind(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  if (type.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic)$/.test(name)) return "image";
  if (type.startsWith("video/") || /\.(mp4|webm|mov|m4v|qt)$/.test(name)) return "video";
  return "file";
}

function fileLabel(file, kind) {
  const name = String(file?.name || "").trim();
  if (/\.[a-z0-9]+$/i.test(name)) return name;
  if (kind === "video") {
    const type = String(file?.type || "");
    if (type.includes("quicktime")) return "video.mov";
    if (type.includes("webm")) return "video.webm";
    return "video.mp4";
  }
  if (kind === "image") return "photo.jpg";
  return name || "file";
}

function guessMime(file, name) {
  const type = String(file?.type || "").split(";")[0].trim().toLowerCase();
  if (type && type !== "application/octet-stream") return type;
  const label = String(name || file?.name || "").toLowerCase();
  if (/\.mov$|\.qt$/.test(label)) return "video/quicktime";
  if (/\.mp4$|\.m4v$/.test(label)) return "video/mp4";
  if (/\.webm$/.test(label)) return "video/webm";
  if (/\.png$/.test(label)) return "image/png";
  if (/\.jpe?g$/.test(label)) return "image/jpeg";
  if (/\.webp$/.test(label)) return "image/webp";
  if (/\.gif$/.test(label)) return "image/gif";
  return "application/octet-stream";
}

function mealDbPage(url) {
  try {
    return /(^|\.)themealdb\.com$/i.test(new URL(url).hostname);
  } catch {
    return /themealdb\.com/i.test(String(url || ""));
  }
}

async function uploadPieces(file, name) {
  const label = name || file.name || "file";
  const started = await api("/api/media", {
    method: "POST",
    json: { mime: guessMime(file, label), size: file.size, name: label }
  });
  const part = started.partSize || 800_000;
  for (let offset = 0, idx = 0; offset < file.size; offset += part, idx += 1) {
    try {
      await api(`/api/media/parts?path=${encodeURIComponent(started.path)}&idx=${idx}`, {
        method: "PUT",
        body: file.slice(offset, offset + part),
        headers: { "Content-Type": "application/octet-stream" },
        signal: AbortSignal.timeout(60_000)
      });
    } catch (error) {
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw new Error("That upload took too long. Try a shorter video.");
      }
      throw error;
    }
  }
  return started;
}

async function uploadFileFast(file, name) {
  try {
    const form = new FormData();
    form.append("file", file, name || file.name || "file");
    const headers = {};
    const token = localStorage.getItem("lisa-token");
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}/api/upload`, {
      method: "POST",
      headers,
      body: form
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    /* fallback to chunked upload */
  }
  return uploadPieces(file, name);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem("lisa-token");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.json) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.json);
  }
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
    cache: "no-store",
    signal: options.signal || AbortSignal.timeout(20000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function route() {
  const hash = (location.hash.replace(/^#/, "") || "/").trim();
  if (hash.startsWith("/post/") || hash.startsWith("post/")) {
    const id = hash.replace(/^(\/)?post\//, "").split("/")[0].split("?")[0];
    return { name: "post", id, more: "" };
  }
  if (hash.startsWith("post-") || hash.startsWith("/post-")) {
    const id = hash.replace(/^(\/)?post-/, "").split("/")[0].split("?")[0];
    return { name: "post", id, more: "" };
  }
  const parts = hash.split("/").filter(Boolean);
  return {
    name: parts[0] || "home",
    id: decodeURIComponent(parts[1] || ""),
    more: decodeURIComponent(parts.slice(2).join("/") || "")
  };
}

function go(hash) { location.hash = hash; }
function say(message) {
  state.toast = message;
  render();
  setTimeout(() => { if (state.toast === message) { state.toast = ""; render(); } }, 3200);
}
function clock(mins) {
  const n = Number(mins) || 0;
  if (n >= 60) {
    const h = Math.floor(n / 60);
    const m = n % 60;
    return m ? `${h} hr ${m} min` : `${h} hr`;
  }
  return `${n} min`;
}
function recipeLink(recipe) {
  const hash = recipe.world ? `#/world/${recipe.mealId}` : `#/recipe/${recipe.id}`;
  return `${location.origin}${location.pathname}${hash}`;
}
function cuisineLabel(cuisine) {
  if (cuisine === "cajun") return "Cajun";
  if (cuisine === "texas") return "Texas";
  if (cuisine === "texmex") return "Tex-Mex";
  if (cuisine === "garden") return "Garden";
  if (cuisine === "pets") return "The Pet Connection";
  if (cuisine === "kids") return "Little ones";
  if (cuisine === "library") return "Library";
  if (cuisine === "gym") return "The Gym";
  return cuisine || "";
}

function matchesChip(recipe) {
  if (state.cuisine === "all") return true;
  if (state.cuisine === "breakfast") return recipe.category === "Breakfast";
  if (state.cuisine === "sweets") return recipe.category === "Sweets";
  if (state.cuisine === "texas") return recipe.cuisine === "texas" || recipe.cuisine === "texmex";
  if (state.cuisine === "garden") return recipe.cuisine === "garden" || recipe.category === "Garden";
  if (state.cuisine === "pets") return recipe.cuisine === "pets";
  if (state.cuisine === "kids") return recipe.cuisine === "kids";
  if (state.cuisine === "gym") return recipe.cuisine === "gym";
  if (state.cuisine === "stews") return /stew|pot roast/i.test(`${recipe.title} ${recipe.category}`);
  return recipe.cuisine === state.cuisine;
}
function youtubeId(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = parsed.pathname.split("/").filter(Boolean)[0] || "";
    else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      id = parsed.searchParams.get("v") || (parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/) || [])[1] || "";
    }
    return /^[\w-]{6,}$/.test(id) ? id : "";
  } catch { return ""; }
}
function pad(n) { return String(n).padStart(2, "0"); }
function remainingSeconds() {
  if (timer.running) return Math.max(0, Math.ceil((timer.endAt - Date.now()) / 1000));
  return timer.pausedRemaining;
}
function timerText() {
  const seconds = remainingSeconds();
  return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;
}
function installedAlready() {
  try {
    return Boolean(
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      navigator?.standalone === true ||
      window.navigator?.standalone === true
    );
  } catch {
    return false;
  }
}

function shopCtx() {
  return { state, esc, api, say, render, route, asset, uploadFile: uploadFileFast };
}

function shell(main) {
  return `
    <header class="mast">
      <a class="brand" href="#/">
        <img class="ribbon-mark" src="/ribbon.svg" alt="">
        <span>
          <p class="eyebrow">Cajun, Texas, and the open library</p>
          <h1>Lisa's Recipe Book</h1>
        </span>
      </a>
      <nav class="nav" aria-label="Desktop navigation">
        <a class="${route().name === 'home' ? 'active' : ''}" href="#/"><i class="bi bi-collection-play"></i> Feed</a>
        <a class="${route().name === 'shop' && route().id !== 'cart' ? 'active' : ''}" href="#/shop"><i class="bi bi-bag"></i> Shop</a>
        <a class="basket-link ${route().name === 'shop' && route().id === 'cart' ? 'active' : ''}" href="#/shop/cart"><i class="bi bi-cart"></i> Cart${state.cart?.length ? ` (${state.cart.reduce((sum, line) => sum + Number(line.qty || 0), 0)})` : ""}</a>
        <a class="${route().name === 'notes' ? 'active' : ''}" href="#/notes"><i class="bi bi-journal-text"></i> Notepad</a>
        <a class="${route().name === 'library' ? 'active' : ''}" href="#/library"><i class="bi bi-book"></i> Library</a>
        <a class="${route().name === 'messages' ? 'active' : ''}" href="#/messages"><i class="bi bi-chat-dots"></i> Messages</a>
        <a class="btn" href="#/notes"><i class="bi bi-pencil-square"></i> New Post</a>
      </nav>
    </header>
    <main class="wrap">${main}</main>
    ${appBar()}
    ${callLayer()}
    ${state.activeModalPost ? lightboxModal() : ""}
    ${state.shareDialogPost ? shareDialog() : ""}
    ${state.zoomedImage ? imageZoomModal() : ""}
    ${state.menu ? superMenu() : ""}
    ${state.reader ? reader() : ""}
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
  `;
}

function sectionOn(id) {
  const here = route().name;
  const fromComments = here === "comments" ? commentSection(route().id) : "";
  if (id === "home") return here === "home" || here === "recipe" || fromComments === "home";
  if (id === "library") return here === "library" || here === "world" || fromComments === "library";
  if (id === "notes") return here === "notes" || fromComments === "notes";
  if (id === "studio") return here === "studio" || fromComments === "studio";
  if (id === "shop") return here === "shop" && route().id !== "cart";
  if (id === "cart") return here === "shop" && route().id === "cart";
  if (id === "write") return here === "new" || here === "edit";
  return here === id;
}

function commentSection(type) {
  if (type === "world") return "library";
  if (type === "note") return "notes";
  if (type === "film") return "studio";
  return "home";
}

function appBar() {
  const menuOn = state.menu || ["family", "profile", "account", "privacy", "terms", "new", "edit", "search", "sound"].includes(route().name);
  const item = (href, icon, label, on) => `<a class="appbar-item ${on ? "active" : ""}" href="${href}" ${on ? 'aria-current="page"' : ""}><i class="bi ${icon}" aria-hidden="true"></i><span>${label}</span></a>`;
  return `<nav class="appbar" aria-label="Sections">
    ${item("#/", "bi-book", "Book", sectionOn("home"))}
    ${item("#/library", "bi-collection", "Library", sectionOn("library"))}
    <a class="appbar-item ${sectionOn("messages") ? "active" : ""}" href="#/messages" ${sectionOn("messages") ? 'aria-current="page"' : ""}><i class="bi bi-chat-dots" aria-hidden="true"></i><span>Messages</span><span class="ping" data-badge="messages" ${(state.unread || state.incoming) ? "" : "hidden"}></span></a>
    ${item("#/notes", "bi-journal-text", "Notepad", sectionOn("notes"))}
    ${item("#/studio", "bi-camera-reels", "Studio", sectionOn("studio"))}
    <a class="appbar-item ${sectionOn("shop") ? "active" : ""}" href="#/shop" ${sectionOn("shop") ? 'aria-current="page"' : ""}><i class="bi bi-bag" aria-hidden="true"></i><span>Shop</span></a>
    <a class="appbar-item ${sectionOn("cart") ? "active" : ""}" href="#/shop/cart" ${sectionOn("cart") ? 'aria-current="page"' : ""}><i class="bi bi-cart" aria-hidden="true"></i><span>Cart</span>${state.cart?.length ? `<b class="shop-badge">${state.cart.reduce((sum, line) => sum + Number(line.qty || 0), 0)}</b>` : ""}</a>
    <button class="appbar-item ${menuOn ? "active" : ""}" type="button" data-action="toggle-menu" aria-expanded="${state.menu ? "true" : "false"}" aria-controls="super-menu">
      <i class="bi bi-grid" aria-hidden="true"></i><span>Menu</span>
    </button>
  </nav>`;
}

function menuLink(href, icon, label, on) {
  return `<a class="menu-link ${on ? "on" : ""}" href="${href}"><i class="bi ${icon}" aria-hidden="true"></i><span>${label}</span></a>`;
}

function superMenu() {
  const user = state.user;
  const session = user
    ? `<div class="session">
        ${face(user)}
        <div>
          <p class="kicker">Signed in</p>
          <h3>${esc(user.name)}</h3>
          <p class="empty">${esc(user.email || "")}</p>
          ${user.bio ? `<p>${esc(user.bio)}</p>` : `<p class="empty">Your profile is ready.</p>`}
        </div>
      </div>`
    : `<div class="session">
        <span class="face-ph"><i class="bi bi-person" aria-hidden="true"></i></span>
        <div>
          <p class="kicker">This visit</p>
          <h3>Browsing as a guest</h3>
          <p class="empty">Log in to write recipes, leave notes, and see the family.</p>
        </div>
      </div>`;
  return `<div class="scrim ${state.menuFresh ? "fresh" : ""}" data-action="close-menu"></div>
    <section id="super-menu" class="sheet ${state.menuFresh ? "fresh" : ""}" role="dialog" aria-modal="true" aria-label="Menu">
      <div class="sheet-top">
        <span class="sheet-handle" aria-hidden="true"></span>
        <button class="btn quiet" type="button" data-action="close-menu">Close</button>
      </div>
      ${session}
      <p class="menu-label">The book</p>
      <div class="menu-list">
        ${menuLink("#/", "bi-book", "Book", sectionOn("home"))}
        ${menuLink("#/messages", "bi-chat-dots", "Messages", sectionOn("messages"))}
        ${menuLink("#/search", "bi-search", "Search", sectionOn("search"))}
        ${menuLink("#/library", "bi-collection", "Library", sectionOn("library"))}
        ${menuLink("#/notes", "bi-journal-text", "Notepad", sectionOn("notes"))}
        ${menuLink("#/studio", "bi-camera-reels", "Studio", sectionOn("studio"))}
        ${menuLink("#/shop", "bi-bag", "Shop", sectionOn("shop"))}
        ${menuLink("#/shop/cart", "bi-cart", state.cart?.length ? `Cart (${state.cart.reduce((sum, line) => sum + Number(line.qty || 0), 0)})` : "Cart", sectionOn("cart"))}
        ${menuLink("#/family", "bi-people", "Family", sectionOn("family"))}
        ${menuLink("#/new", "bi-plus-circle", "Write a recipe", sectionOn("write"))}
      </div>
      <p class="menu-label">Account</p>
      <div class="menu-list">
        ${menuLink("#/sound", "bi-bell", "Call sound", sectionOn("sound"))}
        ${user ? menuLink("#/profile", "bi-person-circle", "Profile", sectionOn("profile")) : menuLink("#/account", "bi-box-arrow-in-right", "Log in", sectionOn("account"))}
        ${user ? `<button class="menu-link" type="button" data-action="sign-out"><i class="bi bi-box-arrow-right" aria-hidden="true"></i><span>Log out</span></button>` : ""}
      </div>
      <p class="menu-label">About this book</p>
      <div class="menu-list">
        ${menuLink("#/privacy", "bi-shield-check", "Privacy", sectionOn("privacy"))}
        ${menuLink("#/terms", "bi-file-earmark-text", "Terms of use", sectionOn("terms"))}
      </div>
    </section>`;
}

function soundView() {
  const chosen = state.ringerName || "The book's ring";
  return shell(`
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Call sound</span></nav>
    <h2 class="page-title">Call sound</h2>
    <p>Two sounds can play when someone calls. They belong to this book only. Your other apps keep their own sounds.</p>
    <section class="panel">
      <h3>While the book is open</h3>
      <p>The current sound is ${esc(chosen)}.</p>
      <div class="field"><label>Choose a sound file<input id="ringer-file" type="file" accept="audio/*"></label></div>
      <div class="actions">
        <button class="btn" type="button" data-action="preview-ringer">Play</button>
        <button class="btn quiet" type="button" data-action="clear-ringer">Use the book's ring</button>
      </div>
    </section>
    <section class="panel">
      <h3>The loud notification</h3>
      <p>That banner uses the sound set for this app on the phone. On the Razr, open Settings, then Apps, then Lisa's Recipe Book. Open Notifications, then Sound, and choose the tone you want.</p>
      <p>If the book is still open in Chrome, the path is Settings, Apps, Chrome, Notifications, then this book’s site, then Sound.</p>
    </section>
  `);
}

function privacyView() {
  return shell(`
    <h2 class="page-title">Privacy</h2>
    <p>Lisa's Recipe Book is a kitchen, a family board, and a small shop. Anyone can open it, and anyone can make a profile.</p>
    <section class="panel legal">
      <h3>How the book works</h3>
      <p>The Book is the home page. It shows recipes, and notes from people who have a profile. The Library holds more plates. The Shop is for meals, desserts, dog treats, spices, and a Lubbock or Wolfforth errand. Messages, the Notepad, and the Studio open after you log in.</p>
      <h3>Create a profile</h3>
      <p>Open Menu, then Log in. In the box marked First time here, type your name, your email, and a password of at least 8 characters. Tap Create account. That profile is yours.</p>
      <p>You do not need an invitation. If that email already has a profile, log in with it. From Profile you can add a short line about yourself and a portrait.</p>
      <p>With a profile you can write a recipe, leave a note, comment, like, star, follow someone, send a message, and place a call.</p>
      <h3>Without a profile</h3>
      <p>A guest can read the recipes and use the shop. Sending an order does not require an account. Notes, comments, messages, calls, and the family list ask you to log in.</p>
      <h3>What a profile keeps</h3>
      <p>A profile holds a name, an email, and a password. The password is stored as a code, not as the words you type. A portrait and a short line about you are optional.</p>
      <p>The book also keeps the recipes, notes, pictures, films, comments, likes, and stars you add, and who follows whom. Your login stays on this phone until you log out or clear the site data.</p>
      <h3>The shop</h3>
      <p>An order keeps the name, phone, street, city, and ZIP you type, plus the items and any special note. A copy of that order is sent through Telegram so the kitchen can fill it. The cart stays on this phone until you send the order or clear the site data.</p>
      <p>Pay with Cash App. The book does not keep a card number. Cash App handles that payment under its own rules. The price on a custom errand is the runner's trip. The store price is separate.</p>
      <h3>Who can see it</h3>
      <p>People with a profile see the same recipes, notes, and films. A message is only for the two people in that conversation. A call rings the other phone until they answer, decline, or the ring ends. The book does not record the call. Active means that person has the book open.</p>
      <h3>What we do not do</h3>
      <p>We do not sell this information, and the book does not show ads. A portrait you paste from a link is loaded from that address. A YouTube film plays from YouTube, under YouTube's own rules.</p>
      <h3>Where it lives</h3>
      <p>The book is hosted on Cloudflare. Open Profile to change your name, your line about yourself, or your portrait. Log out on a shared phone. If you want a profile taken off the book, ask the person who set it up.</p>
    </section>
  `);
}

function termsView() {
  return shell(`
    <h2 class="page-title">Terms of use</h2>
    <p>Use the book the way you would use a family kitchen: share what you mean to share, and be kind.</p>
    <section class="panel legal">
      <h3>A family book</h3>
      <p>Recipes, notes, pictures, and films you add are for everyone with an account. Write what is yours to share. Leave out passwords, private messages, and pictures someone did not want here.</p>
      <h3>Kitchen notes, not medical advice</h3>
      <p>The recipes are cooking help. Baby food, toddler snacks, and dog meals are starting ideas for the kitchen. Ask a doctor before a baby's food changes, and ask a vet before a dog's food changes. A dog meal on this book is not a commercial dog-food formula. Low-acid vegetables, such as green beans, need a pressure canner. A boiling-water bath is not enough for those jars.</p>
      <h3>Films and outside pages</h3>
      <p>A saved YouTube link is a bookmark. The film still belongs to the person who made it. Recipe pages opened from another site stay with that site.</p>
      <h3>Keeping the table pleasant</h3>
      <p>Notes, comments, and messages should be fit for the whole family, including Lisa. A call is for someone who can answer. Something that does not belong in a family book can be taken down.</p>
    </section>
  `);
}

function installCard(mode) {
  const ios = mode === "ios";
  const ready = mode === "ready";
  const kicker = ios ? "On iPhone" : ready ? "On this phone" : "On this device";
  const title = ready ? "Install Lisa's book" : "Add Lisa's book";
  const copy = ios
    ? "Tap the Share button, then Add to Home Screen. The pink ribbon will sit with your apps, and the kitchen timer can keep its place."
    : ready
      ? "Put the book on your home screen. It opens like an app, dressed in pink and gold, and the timer keeps counting when the phone is locked."
      : "Open the browser menu and choose Install app or Add to Home Screen. Look for the pink ribbon.";
  const install = ready ? `<button class="btn gold" type="button" data-action="install-app">Install</button>` : "";
  return `<div class="install-modal" id="install-modal" data-mode="${mode}" role="dialog" aria-labelledby="install-title">
    <div class="install-card">
      <img class="install-mark" src="/icons/icon-192.png" alt="">
      <p class="kicker">${kicker}</p>
      <h2 id="install-title">${title}</h2>
      <p>${copy}</p>
      <div class="actions">${install}<button class="btn quiet" type="button" data-action="dismiss-install">Not now</button></div>
    </div>
  </div>`;
}

function paintInstall() {
  const hidden = !state.showInstall || installedAlready() || localStorage.getItem("lisa-install-hide");
  const modal = document.getElementById("install-modal");
  if (hidden) {
    if (modal && !modal.classList.contains("leaving")) {
      modal.classList.add("leaving");
      setTimeout(() => modal.remove(), 340);
    }
    return;
  }
  if (modal?.dataset.mode === state.showInstall && !modal.classList.contains("leaving")) return;
  modal?.remove();
  document.body.insertAdjacentHTML("beforeend", installCard(state.showInstall));
}

function matchingRecipes() {
  const q = state.q.trim().toLowerCase();
  return state.recipes.filter((recipe) => {
    if (!matchesChip(recipe)) return false;
    if (!q) return true;
    const blob = [recipe.title, recipe.summary, recipe.category, recipe.notes, ...(recipe.ingredients || []), ...(recipe.steps || [])].join(" ").toLowerCase();
    return blob.includes(q);
  });
}

function reactionTarget(item) {
  const source = String(item.sourceUrl || "");
  const fromSource = source.match(/themealdb\.com\/meal\/(\d+)/);
  const mealId = fromSource?.[1] || (item.world ? String(item.mealId || item.id || "").replace(/^mealdb-/, "") : "");
  if (mealId && /^\d+$/.test(mealId)) return { type: "world", id: `mealdb-${mealId}` };
  return { type: "recipe", id: String(item.id) };
}

function recipeCardResponsive(recipe) {
  const target = reactionTarget(recipe);
  const social = recipe.social || { likes: 0, stars: 0, liked: false, starred: false, comments: [] };
  const totalMins = (Number(recipe.prepMinutes) || 0) + (Number(recipe.cookMinutes) || 0);
  const timeText = totalMins > 0 ? clock(totalMins) : "Family Classic";
  const ingCount = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;

  return `
    <article class="card responsive-plate-card">
      <a class="card-link" href="#/recipe/${recipe.id}">
        ${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="${esc(recipe.title)}" loading="lazy" decoding="async">` : `<div class="ph"></div>`}
        <div class="card-content-block">
          <div class="kicker">
            <span>${esc(cuisineLabel(recipe.cuisine))}</span> · <span>${esc(recipe.category)}</span>
            ${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}
          </div>
          <h2>${esc(recipe.title)}</h2>
          <p>${esc(recipe.summary)}</p>
          <div class="meta" style="margin-top:10px">
            <span><i class="bi bi-clock"></i> ${timeText}</span>
            <span><i class="bi bi-basket"></i> ${ingCount} items</span>
            ${social.likes ? `<span><i class="bi bi-heart-fill heart-glow"></i> ${social.likes}</span>` : ""}
          </div>
        </div>
      </a>
      <div class="card-actions" style="padding:0 16px 14px">
        ${linkTools(recipeLink(recipe), recipe.title)}
        ${reactBar(target.type, target.id, recipe.social, ["like"])}
      </div>
    </article>
  `;
}

function feedStream(notes, recipes) {
  const noteLimit = state.homeNotes || 3;
  const plateLimit = state.homePlates || 6;
  const shownNotes = notes.slice(0, noteLimit);
  const shownPlates = recipes.slice(0, plateLimit);
  const parts = [];
  const lead = shownPlates.slice(0, Math.min(4, shownPlates.length));
  let plateIndex = lead.length;
  if (lead.length) {
    parts.push(`<div class="feed-plate-rail" aria-label="Recipes">${lead.map(recipeCardResponsive).join("")}</div>`);
  }
  let noteIndex = 0;
  while (noteIndex < shownNotes.length || plateIndex < shownPlates.length) {
    const noteChunk = shownNotes.slice(noteIndex, noteIndex + 3);
    noteIndex += noteChunk.length;
    if (noteChunk.length) parts.push(noteChunk.map(socialPostCard).join(""));
    const plateChunk = shownPlates.slice(plateIndex, plateIndex + 2);
    plateIndex += plateChunk.length;
    if (plateChunk.length) parts.push(`<div class="feed-plate-stack">${plateChunk.map(recipeCardResponsive).join("")}</div>`);
    if (!noteChunk.length && !plateChunk.length) break;
  }
  if (!parts.length) return `<p class="empty">No family posts yet. Share a note when you are ready.</p>`;
  const more = notes.length > shownNotes.length || recipes.length > shownPlates.length;
  if (more) parts.push(`<button class="btn quiet feed-more" type="button" data-action="more-feed">Load more</button>`);
  return parts.join("");
}

function home() {
  const list = matchingRecipes();
  const notes = state.notes || [];
  const outside = Boolean(state.q.trim()) && !list.length;
  const isAllOrPosts = state.feedFilter !== "recipes-only";
  const showGallery = !isAllOrPosts || Boolean(state.q.trim()) || state.cuisine !== "all";

  return shell(`
    <section class="birthday-hero-banner">
      <div class="birthday-hero-content">
        <div class="birthday-sparkle">Cajun & Texas</div>
        <h1 class="birthday-title">A table with your name on it</h1>
        <p class="birthday-desc">
          Your plates from the bayou and the Hill Country, with the family's notes and pictures in the same book.
        </p>
        <div class="birthday-quick-actions">
          <a class="birthday-cta-btn" href="#/notes"><i class="bi bi-pencil-square"></i> Share a note</a>
          <a class="birthday-cta-btn quiet" href="#/new"><i class="bi bi-plus-circle"></i> Add a recipe</a>
          <a class="birthday-cta-btn quiet" href="#/library"><i class="bi bi-collection"></i> Open the library</a>
        </div>
      </div>
    </section>

    <!-- Social Feed Section -->
    <div class="social-feed-container">
      <!-- Facebook-Style Post Creator -->
      ${facebookComposer()}

      <!-- Feed Filter Tabs -->
      <div class="feed-filter-bar">
        <div class="feed-tabs-group">
          <button type="button" class="feed-tab-btn ${isAllOrPosts ? 'active' : ''}" data-action="filter-feed" data-filter="all">
            <i class="bi bi-collection-play"></i> Family Posts (${notes.length})
          </button>
          <button type="button" class="feed-tab-btn ${state.feedFilter === 'recipes-only' ? 'active' : ''}" data-action="filter-feed" data-filter="recipes-only">
            <i class="bi bi-book"></i> Recipe Collection (${list.length})
          </button>
        </div>
      </div>

      <!-- Feed Posts Stream -->
      ${isAllOrPosts ? `
        <div class="social-stream-wrap">
          ${feedStream(notes, list)}
        </div>
      ` : ""}
    </div>

    <!-- Recipe Gallery Section (generous, responsive cards) -->
    <section class="recipes-main-section">
      <div class="section-heading-bar">
        <div>
          <span class="eyebrow">Hand-Crafted Collection</span>
          <h2 class="section-title">Cajun & Texas Kitchen Favorites</h2>
        </div>
        <div class="recipe-count-badge">${list.length} family plates</div>
      </div>

      <div class="toolbar-search-row">
        <div class="search-input-wrap">
          <i class="bi bi-search"></i>
          <input id="q" placeholder="Search recipes (e.g. Gumbo, Ribeye, Cobbler)…" value="${esc(state.q)}">
        </div>
        <div class="cuisine-chips-scroll">
          ${[["all", "All"], ["cajun", "Cajun"], ["texas", "Texas"], ["texmex", "Tex-Mex"], ["stews", "Stews"], ["breakfast", "Breakfast"], ["sweets", "Sweets"], ["gym", "Gym Plates"], ["kids", "Kids"], ["pets", "Pet Connection"]].map(([item, label]) => `
            <button type="button" class="chip ${state.cuisine === item ? "active" : ""}" data-cuisine="${item}">${label}</button>
          `).join("")}
        </div>
      </div>

      ${outside && state.bookHitNote ? `<p class="empty">${esc(state.bookHitNote)}</p>` : ""}

      ${showGallery ? `<div class="responsive-recipe-grid">
        ${outside
          ? (state.bookHits.length ? state.bookHits.map(worldCard).join("") : (state.bookHitNote && !state.bookHitLoading ? "" : `<p class="empty">Looking through the open library…</p>`))
          : (list.map(recipeCardResponsive).join("") || `<p class="empty">${state.cuisine === "library" ? "Nothing kept from the library yet. Browse below and keep a plate." : "Nothing matches that search."}</p>`)}
      </div>` : `<p class="empty">The plates are in the feed above. Search here, or open Recipe Collection, to see every one.</p>`}
    </section>

    <!-- Open Library Showcase -->
    <section class="library-band" style="margin-top:40px">
      <div class="band-head">
        <div>
          <p class="kicker">Open library</p>
          <h2>More plates, in the same book.</h2>
        </div>
        <a class="btn" href="#/library">See the whole library</a>
      </div>
      <div class="responsive-recipe-grid">
        ${state.featured.slice(0, 4).map(worldCard).join("") || `<p class="empty">${esc(state.shelfError || "The library is on its way.")}</p>`}
      </div>
    </section>
  `);
}

const filmPosters = new Map();

function paintFilmCovers() {
  document.querySelectorAll(".film-card").forEach((card) => {
    const src = card.dataset.src;
    const img = card.querySelector(".film-poster");
    if (!src || !img || card.dataset.painting === "1") return;
    if (filmPosters.has(src)) {
      img.src = filmPosters.get(src);
      img.hidden = false;
      return;
    }
    card.dataset.painting = "1";
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    probe.playsInline = true;
    probe.src = src;
    const finish = () => {
      card.dataset.painting = "";
      try {
        if (!probe.videoWidth) return;
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 640 / probe.videoWidth);
        canvas.width = Math.max(1, Math.round(probe.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(probe.videoHeight * scale));
        canvas.getContext("2d").drawImage(probe, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL("image/jpeg", 0.74);
        filmPosters.set(src, url);
        if (img.isConnected) {
          img.src = url;
          img.hidden = false;
        }
      } catch { /* the play button stays up */ }
      probe.removeAttribute("src");
      probe.load();
    };
    probe.addEventListener("loadeddata", () => {
      const mark = Number.isFinite(probe.duration) ? Math.min(0.4, probe.duration / 8) : 0.1;
      if (mark > 0) {
        try { probe.currentTime = mark; return; } catch { /* draw the first frame */ }
      }
      finish();
    }, { once: true });
    probe.addEventListener("seeked", finish, { once: true });
    probe.addEventListener("error", () => { card.dataset.painting = ""; }, { once: true });
  });
}

function filmCover(src) {
  const safe = esc(src);
  return `<div class="film-card" data-src="${safe}">
    <button type="button" class="film-open" data-action="play-film" aria-label="Play video">
      <img class="film-poster" alt="" hidden>
      <span class="film-play" aria-hidden="true"></span>
    </button>
    <video src="${safe}" controls playsinline preload="none" hidden></video>
  </div>`;
}

function familyFeed() {
  const notes = state.user ? (state.notes || []) : [];
  if (!notes.length) return "";
  if (notes.length <= 6) {
    return `<section class="news-feed">
      ${storyRow("Latest", notes.map(noteStory))}
      <div class="news-stack">${notes.map((note) => notePost(note)).join("")}</div>
    </section>`;
  }
  const parts = [];
  let index = 0;
  let rail = true;
  while (index < notes.length) {
    const left = notes.length - index;
    if (rail) {
      const take = left <= 4 ? left : Math.min(8, left - 3);
      parts.push(storyRow(parts.length ? "More from the family" : "Latest", notes.slice(index, index + take).map(noteStory)));
      index += take;
    } else {
      const take = Math.min(4, left);
      parts.push(`<div class="news-stack">${notes.slice(index, index + take).map((note) => notePost(note)).join("")}</div>`);
      index += take;
    }
    rail = !rail;
  }
  return `<section class="news-feed">${parts.join("")}</section>`;
}

function storyRow(title, cards) {
  if (!cards.length) return "";
  return `<div class="news-block">
    <h2 class="news-label">${esc(title)}</h2>
    <div class="story-rail">${cards.join("")}</div>
  </div>`;
}

function noteStory(note) {
  const files = Array.isArray(note.attachments) ? note.attachments : [];
  const image = files.find((item) => item.kind === "image");
  const video = files.find((item) => item.kind === "video");
  const media = image
    ? `<button type="button" class="story-hit" data-action="jump-note" data-id="${esc(note.id)}"><img src="${esc(asset(image.path))}" alt="" loading="lazy" decoding="async"></button>`
    : (video ? filmCover(asset(video.path)) : `<button type="button" class="story-hit story-ph" data-action="jump-note" data-id="${esc(note.id)}">${esc((note.author?.name || "N").trim().slice(0, 1) || "N")}</button>`);
  const title = String(note.body || note.title || "A note").replace(/\s+/g, " ").trim().slice(0, 72);
  return `<article class="story-card">
    <div class="story-media">${media}</div>
    <button type="button" class="story-caption" data-action="jump-note" data-id="${esc(note.id)}">${esc(title)}</button>
  </article>`;
}

function recipeStory(recipe) {
  return `<a class="story-card" href="#/recipe/${esc(recipe.id)}">
    ${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="" loading="lazy" decoding="async">` : `<span class="story-ph">${esc(recipe.title.slice(0, 1))}</span>`}
    <span class="story-caption">${esc(recipe.title)}</span>
  </a>`;
}

function plateBand(kicker, title, recipes, limit = 4, layout = "stack") {
  const shown = recipes.slice(0, limit);
  if (!shown.length) return "";
  const body = layout === "rail"
    ? `<div class="story-rail">${shown.map(recipeStory).join("")}</div>`
    : `<div class="plate-stack">${shown.map(card).join("")}</div>`;
  return `<section class="news-block">
    <h2 class="news-label">${esc(kicker)}</h2>
    ${body}
  </section>`;
}

function stapleBands() {
  const plates = state.recipes;
  const bands = [
    ["The Gym", "Protein plates for Benito and anyone who trains.", plates.filter((recipe) => recipe.cuisine === "gym"), 8],
    ["Texas", "The Texas table.", plates.filter((recipe) => recipe.cuisine === "texas" && recipe.category === "Mains"), 4],
    ["Breakfast", "Morning plates.", plates.filter((recipe) => recipe.category === "Breakfast"), 8],
    ["Tex-Mex", "Tex-Mex, on this table.", plates.filter((recipe) => recipe.cuisine === "texmex" && recipe.category === "Mains"), 4],
    ["Sweets", "Cobblers, fudge, and fried ice cream.", plates.filter((recipe) => recipe.category === "Sweets"), 8],
    ["From the garden", "Pulled, washed, pickled, and canned.", plates.filter((recipe) => recipe.cuisine === "garden"), 4],
    ["The pot", "Pot roasts and homemade stews.", plates.filter((recipe) => /stew|pot roast/i.test(recipe.title)), 6],
    ["Little ones", "Soft fruit for babies. Fruit, yogurt, and oats for toddlers.", plates.filter((recipe) => recipe.cuisine === "kids"), 4],
    ["The Pet Connection", "Cooked meals. Meat, liver, vegetables, and eggshell.", plates.filter((recipe) => recipe.cuisine === "pets" && recipe.category === "Meals"), 8],
    ["Dog treats", "Treats. Not the whole supper.", plates.filter((recipe) => recipe.cuisine === "pets" && recipe.category !== "Meals"), 4]
  ];
  return bands.map((band, index) => plateBand(band[0], band[1], band[2], band[3], index % 2 === 0 ? "rail" : "stack")).join("");
}

function worldCard(meal) {
  const mealId = String(meal.id || "").replace(/^mealdb-/, "");
  const kept = state.recipes.find((item) => String(item.sourceUrl || "").includes(`/meal/${mealId}`));
  const add = kept
    ? `<a class="btn quiet" href="#/recipe/${esc(kept.id)}">Open in the book</a>`
    : (state.user
      ? `<button class="btn" type="button" data-action="keep-recipe" data-id="${esc(mealId)}">Add to the book</button>`
      : `<a class="btn" href="#/account">Log in to add</a>`);
  return `<article class="card">
    <a class="card-link" href="#/world/${esc(mealId)}">
      ${meal.image ? `<img src="${esc(meal.image)}" alt="${esc(meal.title)}">` : `<div class="ph"></div>`}
      <div>
        <div class="kicker">Library${meal.category ? ` · ${esc(meal.category)}` : ""}${meal.area ? ` · ${esc(meal.area)}` : ""}</div>
        <h2>${esc(meal.title)}</h2>
        <p>From the open library.</p>
        ${commentCount(meal.social)}
      </div>
    </a>
    <div class="card-actions">${add}${linkTools(pageLink(`#/world/${mealId}`), meal.title)}${reactBar("world", `mealdb-${mealId}`, meal.social, false)}</div>
  </article>`;
}

function card(recipe) {
  const target = reactionTarget(recipe);
  return `<article class="card">
    <a class="card-link" href="#/recipe/${recipe.id}">
      ${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="${esc(recipe.title)}" loading="lazy" decoding="async">` : `<div class="ph"></div>`}
      <div>
        <div class="kicker">${esc(cuisineLabel(recipe.cuisine))} · ${esc(recipe.category)}${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}</div>
        <h2>${esc(recipe.title)}</h2>
        <p>${esc(recipe.summary)}</p>
        ${commentCount(recipe.social)}
        ${recipe.author ? `<p class="empty">From ${esc(recipe.author.name)}</p>` : ""}
      </div>
    </a>
    <div class="card-actions">${linkTools(recipeLink(recipe), recipe.title)}${reactBar(target.type, target.id, recipe.social, false)}</div>
  </article>`;
}

function recipeView(recipe) {
  const shareText = `${recipe.title} from Lisa's Recipe Book`;
  const link = recipeLink(recipe);
  const kept = recipe.world ? state.recipes.find((item) => item.sourceUrl === recipe.sourceUrl) : null;
  const credit = recipe.imageCredit || "Photograph for Lisa's Recipe Book";
  return shell(`
    <div class="recipe-view-header-bar">
      <a class="recipe-back-btn" href="#/">
        <i class="bi bi-arrow-left"></i>
        <span>Back to Recipes & Feed</span>
      </a>
      <div class="recipe-badges-row">
        <span class="recipe-badge-cuisine">${esc(cuisineLabel(recipe.cuisine))}</span>
        <span class="recipe-badge-cat">${esc(recipe.category)}</span>
        ${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}
      </div>
    </div>

    <article class="recipe">
      <div>
        <div class="plate recipe-plate-zoomable" data-action="zoom-recipe-image" data-src="${esc(asset(recipe.image))}" data-title="${esc(recipe.title)}" data-credit="${esc(credit)}" title="Click to view full photo">
          ${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="${esc(recipe.title)}">` : ""}
          <div class="plate-zoom-hint"><i class="bi bi-arrows-fullscreen"></i> Tap photo to zoom</div>
        </div>
        <p class="credit clickable-credit" data-action="zoom-recipe-image" data-src="${esc(asset(recipe.image))}" data-title="${esc(recipe.title)}" data-credit="${esc(credit)}" title="Click to view full photo">
          <i class="bi bi-camera-fill"></i> ${esc(credit)}
        </p>
        <div class="gallery">
          ${(recipe.media || []).map((item) => `<figure>
            ${item.kind === "video" ? `<video src="${esc(asset(item.path))}" controls></video>` : `<img src="${esc(asset(item.path))}" alt="${esc(item.caption || recipe.title)}">`}
            ${state.user ? `<button class="btn quiet" data-action="delete-media" data-id="${recipe.id}" data-media="${item.id}">Remove</button>` : ""}
          </figure>`).join("")}
        </div>
      </div>
      <div>
        <p class="kicker">${recipe.world ? "Library" : esc(cuisineLabel(recipe.cuisine))} · ${esc(recipe.category)}${recipe.author ? ` · ${esc(recipe.author.name)}` : ""}${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}</p>
        <h2 class="page-title" style="font-size:clamp(36px,5vw,58px)">${esc(recipe.title)}</h2>
        <p>${esc(recipe.summary)}</p>
        ${recipe.cuisine === "pets" && recipe.category === "Meals" ? `<p class="empty">A cooked meal: meat, a little liver, vegetables, and ground eggshell. Leave out the eggshell and it is not a meal. Ask the vet for the daily amount. A veterinary nutritionist can write a diet for one dog.</p>` : ""}
        ${recipe.cuisine === "pets" && recipe.category !== "Meals" ? `<p class="empty">A treat for the dog, not the whole supper. Ask the vet before a dog's food changes. Never use xylitol, chocolate, grapes, raisins, onion, or garlic.</p>` : ""}
        ${recipe.category === "Babies" ? `<p class="empty">For a baby who is already eating smooth food. No honey before the first birthday. Ask the baby's doctor before a new food.</p>` : ""}
        ${recipe.category === "Toddlers" ? `<p class="empty">Soft pieces for a toddler. Cut fruit small. These are snacks of fruit, yogurt, and oats, not a meal plan.</p>` : ""}
        ${recipe.cuisine === "gym" ? `<p class="empty">A plate of meat, fish, eggs, or beans for a training day. This is food from the kitchen, not a vitamin plan.</p>` : ""}
        <div class="meta">
          <span>Serves ${esc(recipe.yieldText)}</span>
          ${recipe.prepMinutes ? `<span>Prep ${clock(recipe.prepMinutes)}</span>` : ""}
          ${recipe.cookMinutes ? `<span>Cook ${clock(recipe.cookMinutes)}</span>` : ""}
          ${recipe.area ? `<span>${esc(recipe.area)}</span>` : ""}
        </div>
        <div class="actions no-print">
          <button class="btn" data-action="print">Print</button>
          <button class="btn moss" data-action="share" data-title="${esc(shareText)}" data-url="${esc(link)}">Share</button>
          <button class="btn quiet" data-action="copy" data-text="${esc(`${shareText}\n${link}`)}">Copy link</button>
          <button class="btn quiet" data-action="send-link" data-url="${esc(link)}" data-title="${esc(recipe.title)}">Send in a message</button>
          <a class="btn quiet" href="sms:?&body=${encodeURIComponent(`${shareText} ${link}`)}">Text</a>
          <a class="btn quiet" href="mailto:?subject=${encodeURIComponent(recipe.title)}&body=${encodeURIComponent(`${recipe.summary}\n\n${link}`)}">Email</a>
          ${recipe.world
            ? (kept
              ? `<a class="btn" href="#/recipe/${kept.id}">Open in your book</a>`
              : (state.user
                ? `<button class="btn" data-action="keep-recipe" data-id="${esc(recipe.mealId)}">Keep in the book</button>`
                : `<a class="btn" href="#/account">Log in to keep this</a>`))
            : (state.user
              ? ((!recipe.author || String(recipe.author.id) === String(state.user.id))
                ? `<a class="btn quiet" href="#/edit/${recipe.id}">Edit</a><button class="btn danger" data-action="delete-recipe" data-id="${recipe.id}">Delete</button>`
                : "")
              : `<a class="btn quiet" href="#/account">Log in to edit</a>`)}
        </div>
        <div class="share-box no-print timer">
          <strong id="timer-readout">${timerText()}</strong>
          <input id="timer-min" type="number" min="1" max="240" placeholder="Min" style="width:80px">
          <button class="btn moss" data-action="timer-start">${timer.running ? "Pause" : "Start"}</button>
          <button class="btn quiet" data-action="timer-reset">Reset</button>
        </div>
        ${youtubeId(recipe.youtube) ? `<div class="watch"><iframe src="https://www.youtube-nocookie.com/embed/${esc(youtubeId(recipe.youtube))}?rel=0&playsinline=1" title="${esc(recipe.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>` : ""}
        ${reactBar(reactionTarget(recipe).type, reactionTarget(recipe).id, recipe.social)}
        ${commentsBlock(reactionTarget(recipe).type, reactionTarget(recipe).id, recipe.social)}
        <h3>Ingredients</h3>
        <ul>${(recipe.ingredients || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        <h3>Method</h3>
        <ol>${(recipe.steps || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ol>
        ${recipe.notes ? `<h3>Notes</h3><p>${esc(recipe.notes)}</p>` : ""}
        ${recipe.sourceUrl && !mealDbPage(recipe.sourceUrl) ? `<p class="no-print"><button class="btn-line" data-action="open-source" data-url="${esc(recipe.sourceUrl)}" data-title="${esc(recipe.sourceTitle || "Source")}">Open “${esc(recipe.sourceTitle || "source")}” in the book</button></p>` : ""}
        ${state.user && !recipe.world ? `<form class="no-print" id="media-form">
          <div class="field"><label>Add a picture or video<input type="file" name="file" accept="image/*,video/mp4,video/webm" required></label></div>
          <button class="btn moss" type="submit">Add to this recipe</button>
        </form>` : ""}
      </div>
    </article>
  `);
}

function editor(recipe) {
  const value = recipe || { cuisine: "texas", category: "Mains", ingredients: [], steps: [], sourceUrl: "", sourceTitle: "", notes: "", summary: "", yieldText: "", prepMinutes: 15, cookMinutes: 30, title: "" };
  return shell(`
    <h2 class="page-title">${recipe ? "Edit recipe" : "New recipe"}</h2>
    <form id="recipe-form" class="panel">
      <div class="field"><label>Title<input name="title" required value="${esc(value.title)}"></label></div>
      <div class="split">
        <div class="field"><label>Table<select name="cuisine">${[["texas", "Texas"], ["texmex", "Tex-Mex"], ["gym", "The Gym"], ["garden", "Garden"], ["kids", "Little ones"], ["pets", "The Pet Connection"], ["cajun", "Cajun"], ["library", "Library"]].map(([id, label]) => `<option value="${id}" ${value.cuisine === id ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
        <div class="field"><label>Kind<select name="category">${["Mains", "Sides", "Breakfast", "Sweets", "Drinks", "Garden", "Babies", "Toddlers", "Meals", "Pets"].map((item) => `<option ${value.category === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div>
      </div>
      <div class="field"><label>A short introduction<textarea name="summary">${esc(value.summary)}</textarea></label></div>
      <div class="split">
        <div class="field"><label>Yield<input name="yieldText" value="${esc(value.yieldText)}"></label></div>
        <div class="field"><label>Prep minutes<input name="prepMinutes" type="number" value="${esc(value.prepMinutes)}"></label></div>
        <div class="field"><label>Cook minutes<input name="cookMinutes" type="number" value="${esc(value.cookMinutes)}"></label></div>
      </div>
      <div class="field"><label>Ingredients, one per line<textarea name="ingredients" required>${esc(value.ingredients.join("\n"))}</textarea></label></div>
      <div class="field"><label>Steps, one per line<textarea name="steps" required>${esc(value.steps.join("\n"))}</textarea></label></div>
      <div class="field"><label>Kitchen notes<textarea name="notes">${esc(value.notes)}</textarea></label></div>
      <div class="split">
        <div class="field"><label>Source title<input name="sourceTitle" value="${esc(value.sourceTitle)}"></label></div>
        <div class="field"><label>Source link<input name="sourceUrl" value="${esc(value.sourceUrl)}" placeholder="https://"></label></div>
      </div>
      <button class="btn" type="submit">Save recipe</button>
    </form>
  `);
}

function libraryView() {
  return shell(`
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">TheMealDB</p>
        <h2 class="page-title">The open library.</h2>
        <p>Hundreds of recipes from the open library, ready to print, share, and keep next to the Cajun and Texas plates.</p>
      </div>
    </section>
    <form id="shelf-form" class="toolbar">
      <input id="shelf-q" name="q" placeholder="Search the library" value="${esc(state.shelfQ)}">
      <button class="btn" type="submit">Search</button>
      <span class="empty">${state.shelfLoading ? "Looking…" : `${state.shelf.length} plates`}</span>
    </form>
    <div class="toolbar">
      ${state.shelfCategories.map((item) => `<button type="button" class="chip ${!state.shelfQ && state.shelfCategory === item ? "active" : ""}" data-shelf="${esc(item)}">${esc(item)}</button>`).join("")}
    </div>
    ${state.shelfNotice ? `<p class="empty">${esc(state.shelfNotice)}</p>` : ""}
    ${state.shelfError ? `<p class="empty">${esc(state.shelfError)}</p>` : ""}
    <section class="grid">
      ${state.shelf.map(worldCard).join("") || (state.shelfLoading ? "" : `<p class="empty">Looking through the open library…</p>`)}
    </section>
  `);
}

function facebookComposer() {
  const user = state.user;
  const picks = state.noteFiles.map((item) => `
    <div class="composer-pick-item">
      ${item.kind === "image" ? `<img src="${esc(item.url)}" alt="">` : item.kind === "video" ? `<video src="${esc(item.url)}" muted></video>` : `<span class="file-icon"><i class="bi bi-file-earmark-text"></i></span>`}
      <span class="pick-filename">${esc(item.name)}</span>
      <button type="button" class="pick-remove-btn" data-action="drop-file" data-id="${esc(item.id)}" aria-label="Remove ${esc(item.name)}">×</button>
    </div>
  `).join("");

  return `
    <div class="facebook-composer-card">
      <div class="composer-card-header">
        <span class="composer-pill-label">Family notes</span>
        <span class="composer-sub-label">Share a recipe, a photo, or a picture from the kitchen</span>
      </div>

      <form id="note-form" class="facebook-composer-form">
        <div class="composer-input-row">
          ${user ? face(user) : `<span class="face-ph" aria-hidden="true">F</span>`}
          <div class="composer-fields">
            <input type="text" name="title" id="note-title" placeholder="Title (e.g. Grandma's Secret Peach Cobbler)…" class="composer-title-input" value="${esc(state.noteTitleDraft || '')}">
            <textarea id="note-body" name="body" rows="3" placeholder="Share a note with the family…" class="composer-textarea">${esc(state.noteDraft)}</textarea>
          </div>
        </div>

        ${picks ? `<div class="composer-picks-tray">${picks}</div>` : ""}

        <div class="composer-action-bar">
          <div class="composer-tools-list">
            <label class="fb-tool-btn photo" title="Add photos">
              <i class="bi bi-images"></i>
              <span>Photo</span>
              <input data-note-pick="image" type="file" accept="image/*" multiple hidden>
            </label>
            <label class="fb-tool-btn video" title="Add video">
              <i class="bi bi-camera-reels"></i>
              <span>Video</span>
              <input data-note-pick="video" type="file" accept="video/*,.mov,.mp4,.m4v,.webm" hidden>
            </label>
            <label class="fb-tool-btn doc" title="Add document or recipe PDF">
              <i class="bi bi-file-earmark-pdf"></i>
              <span>Recipe Doc</span>
              <input data-note-pick="file" type="file" accept="application/pdf,text/plain,.pdf,.txt" multiple hidden>
            </label>
          </div>

          <div class="composer-submit-wrap">
            ${state.editingNote ? `<button class="btn quiet" type="button" data-action="cancel-note">Cancel</button>` : ""}
            <button class="composer-post-btn" type="submit" data-action="post-note" ${state.notePosting ? "disabled" : ""}>
              ${state.notePosting ? `<i class="bi bi-hourglass-split"></i> Posting…` : (state.editingNote ? "Save Changes" : `<i class="bi bi-send-fill"></i> Post`)}
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
}

function socialPostCard(note) {
  const files = Array.isArray(note.attachments) ? note.attachments : [];
  const visual = files.filter((item) => item.kind === "image" || item.kind === "video");
  const docs = files.filter((item) => item.kind === "file");
  const author = note.author || { name: "Family" };
  const mine = state.user && String(note.author?.id) === String(state.user.id);
  
  // Excerpt calculation
  const fullText = String(note.body || "").trim();
  const isLong = fullText.length > 210;
  const excerpt = isLong ? fullText.slice(0, 195).trim() + "…" : fullText;
  
  // Cover Media Layout
  let mediaHtml = "";
  if (visual.length === 1) {
    const item = visual[0];
    mediaHtml = `
      <div class="social-card-media single" data-action="open-post-modal" data-id="${esc(note.id)}" data-media-index="0">
        ${item.kind === "video" 
          ? `<div class="video-preview-wrap"><video src="${esc(asset(item.path))}" preload="metadata" muted playsinline></video><div class="play-overlay"><i class="bi bi-play-circle-fill"></i></div></div>`
          : `<img src="${esc(asset(item.path))}" alt="${esc(note.title || "Post photo")}" loading="lazy" decoding="async">`}
      </div>
    `;
  } else if (visual.length === 2) {
    mediaHtml = `
      <div class="social-card-media duo">
        ${visual.map((item, idx) => `
          <div class="media-thumb" data-action="open-post-modal" data-id="${esc(note.id)}" data-media-index="${idx}">
            ${item.kind === "video"
              ? `<video src="${esc(asset(item.path))}" preload="metadata" muted playsinline></video><div class="play-overlay mini"><i class="bi bi-play-circle-fill"></i></div>`
              : `<img src="${esc(asset(item.path))}" alt="" loading="lazy">`}
          </div>
        `).join("")}
      </div>
    `;
  } else if (visual.length >= 3) {
    const firstTwo = visual.slice(0, 2);
    const third = visual[2];
    const moreCount = visual.length - 3;
    mediaHtml = `
      <div class="social-card-media trio">
        <div class="media-hero" data-action="open-post-modal" data-id="${esc(note.id)}" data-media-index="0">
          <img src="${esc(asset(firstTwo[0].path))}" alt="" loading="lazy">
        </div>
        <div class="media-side">
          <div class="media-thumb" data-action="open-post-modal" data-id="${esc(note.id)}" data-media-index="1">
            <img src="${esc(asset(firstTwo[1].path))}" alt="" loading="lazy">
          </div>
          <div class="media-thumb ${moreCount > 0 ? "has-more" : ""}" data-action="open-post-modal" data-id="${esc(note.id)}" data-media-index="2">
            <img src="${esc(asset(third.path))}" alt="" loading="lazy">
            ${moreCount > 0 ? `<div class="more-overlay">+${moreCount}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  const social = note.social || { likes: 0, stars: 0, liked: false, starred: false, comments: [] };
  const comments = Array.isArray(social.comments) ? social.comments : [];
  const latestComment = comments[comments.length - 1];

  const chips = docs.map((item) => `
    <a class="file-chip" href="${esc(asset(item.path))}" download="${esc(item.name || "file")}">
      <i class="bi bi-file-earmark-text"></i><span>${esc(item.name || "Attached recipe")}</span>
    </a>
  `).join("");

  return `
    <article class="social-post-card" data-note="${esc(note.id)}">
      <header class="social-card-header">
        <div class="author-lockup">
          <div class="author-avatar-wrap">
            ${face(author)}
          </div>
          <div class="author-meta">
            <div class="author-name-row">
              <strong class="author-name">${esc(author.name || "Family")}</strong>
            </div>
            <time class="post-time" datetime="${esc(note.updatedAt)}">${esc(when(note.updatedAt))}</time>
          </div>
        </div>
        <div class="card-options-wrap">
          <button type="button" class="icon-btn-round" data-action="copy-post-link" data-id="${esc(note.id)}" title="Copy link to post" aria-label="Copy link">
            <i class="bi bi-link-45deg"></i>
          </button>
          <button type="button" class="icon-btn-round" data-action="send-post-message" data-id="${esc(note.id)}" data-title="${esc(note.title || 'Family post')}" title="Send in family message" aria-label="Send in message">
            <i class="bi bi-send"></i>
          </button>
          ${mine ? `
            <button type="button" class="icon-btn-round danger" data-action="delete-note" data-id="${esc(note.id)}" title="Delete post">
              <i class="bi bi-trash3"></i>
            </button>
          ` : ""}
        </div>
      </header>

      ${note.title ? `<h3 class="social-card-title" data-action="open-post-modal" data-id="${esc(note.id)}">${esc(note.title)}</h3>` : ""}

      ${excerpt ? `
        <div class="social-card-body" data-action="open-post-modal" data-id="${esc(note.id)}">
          <p>${esc(excerpt)}</p>
          ${isLong ? `<button type="button" class="see-more-link" data-action="open-post-modal" data-id="${esc(note.id)}">See full post →</button>` : ""}
        </div>
      ` : ""}

      ${mediaHtml}
      ${chips ? `<div class="file-row">${chips}</div>` : ""}

      <!-- Social Metrics Bar -->
      <div class="social-card-metrics">
        <span class="metric-item"><i class="bi bi-heart-fill heart-glow"></i> <strong>${social.likes || 0}</strong> ${social.likes === 1 ? 'like' : 'likes'}</span>
        <button type="button" class="metric-item link-metric" data-action="open-post-modal" data-id="${esc(note.id)}">
          <strong>${comments.length}</strong> ${comments.length === 1 ? 'comment' : 'comments'}
        </button>
      </div>

      <!-- Facebook Action Bar -->
      <div class="social-card-actions">
        <button type="button" class="social-action-btn ${social.liked ? 'is-liked' : ''}" data-action="react" data-kind="like" data-type="note" data-id="${esc(note.id)}">
          <i class="bi ${social.liked ? 'bi-heart-fill' : 'bi-heart'}"></i>
          <span>${social.liked ? 'Liked' : 'Like'}</span>
        </button>
        <button type="button" class="social-action-btn" data-action="focus-comment" data-id="${esc(note.id)}">
          <i class="bi bi-chat-left-text"></i>
          <span>Comment</span>
        </button>
        <button type="button" class="social-action-btn" data-action="share-post" data-id="${esc(note.id)}" data-title="${esc(note.title || 'A note')}">
          <i class="bi bi-share"></i>
          <span>Share</span>
        </button>
      </div>

      <!-- Quick Comment Preview & Input -->
      <div class="social-card-comment-section">
        ${comments.length > 1 ? `
          <button type="button" class="view-all-comments-btn" data-action="open-post-modal" data-id="${esc(note.id)}">
            View all ${comments.length} comments
          </button>
        ` : ""}
        ${latestComment ? `
          <div class="comment-preview-bubble">
            ${face(latestComment.author)}
            <div class="bubble-content">
              <strong>${esc(latestComment.author?.name || 'Family')}</strong>
              <span>${esc(latestComment.body || '')}</span>
              ${latestComment.attachments?.length ? `
                <div class="comment-mini-media">
                  ${latestComment.attachments.map(a => `<img src="${esc(asset(a.path))}" alt="" data-action="open-post-modal" data-id="${esc(note.id)}">`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        ` : ""}

        <!-- Quick comment trigger -->
        <div class="quick-comment-row" data-action="focus-comment" data-id="${esc(note.id)}">
          ${state.user ? face(state.user) : `<span class="face-ph" aria-hidden="true">F</span>`}
          <div class="quick-comment-input">Write a comment… <i class="bi bi-image"></i></div>
        </div>
      </div>
    </article>
  `;
}

function lightboxModal() {
  const note = state.activeModalPost;
  if (!note) return "";
  const files = Array.isArray(note.attachments) ? note.attachments : [];
  const visual = files.filter((item) => item.kind === "image" || item.kind === "video");
  const docs = files.filter((item) => item.kind === "file");
  const author = note.author || { name: "Family" };
  const social = note.social || { likes: 0, stars: 0, liked: false, starred: false, comments: [] };
  const comments = Array.isArray(social.comments) ? social.comments : [];
  const currentIndex = Math.max(0, Math.min(state.lightboxMediaIndex || 0, Math.max(0, visual.length - 1)));
  const currentMedia = visual[currentIndex];

  const pickKey = `note:${note.id}`;
  const stagedCommentPick = state.commentPicks?.[pickKey];

  return `
    <div class="lightbox-backdrop" data-action="close-lightbox-backdrop">
      <div class="lightbox-dialog ${visual.length ? 'has-media' : 'no-media'}" role="dialog" aria-modal="true">
        
        <!-- Media Column (Left) -->
        ${visual.length ? `
          <div class="lightbox-media-col">
            <div class="lightbox-media-viewport">
              ${currentMedia.kind === "video" 
                ? `<video src="${esc(asset(currentMedia.path))}" controls autoplay playsinline class="lightbox-full-video"></video>`
                : `<img src="${esc(asset(currentMedia.path))}" alt="${esc(note.title || '')}" class="lightbox-full-image">`}
              
              ${visual.length > 1 ? `
                <button type="button" class="lightbox-nav-btn prev" data-action="lightbox-prev" aria-label="Previous photo">
                  <i class="bi bi-chevron-left"></i>
                </button>
                <button type="button" class="lightbox-nav-btn next" data-action="lightbox-next" aria-label="Next photo">
                  <i class="bi bi-chevron-right"></i>
                </button>
                <div class="lightbox-media-counter">${currentIndex + 1} / ${visual.length}</div>
              ` : ""}
            </div>
            
            ${visual.length > 1 ? `
              <div class="lightbox-thumbs-strip">
                ${visual.map((item, idx) => `
                  <button type="button" class="lightbox-thumb-btn ${idx === currentIndex ? 'active' : ''}" data-action="lightbox-thumb" data-index="${idx}">
                    ${item.kind === 'video' ? `<i class="bi bi-play-circle-fill" style="font-size:20px;color:white"></i>` : `<img src="${esc(asset(item.path))}" alt="">`}
                  </button>
                `).join('')}
              </div>
            ` : ""}
          </div>
        ` : ""}

        <!-- Content & Comments Column (Right) -->
        <div class="lightbox-content-col">
          <!-- Top Bar -->
          <div class="lightbox-header">
            <div class="author-lockup">
              ${face(author)}
              <div>
                <strong>${esc(author.name || "Family")}</strong>
                <time>${esc(when(note.updatedAt))}</time>
              </div>
            </div>
            <div class="lightbox-actions-top">
              <button type="button" class="icon-btn-round" data-action="copy-post-link" data-id="${esc(note.id)}" title="Copy link">
                <i class="bi bi-link-45deg"></i>
              </button>
              <button type="button" class="icon-btn-round" data-action="send-post-message" data-id="${esc(note.id)}" data-title="${esc(note.title || 'A note')}" title="Send in message">
                <i class="bi bi-send"></i>
              </button>
              <button type="button" class="lightbox-close-btn" data-action="close-lightbox" aria-label="Close modal">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>

          <!-- Post Content -->
          <div class="lightbox-scroll-body">
            ${note.title ? `<h2 class="lightbox-post-title">${esc(note.title)}</h2>` : ""}
            <div class="lightbox-post-text">
              <p>${esc(note.body || "").replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>
            </div>

            ${docs.length ? `
              <div class="lightbox-file-list">
                ${docs.map(doc => `
                  <a class="file-chip" href="${esc(asset(doc.path))}" download="${esc(doc.name || 'file')}">
                    <i class="bi bi-file-earmark-text"></i><span>${esc(doc.name || 'Recipe document')}</span>
                  </a>
                `).join('')}
              </div>
            ` : ""}

            <!-- Post Reactions Bar -->
            <div class="lightbox-stats-bar">
              <span><i class="bi bi-heart-fill heart-glow"></i> <strong>${social.likes || 0}</strong> likes</span>
              <span><strong>${comments.length}</strong> comments</span>
            </div>

            <div class="lightbox-button-bar">
              <button type="button" class="social-action-btn ${social.liked ? 'is-liked' : ''}" data-action="react" data-kind="like" data-type="note" data-id="${esc(note.id)}">
                <i class="bi ${social.liked ? 'bi-heart-fill' : 'bi-heart'}"></i>
                <span>${social.liked ? 'Liked' : 'Like'}</span>
              </button>
              <button type="button" class="social-action-btn" data-action="share-post" data-id="${esc(note.id)}" data-title="${esc(note.title || 'A note')}">
                <i class="bi bi-share"></i>
                <span>Share</span>
              </button>
            </div>

            <!-- Comments Stream -->
            <div class="lightbox-comments-list">
              <h4 class="comments-heading">Family Comments (${comments.length})</h4>
              ${comments.length ? comments.map(comment => {
                const cMine = state.user && String(comment.author?.id) === String(state.user.id);
                const cFiles = Array.isArray(comment.attachments) ? comment.attachments : [];
                return `
                  <div class="lightbox-comment-item">
                    ${face(comment.author)}
                    <div class="comment-bubble-wrap">
                      <div class="comment-bubble">
                        <div class="comment-author-line">
                          <strong>${esc(comment.author?.name || 'Family')}</strong>
                          <time>${esc(when(comment.createdAt))}</time>
                        </div>
                        ${comment.body ? `<p class="comment-text">${esc(comment.body)}</p>` : ""}
                        ${cFiles.length ? `
                          <div class="comment-media-grid">
                            ${cFiles.map(cf => cf.kind === 'video'
                              ? `<video src="${esc(asset(cf.path))}" controls class="comment-inline-video"></video>`
                              : `<img src="${esc(asset(cf.path))}" alt="" class="comment-inline-img" loading="lazy">`
                            ).join('')}
                          </div>
                        ` : ""}
                      </div>
                      ${cMine ? `
                        <button type="button" class="comment-delete-link" data-action="delete-comment" data-id="${esc(comment.id)}">Delete</button>
                      ` : ""}
                    </div>
                  </div>
                `;
              }).join("") : `<p class="empty-comments">No comments yet.</p>`}
            </div>
          </div>

          <!-- Bottom Comment Input Form with Media Picker -->
          <div class="lightbox-comment-footer">
            <form class="comment-form lightbox-form" data-type="note" data-id="${esc(note.id)}">
              ${stagedCommentPick ? `
                <div class="staged-comment-preview">
                  <span>${stagedCommentPick.kind === 'video' ? '🎥 Video' : '📷 Photo'}: ${esc(stagedCommentPick.name)}</span>
                  <button type="button" class="staged-remove-btn" data-action="drop-comment-pick" data-key="${esc(pickKey)}">×</button>
                </div>
              ` : ""}
              <div class="comment-input-row">
                ${state.user ? face(state.user) : `<span class="face-ph" aria-hidden="true">F</span>`}
                <input name="body" placeholder="Write a comment with photo or video…" autocomplete="off" class="lightbox-comment-input">
                <label class="comment-media-btn" title="Add photo">
                  <i class="bi bi-camera"></i>
                  <input type="file" accept="image/*" data-comment-file="image" hidden>
                </label>
                <label class="comment-media-btn" title="Add video">
                  <i class="bi bi-camera-video"></i>
                  <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm" data-comment-file="video" hidden>
                </label>
                <button type="submit" class="comment-send-btn" title="Send comment">
                  <i class="bi bi-send-fill"></i>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  `;
}

function shareDialog() {
  const post = state.shareDialogPost;
  if (!post) return "";
  const postUrl = `${location.origin}${location.pathname}#/post/${post.id}`;
  const shareText = `${post.title || "Family Recipe & Story"} from Lisa's Recipe Book`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedText = encodeURIComponent(`${shareText}\n${postUrl}`);

  return `
    <div class="lightbox-backdrop share-backdrop" data-action="close-share-modal">
      <div class="share-modal-dialog" role="dialog" aria-modal="true">
        <div class="share-modal-header">
          <div class="share-header-left">
            <span class="share-sparkle-badge"><i class="bi bi-share-fill"></i></span>
            <div>
              <h3 class="share-title">Share with Family</h3>
              <p class="share-subtitle">${esc(post.title || "Family post")}</p>
            </div>
          </div>
          <button type="button" class="lightbox-close-btn" data-action="close-share-modal" aria-label="Close share dialog">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="share-link-row">
          <input readonly value="${esc(postUrl)}" class="share-url-box" id="share-link-input" onclick="this.select()">
          <button type="button" class="btn share-copy-btn" data-action="copy-post-link" data-id="${esc(post.id)}">
            <i class="bi bi-link-45deg"></i> Copy Link
          </button>
        </div>

        <div class="share-options-grid">
          <a class="share-option-tile sms" href="sms:?&body=${encodedText}">
            <div class="share-tile-icon"><i class="bi bi-chat-dots-fill"></i></div>
            <div class="share-tile-info">
              <strong>Text Message</strong>
              <span>Send via SMS</span>
            </div>
          </a>

          <a class="share-option-tile whatsapp" href="https://api.whatsapp.com/send?text=${encodedText}" target="_blank" rel="noopener">
            <div class="share-tile-icon"><i class="bi bi-whatsapp"></i></div>
            <div class="share-tile-info">
              <strong>WhatsApp</strong>
              <span>Send in group chat</span>
            </div>
          </a>

          <a class="share-option-tile email" href="mailto:?subject=${encodeURIComponent(post.title || "Lisa's Recipe Book Post")}&body=${encodedText}">
            <div class="share-tile-icon"><i class="bi bi-envelope-fill"></i></div>
            <div class="share-tile-info">
              <strong>Email</strong>
              <span>Send email letter</span>
            </div>
          </a>

          <a class="share-option-tile desk" href="#/messages" data-action="close-share-modal">
            <div class="share-tile-icon"><i class="bi bi-people-fill"></i></div>
            <div class="share-tile-info">
              <strong>Family Desk</strong>
              <span>Open in messages</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  `;
}

function getActiveModalVisuals() {
  if (!state.activeModalPost) return [];
  const files = Array.isArray(state.activeModalPost.attachments) ? state.activeModalPost.attachments : [];
  return files.filter(item => item.kind === "image" || item.kind === "video");
}

function openPostModal(id, mediaIndex = 0) {
  const note = (state.notes || []).find((item) => String(item.id) === String(id));
  if (!note) return;
  state.activeModalPost = note;
  state.lightboxMediaIndex = Number(mediaIndex) || 0;
  if (!location.hash.startsWith("#/post/")) {
    state.preModalHash = location.hash || "#/";
    history.replaceState(null, "", `#/post/${note.id}`);
  }
  render();
}

function closePostModal() {
  state.activeModalPost = null;
  state.lightboxMediaIndex = 0;
  if (location.hash.startsWith("#/post/")) {
    history.replaceState(null, "", state.preModalHash || "#/");
  }
  render();
}

function openShareModal(post) {
  state.shareDialogPost = post;
  render();
}

function closeShareModal() {
  state.shareDialogPost = null;
  render();
}

function imageZoomModal() {
  const img = state.zoomedImage;
  if (!img) return "";
  return `
    <div class="lightbox-backdrop image-zoom-backdrop" data-action="close-zoom-image">
      <div class="image-zoom-dialog" role="dialog" aria-modal="true">
        <div class="image-zoom-header">
          <div class="image-zoom-info">
            <h3 class="image-zoom-title">${esc(img.title || "Recipe Photograph")}</h3>
            <p class="image-zoom-credit"><i class="bi bi-camera-fill"></i> ${esc(img.credit || "Photograph for Lisa's Recipe Book")}</p>
          </div>
          <div class="image-zoom-actions">
            <a class="btn quiet" href="${esc(img.src)}" download="${esc(img.title || 'photo')}.jpg" target="_blank" rel="noopener">
              <i class="bi bi-download"></i> Save photo
            </a>
            <button type="button" class="lightbox-close-btn" data-action="close-zoom-image" aria-label="Close photo">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="image-zoom-viewport">
          <img src="${esc(img.src)}" alt="${esc(img.title || 'Photo')}" class="image-zoom-img">
        </div>
      </div>
    </div>
  `;
}

function notesView() {
  const notes = state.notes || [];
  return shell(`
    <div class="social-feed-container">
      <div class="birthday-hero-banner" style="margin-bottom:0">
        <div class="birthday-hero-content">
          <div class="birthday-sparkle">Notepad</div>
          <h1 class="birthday-title">Notes, pictures, and videos</h1>
          <p class="birthday-desc">
            Share a kitchen moment, a photo, or a video with the family.
          </p>
        </div>
      </div>

      ${facebookComposer()}

      <div class="social-stream-wrap">
        ${notes.length ? notes.map(socialPostCard).join("") : `<p class="empty">No family notes yet. Be the first to post!</p>`}
      </div>
    </div>
  `);
}

function notePost(note, mode) {
  return socialPostCard(note);
}

function slideTalk(type, id, social) {
  const count = social?.comments?.length || 0;
  const line = count ? `<p class="empty">${count} ${count === 1 ? "comment" : "comments"}</p>` : "";
  return `<section class="comments-block">${line}${commentForm(type, id)}</section>`;
}

function commentCount(social) {
  const count = social?.comments?.length || 0;
  if (!count) return "";
  return `<p class="empty">${count} ${count === 1 ? "comment" : "comments"}</p>`;
}

function reactBar(type, id, social, kinds) {
  if (!state.user) return "";
  const show = Array.isArray(kinds) ? kinds : ["like", "star"];
  const box = social || { likes: 0, stars: 0, liked: false, starred: false, comments: [] };
  const like = show.includes("like")
    ? `<button type="button" class="react-btn ${box.liked ? "on" : ""}" data-action="react" data-kind="like" data-type="${esc(type)}" data-id="${esc(id)}">Like${box.likes ? ` ${box.likes}` : ""}</button>`
    : "";
  const star = show.includes("star")
    ? `<button type="button" class="react-btn ${box.starred ? "on" : ""}" data-action="react" data-kind="star" data-type="${esc(type)}" data-id="${esc(id)}">Star${box.stars ? ` ${box.stars}` : ""}</button>`
    : "";
  return `<div class="react">${like}${star}</div>`;
}

function commentsBlock(type, id, social) {
  const comments = Array.isArray(social?.comments) ? social.comments : [];
  const list = comments.length
    ? `<div class="comments">${comments.map(commentLine).join("")}</div>`
    : `<p class="empty">No comments yet.</p>`;
  return `<section class="comments-block"><h3>Comments</h3>${list}${commentForm(type, id)}</section>`;
}

function commentForm(type, id) {
  if (!state.user) return `<p class="empty"><a href="#/account">Log in</a> to leave a comment.</p>`;
  const pick = state.commentPicks?.[`${type}:${id}`];
  return `<form class="comment-form" data-type="${esc(type)}" data-id="${esc(id)}">
    <input name="body" placeholder="Write a comment">
    <div class="comment-tools">
      <label class="tool">${iconPhoto()}<span>Photo</span><input type="file" accept="image/*" data-comment-file="image"></label>
      <label class="tool">${iconVideo()}<span>Video</span><input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm" data-comment-file="video"></label>
      <button class="btn quiet" type="submit">Comment</button>
    </div>
    ${pick ? `<span class="comment-picked">${esc(pick.name)}</span>` : ""}
  </form>`;
}

function commentPlace(type, id) {
  if (type === "recipe") {
    const recipe = state.recipes.find((item) => item.id === id);
    return {
      title: recipe?.title || "This plate",
      back: `#/recipe/${encodeURIComponent(id)}`,
      backLabel: "Back to the recipe",
      social: recipe?.social
    };
  }
  if (type === "world") {
    const mealId = String(id).replace(/^mealdb-/, "");
    const recipe = state.worldCache[mealId];
    const listed = [state.shelf, state.featured, state.bookHits].flat().find((meal) => meal && String(meal.id).replace(/^mealdb-/, "") === mealId);
    return {
      title: recipe?.title || listed?.title || "This plate",
      back: `#/world/${encodeURIComponent(mealId)}`,
      backLabel: "Back to the plate",
      social: recipe?.social || listed?.social
    };
  }
  if (type === "note") {
    const note = state.notes.find((item) => String(item.id) === String(id));
    const text = String(note?.body || note?.title || "This note").trim();
    return {
      title: text.slice(0, 80) || "This note",
      back: "#/notes",
      backLabel: "Back to the notepad",
      social: note?.social
    };
  }
  if (type === "film") {
    const item = state.library.find((entry) => String(entry.id) === String(id));
    return {
      title: item?.title || "This film",
      back: "#/studio",
      backLabel: "Back to the studio",
      social: item?.social
    };
  }
  return { title: "Comments", back: "#/", backLabel: "Back to the book", social: null };
}

function commentsView(type, id) {
  const place = commentPlace(type, id);
  const comments = Array.isArray(place.social?.comments) ? place.social.comments : [];
  const list = comments.length
    ? `<div class="comments">${comments.map(commentLine).join("")}</div>`
    : `<p class="empty">No comments yet.</p>`;
  const form = commentForm(type, id);
  return shell(`
    <p><a class="see-comments" href="${esc(place.back)}">${esc(place.backLabel)}</a></p>
    <h2 class="page-title">Comments</h2>
    <p>${esc(place.title)}</p>
    <section class="comments-page">
      ${list}
      ${form}
    </section>
  `);
}

function commentLine(comment) {
  const mine = state.user && String(comment.author?.id) === String(state.user.id);
  const files = Array.isArray(comment.attachments) ? comment.attachments : [];
  const media = files.map((item) => item.kind === "video"
    ? filmCover(asset(item.path))
    : `<img src="${esc(asset(item.path))}" alt="" loading="lazy" decoding="async">`).join("");
  return `<div class="comment">${face(comment.author)}<div><p><strong>${esc(comment.author?.name || "Family")}</strong> ${esc(comment.body || "")}</p>${media ? `<div class="comment-media">${media}</div>` : ""}</div>${mine ? `<button type="button" class="btn quiet" data-action="delete-comment" data-id="${esc(comment.id)}">Delete</button>` : ""}</div>`;
}

function familyView() {
  if (!state.user) return accountGate("Log in to see the family.");
  return shell(`
    <h2 class="page-title">Family</h2>
    <p>Everyone signed in shares the same recipes, notes, and videos. Follow someone to keep them close.</p>
    <div class="stack">
      ${(state.people || []).map(personCard).join("") || `<p class="empty">No accounts yet.</p>`}
    </div>
  `);
}

function peopleView(id) {
  if (!state.user) return accountGate("Log in to see a profile.");
  const cached = (state.people || []).find((item) => String(item.id) === String(id));
  const shown = state.profile && String(state.profile.id) === String(id) ? { ...cached, ...state.profile } : cached;
  if (state.profileFor !== String(id)) {
    state.profileFor = String(id);
    api(`/api/people/${encodeURIComponent(id)}`).then((data) => {
      state.profile = data.person;
      const list = state.people || [];
      const index = list.findIndex((item) => String(item.id) === String(data.person.id));
      if (index >= 0) list[index] = { ...list[index], ...data.person };
      else state.people = [data.person, ...list];
      if (route().name === "people" && String(route().id) === String(id)) render();
    }).catch((error) => say(error.message));
  }
  if (!shown) return shell(`<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Profile</span></nav><p class="empty">Opening that profile…</p>`);
  const self = String(shown.id) === String(state.user.id);
  return shell(`
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span class="crumb-gap" aria-hidden="true">/</span><a href="#/family">Family</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">${esc(shown.name)}</span></nav>
    <h2 class="page-title">${esc(shown.name)}</h2>
    <section class="panel">
      <div class="profile-head">
        ${shown.avatar ? `<img class="avatar" alt="" src="${esc(asset(shown.avatar))}">` : `<div class="avatar-ph">${esc(shown.name.slice(0, 1))}</div>`}
        <div>
          <p>${esc(shown.bio || "No bio yet.")}</p>
          <p class="empty">${shown.followers || 0} follow ${esc(shown.name)}</p>
        </div>
      </div>
      ${self
        ? `<a class="btn quiet" href="#/profile">Edit your profile</a>`
        : `<div class="actions">
            <button class="btn ${shown.following ? "quiet" : ""}" type="button" data-action="follow" data-id="${esc(shown.id)}">${shown.following ? "Following" : "Follow"}</button>
            ${reactBar("person", shown.id, shown.social, ["like"])}
          </div>`}
    </section>
  `);
}

function personCard(person) {
  const self = String(person.id) === String(state.user?.id);
  return `<article class="panel person">
    ${face(person)}
    <div>
      <h3>${esc(person.name)}</h3>
      ${person.bio ? `<p>${esc(person.bio)}</p>` : ""}
      <p class="empty">${person.followers || 0} follow ${esc(person.name)}</p>
    </div>
    ${self ? `<span class="empty">This is you</span>` : `<button class="btn ${person.following ? "quiet" : ""}" type="button" data-action="follow" data-id="${esc(person.id)}">${person.following ? "Following" : "Follow"}</button>`}
  </article>`;
}

function when(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function studio() {
  if (!state.user) return accountGate("Log in to save films and links.");
  const saved = state.library.filter((item) => item.kind !== "film" && keptLink(item.url));
  const films = state.library.filter((item) => item.kind === "film");
  return shell(`
    <h2 class="page-title">Studio</h2>
    <p>Save a YouTube video, or a video file you host yourself. Record a film here, or upload one.</p>
    <div class="split">
      <form id="link-form" class="panel">
        <h3>Save for later</h3>
        <div class="field"><label>Title<input name="title" required></label></div>
        <div class="field"><label>Link<input name="url" required placeholder="YouTube, or a video you host"></label></div>
        <div class="field"><label>Why you saved it<textarea name="notes"></textarea></label></div>
        <button class="btn" type="submit">Save link</button>
      </form>
      <form id="film-form" class="panel">
        <h3>Your films</h3>
        <div class="field"><label>Title<input name="title" required value="${esc(state.filmDraft.title)}"></label></div>
        <div class="field"><label>YouTube description<textarea name="description" placeholder="What you would paste into YouTube">${esc(state.filmDraft.description)}</textarea></label></div>
        <div class="field"><label>Video file<input name="file" type="file" accept="video/mp4,video/webm,video/quicktime"></label></div>
        ${cameraStage()}
        <div class="actions">
          <button class="btn moss" type="submit">Save film</button>
        </div>
      </form>
    </div>
    <h3>Saved videos</h3>
    <div class="stack">
      ${saved.map(libraryCard).join("") || `<p class="empty">Nothing saved yet.</p>`}
    </div>
    <h3>Family films</h3>
    <div class="stack">${films.map(libraryCard).join("") || `<p class="empty">Your films will sit here.</p>`}</div>
  `);
}

function cameraStage() {
  const rec = state.recording;
  if (!rec?.stream && !rec?.url) return `<button class="btn quiet" type="button" data-action="camera-open">Open camera</button>`;
  const live = Boolean(rec.stream);
  return `<div class="stage ${live ? "" : "review"} ${rec.on ? "filming" : ""}">
    <video id="live-preview" playsinline ${live ? "autoplay muted" : `controls src="${esc(rec.url)}"`}></video>
    <div class="stage-bar">
      ${live && !rec.on ? `<button class="stage-side" type="button" data-action="camera-flip">Flip</button>` : `<span class="stage-side" id="rec-clock">${rec.on ? "0:00" : ""}</span>`}
      ${live
        ? `<button class="shutter ${rec.on ? "on" : ""}" type="button" data-action="record" aria-label="${rec.on ? "Stop recording" : "Start recording"}"><span></span>${rec.on ? "Stop" : "Record"}</button>`
        : `<button class="stage-side" type="button" data-action="camera-open">Retake</button>`}
      <button class="stage-side" type="button" data-action="camera-close">Close</button>
    </div>
  </div>${rec.url ? `<p class="empty">Take ready. Save the film when the title looks right.</p>` : ""}`;
}

function libraryCard(item) {
  const id = youtubeId(item.url);
  const editing = String(state.libraryEdit) === String(item.id);
  const mine = state.user && String(item.author?.id) === String(state.user.id);
  return `<article class="film">
    <div class="card-tools">
      <p class="kicker">${esc(item.kind)}${item.author ? ` · ${esc(item.author.name)}` : ""}</p>
      ${mine ? `<button class="btn quiet" type="button" data-action="edit-library" data-id="${esc(item.id)}">Edit</button>
      <button class="btn danger" type="button" data-action="delete-library" data-id="${esc(item.id)}">Delete</button>` : ""}
    </div>
    ${editing ? `<form id="library-edit-form" class="stack">
      <input type="hidden" name="id" value="${esc(item.id)}">
      <div class="field"><label>Title<input name="title" required value="${esc(item.title)}"></label></div>
      ${item.kind === "film" ? "" : `<div class="field"><label>Link<input name="url" required value="${esc(item.url)}"></label></div>`}
      <div class="field"><label>Note<textarea name="notes">${esc(item.notes || "")}</textarea></label></div>
      <div class="field"><label>Description<textarea name="description">${esc(item.description || "")}</textarea></label></div>
      <div class="actions"><button class="btn" type="submit">Save changes</button><button class="btn quiet" type="button" data-action="cancel-library-edit">Cancel</button></div>
    </form>` : `<h3>${esc(item.title)}</h3>`}
    ${item.filePath ? `<video src="${esc(asset(item.filePath))}" controls playsinline></video>` : ""}
    ${hostedVideo(item.url) ? `<video src="${esc(item.url)}" controls playsinline></video>` : ""}
    ${id ? `<iframe class="frame" src="https://www.youtube-nocookie.com/embed/${esc(id)}?rel=0&playsinline=1" title="${esc(item.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>` : ""}
    ${!editing && item.notes ? `<p>${esc(item.notes)}</p>` : ""}
    ${!editing && item.description ? `<p>${esc(item.description)}</p>` : ""}
    ${!editing && item.url && !id && !hostedVideo(item.url) && !mealDbPage(item.url) ? `<div class="actions"><button class="btn quiet" data-action="open-source" data-url="${esc(item.url)}" data-title="${esc(item.title)}">Open inside the book</button></div>` : ""}
    <div class="card-actions">${linkTools(item.url && /^https?:\/\//.test(item.url) ? item.url : pageLink("#/studio"), item.title)}</div>
    ${reactBar("film", item.id, item.social)}
    ${commentsBlock("film", item.id, item.social)}
  </article>`;
}

function profile() {
  if (!state.user) return accountGate("Log in to see your name and picture.");
  const user = state.user;
  return shell(`
    <h2 class="page-title">Profile</h2>
    <section class="panel">
      <div class="profile-head">
        ${user.avatar ? `<img class="avatar" alt="" src="${esc(asset(user.avatar))}">` : `<div class="avatar-ph">${esc(user.name.slice(0, 1))}</div>`}
        <div><h3 style="margin:0">${esc(user.name)}</h3><p class="empty">${esc(user.email)}</p><p>${esc(user.bio || "Add a line about your table.")}</p></div>
      </div>
      <form id="profile-form">
        <div class="field"><label>Name<input name="name" value="${esc(user.name)}" required></label></div>
        <div class="field"><label>About<textarea name="bio">${esc(user.bio)}</textarea></label></div>
        <div class="field"><label>Portrait from a link<input name="avatarUrl" placeholder="https://"></label></div>
        <button class="btn" type="submit">Save profile</button>
      </form>
      <form id="avatar-form">
        <div class="field"><label>Or upload a portrait<input type="file" name="avatar" accept="image/*" required></label></div>
        <button class="btn moss" type="submit">Upload portrait</button>
      </form>
      <button class="btn quiet" type="button" data-action="sign-out">Log out</button>
    </section>
  `);
}

function accountGate(copy) {
  return shell(`
    <h2 class="page-title">Log in</h2>
    <p>${esc(copy)}</p>
    ${accountForms()}
  `);
}

function accountForms() {
  return `<div class="split">
    <form id="login-form" class="panel">
      <h3>Log in</h3>
      <p class="empty">Use the email and password for this book.</p>
      <div class="field"><label>Email<input name="email" type="email" required autocomplete="username"></label></div>
      <div class="field"><label>Password<span class="password-row"><input name="password" type="password" required autocomplete="current-password"><button class="btn quiet" type="button" data-action="toggle-password">Show password</button></span></label></div>
      <button class="btn" type="submit">Log in</button>
    </form>
    <form id="register-form" class="panel">
      <h3>First time here?</h3>
      <p class="empty">Create an account. You only do this once.</p>
      <div class="field"><label>Name<input name="name" required autocomplete="name" placeholder="Your name"></label></div>
      <div class="field"><label>Email<input name="email" type="email" required autocomplete="email"></label></div>
      <div class="field"><label>Password<span class="password-row"><input name="password" type="password" minlength="8" required autocomplete="new-password"><button class="btn quiet" type="button" data-action="toggle-password">Show password</button></span></label></div>
      <p class="empty">Use at least 8 characters.</p>
      <button class="btn moss" type="submit">Create account</button>
    </form>
  </div>`;
}

function reader() {
  const stack = state.reader.stack || [];
  const page = stack[stack.length - 1];
  const from = state.reader.fromTitle ? `<button type="button" data-action="close-reader">${esc(state.reader.fromTitle)}</button><span>/</span>` : "";
  return `<div class="reader"><div class="reader-sheet">
    <div class="crumbs">
      <button type="button" data-action="reader-back">Back</button>
      <button type="button" data-action="close-reader">Book</button><span>/</span>
      ${from}
      ${stack.map((crumb, index) => `<button type="button" data-action="crumb" data-index="${index}" ${index === stack.length - 1 ? "disabled" : ""}>${esc(crumb.title)}</button>`).join("<span>/</span>")}
      <button type="button" data-action="close-reader" style="margin-left:auto">Close</button>
    </div>
    <div id="reader-body">${state.reader.loading ? "<p>Opening that page…</p>" : (page?.html || "")}</div>
  </div></div>`;
}

function render() {
  const current = route();
  const root = document.getElementById("app");
  let html = "";
  if (current.name === "recipe") {
    const recipe = state.recipes.find((item) => item.id === current.id);
    document.title = recipe ? `${recipe.title} · Lisa's Recipe Book` : "Lisa's Recipe Book";
    html = recipe ? recipeView(recipe) : shell(`<p>That recipe is not in the book.</p>`);
  } else if (current.name === "world") {
    const recipe = state.worldCache[current.id];
    document.title = recipe ? `${recipe.title} · Lisa's Recipe Book` : "Library · Lisa's Recipe Book";
    if (recipe) html = recipeView(recipe);
    else if (state.worldError && state.worldMiss === current.id && !state.worldLoading) {
      html = shell(`<p class="empty">${esc(state.worldError)}</p><button class="btn" data-action="retry-world">Try again</button>`);
    } else {
      html = shell(`<p class="empty">Opening that plate…</p>`);
      if (state.worldMiss !== current.id) {
        state.worldMiss = current.id;
        ensureWorld(current.id);
      }
    }
  } else if (current.name === "library") {
    document.title = "Library · Lisa's Recipe Book";
    html = libraryView();
  } else if (current.name === "edit" || current.name === "new") {
    document.title = "Write a recipe · Lisa's Recipe Book";
    const recipe = current.name === "edit" ? state.recipes.find((item) => item.id === current.id) : null;
    html = state.user ? editor(recipe) : accountGate("Log in before you add a recipe.");
  } else if (current.name === "notes") {
    document.title = "Notepad · Lisa's Recipe Book";
    html = notesView();
  } else if (current.name === "studio") {
    document.title = "Studio · Lisa's Recipe Book";
    html = studio();
  } else if (current.name === "people") {
    const shown = (state.people || []).find((item) => String(item.id) === String(current.id)) || state.profile;
    document.title = shown && String(shown.id) === String(current.id) ? `${shown.name} · Lisa's Recipe Book` : "Profile · Lisa's Recipe Book";
    html = peopleView(current.id);
  } else if (current.name === "family") {
    document.title = "Family · Lisa's Recipe Book";
    html = familyView();
  } else if (current.name === "profile" || current.name === "account") {
    document.title = current.name === "account" ? "Log in · Lisa's Recipe Book" : "Profile · Lisa's Recipe Book";
    html = current.name === "profile" ? profile() : accountGate("Log in with your email and password. First time here? Create an account in the next box.");
  } else if (current.name === "messages") {
    document.title = "Messages · Lisa's Recipe Book";
    html = state.user ? shell(messagesView()) : accountGate("Log in to send a message or make a call.");
  } else if (current.name === "sound") {
    document.title = "Call sound · Lisa's Recipe Book";
    html = soundView();
  } else if (current.name === "search") {
    document.title = "Search · Lisa's Recipe Book";
    html = shell(searchView());
  } else if (current.name === "comments") {
    const place = commentPlace(current.id, current.more);
    document.title = `Comments · ${place.title} · Lisa's Recipe Book`;
    html = commentsView(current.id, current.more);
    if (current.id === "world" && current.more && !state.worldCache[String(current.more).replace(/^mealdb-/, "")] && state.worldMiss !== String(current.more).replace(/^mealdb-/, "")) {
      state.worldMiss = String(current.more).replace(/^mealdb-/, "");
      ensureWorld(state.worldMiss);
    }
  } else if (current.name === "shop") {
    const openedShop = (state.shopProducts || []).find((item) => item.id === current.id);
    document.title = current.id === "studio"
      ? "Product studio · Lisa's Recipe Book"
      : current.id === "cart"
        ? "Cart · Lisa's Recipe Book"
        : openedShop ? `${openedShop.title} · Lisa's Recipe Book` : "Shop · Lisa's Recipe Book";
    html = shell(shopView(shopCtx()));
  } else if (current.name === "privacy") {
    document.title = "Privacy · Lisa's Recipe Book";
    html = privacyView();
  } else if (current.name === "terms") {
    document.title = "Terms of use · Lisa's Recipe Book";
    html = termsView();
  } else {
    document.title = "Lisa's Recipe Book";
    html = home();
  }
  if (state.incoming) document.title = `${state.incoming.person?.name || "Someone"} is calling`;
  else if (state.call) document.title = state.call.phase === "live" ? `On a call with ${state.call.person?.name || "family"}` : `Calling ${state.call.person?.name || "family"}`;
  root.innerHTML = html;
  paintFilmCovers();
  state.menuFresh = false;
  document.body.classList.toggle("menu-open", state.menu);
  attachCallMedia();
  paintDeskBadge();
  const preview = document.getElementById("live-preview");
  if (preview && state.recording?.stream) {
    preview.srcObject = state.recording.stream;
    preview.muted = true;
    preview.play?.().catch(() => {});
  }
  paintInstall();
}

async function openSource(url, title, from) {
  state.reader = state.reader || { stack: [], fromTitle: from?.title || "", fromId: from?.id || "" };
  if (from) {
    state.reader.fromTitle = from.title;
    state.reader.fromId = from.id;
    state.reader.stack = [];
  }
  if (socialLink(url)) {
    say("TikTok and Facebook stay out of the book.");
    return;
  }
  if (mealDbPage(url)) return;
  const watch = watchPage(url, title);
  if (watch) {
    state.reader.loading = false;
    state.reader.stack.push(watch);
    render();
    return;
  }
  state.reader.loading = true;
  render();
  try {
    const page = await api(`/api/browse?url=${encodeURIComponent(url)}`);
    state.reader.stack.push({ title: page.title || title || "Page", url: page.url, html: page.html });
    state.reader.loading = false;
    render();
  } catch (error) {
    state.reader.loading = false;
    state.reader = null;
    say(error.message);
  }
}

function watchPage(url, title) {
  const name = title || "Video";
  const youtube = youtubeId(url);
  if (youtube) return { title: name, url, html: watchFrame(`https://www.youtube-nocookie.com/embed/${youtube}?rel=0&playsinline=1`, name) };
  let host = "";
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    return { title: name, url, html: "<p>That YouTube link did not include a video.</p>" };
  }
  return null;
}

function watchFrame(src, title) {
  return `<div class="watch"><iframe src="${esc(src)}" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
}

function linkHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function socialLink(url) {
  const host = linkHost(url);
  return host.endsWith("tiktok.com") || host.endsWith("facebook.com") || host === "fb.watch" || host.endsWith("fb.com") || host.endsWith("instagram.com");
}

function hostedVideo(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol) || socialLink(url)) return false;
    return /\.(mp4|webm|mov|m4v|ogg)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function keptLink(url) {
  return Boolean(youtubeId(url) || hostedVideo(url));
}

async function loadFeedNotes() {
  try {
    const notes = await api("/api/notes");
    state.notes = Array.isArray(notes.notes) ? notes.notes : [];
    state.notesError = "";
  } catch (error) {
    state.notes = state.notes || [];
    state.notesError = error.message || "";
  }
}

async function refreshPrivate() {
  await loadFeedNotes();
  if (!state.user) { state.library = []; state.people = []; return; }
  const [library, people, recipes] = await Promise.all([
    api("/api/library"),
    api("/api/people"),
    api("/api/recipes")
  ]);
  state.library = library.items;
  state.people = people.people;
  state.recipes = recipes.recipes;
}

document.addEventListener("click", async (event) => {
  const navAnchor = event.target.closest('a[href^="#"], a[href^="/#"]');
  if (navAnchor && !navAnchor.getAttribute("download") && !navAnchor.getAttribute("target") && navAnchor.getAttribute("href") !== "#") {
    const rawHref = navAnchor.getAttribute("href") || "";
    const cleanHash = rawHref.startsWith("/#") ? rawHref.slice(1) : rawHref;
    if (cleanHash.startsWith("#")) {
      event.preventDefault();
      location.hash = cleanHash;
      state.reader = null;
      state.menu = false;
      state.cartOpen = false;
      state.activeModalPost = null;
      state.shareDialogPost = null;
      state.zoomedImage = null;
      deskNavigated();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  }
  const link = event.target.closest("#reader-body a");
  if (link) {
    event.preventDefault();
    const href = link.getAttribute("href");
    if (href && href.startsWith("http")) await openSource(href, link.textContent);
    return;
  }
  warmRinger();
  const jump = event.target.closest("a.menu-link, a.appbar-item");
  if (jump && state.menu) {
    state.menu = false;
    const next = jump.hash || "#/";
    if (next === (location.hash || "#/")) render();
  }
  const button = event.target.closest("[data-action], [data-cuisine], [data-shelf]");
  if (!button) return;
  try {
    if (await shopClick(button, shopCtx())) return;
  } catch (error) {
    say(error.message || "The shop hit a snag.");
    return;
  }
  if (button.dataset.action === "more-notes" || button.dataset.action === "more-feed") {
    const y = window.scrollY;
    state.homeNotes = (state.homeNotes || 3) + 3;
    state.homePlates = (state.homePlates || 6) + 4;
    render();
    window.scrollTo(0, y);
    return;
  }
  if (button.dataset.action === "jump-note") {
    document.querySelector(`[data-note="${CSS.escape(String(button.dataset.id || ""))}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (button.dataset.action === "play-film") {
    const card = button.closest(".film-card");
    const video = card?.querySelector("video");
    if (card && video) {
      card.classList.add("is-playing");
      video.play().catch(() => {});
    }
    return;
  }
  if (button.closest("a.card")) event.preventDefault();
  if (button.dataset.cuisine) { state.cuisine = button.dataset.cuisine; render(); return; }
  if (button.dataset.shelf) {
    state.shelfCategory = button.dataset.shelf;
    state.shelfQ = "";
    state.shelfFocus = false;
    await loadShelf();
    return;
  }
  const action = button.dataset.action;
  try {
    if (action === "zoom-recipe-image") {
      event.preventDefault();
      event.stopPropagation();
      const src = button.dataset.src;
      const title = button.dataset.title || "Recipe Photograph";
      const credit = button.dataset.credit || "Photograph for Lisa's Recipe Book";
      if (src) {
        state.zoomedImage = { src, title, credit };
        render();
      }
      return;
    }
    if (action === "close-zoom-image") {
      if (button.classList.contains("image-zoom-backdrop") && event.target !== button) return;
      event.preventDefault();
      state.zoomedImage = null;
      render();
      return;
    }
    if (action === "open-post-modal") {
      event.preventDefault();
      const id = button.dataset.id;
      const mediaIdx = Number(button.dataset.mediaIndex || 0);
      openPostModal(id, mediaIdx);
      return;
    }
    if (action === "close-lightbox" || action === "close-lightbox-backdrop") {
      if (action === "close-lightbox-backdrop" && event.target !== button) return;
      event.preventDefault();
      closePostModal();
      return;
    }
    if (action === "lightbox-prev") {
      event.preventDefault();
      event.stopPropagation();
      const visual = getActiveModalVisuals();
      if (visual.length) {
        state.lightboxMediaIndex = (state.lightboxMediaIndex - 1 + visual.length) % visual.length;
        render();
      }
      return;
    }
    if (action === "lightbox-next") {
      event.preventDefault();
      event.stopPropagation();
      const visual = getActiveModalVisuals();
      if (visual.length) {
        state.lightboxMediaIndex = (state.lightboxMediaIndex + 1) % visual.length;
        render();
      }
      return;
    }
    if (action === "lightbox-thumb") {
      event.preventDefault();
      event.stopPropagation();
      state.lightboxMediaIndex = Number(button.dataset.index || 0);
      render();
      return;
    }
    if (action === "copy-post-link") {
      event.preventDefault();
      event.stopPropagation();
      const id = button.dataset.id;
      const url = `${location.origin}${location.pathname}#/post/${id}`;
      try {
        await navigator.clipboard.writeText(url);
        say("Link copied! Share it with the family.");
      } catch {
        say("Could not copy link automatically.");
      }
      return;
    }
    if (action === "send-post-message" || action === "share-post") {
      event.preventDefault();
      event.stopPropagation();
      const id = button.dataset.id;
      const note = (state.notes || []).find(n => String(n.id) === String(id)) || state.activeModalPost || { id, title: button.dataset.title || "Family Post" };
      openShareModal(note);
      return;
    }
    if (action === "close-share-modal") {
      if (button.classList.contains("share-backdrop") && event.target !== button) return;
      event.preventDefault();
      closeShareModal();
      return;
    }
    if (action === "focus-comment") {
      event.preventDefault();
      const id = button.dataset.id;
      openPostModal(id);
      setTimeout(() => {
        const input = document.querySelector(".lightbox-comment-input");
        if (input) input.focus();
      }, 150);
      return;
    }
    if (action === "filter-feed") {
      event.preventDefault();
      state.feedFilter = button.dataset.filter || "all";
      render();
      return;
    }
    if (action === "drop-comment-pick") {
      event.preventDefault();
      const key = button.dataset.key;
      if (key && state.commentPicks) {
        delete state.commentPicks[key];
        render();
      }
      return;
    }
    if (action === "post-note") {
      event.preventDefault();
      const form = button.closest("form");
      if (form) await postNote(form);
      return;
    }
    if (await deskAction(action, button)) return;
    if (action === "print") window.print();
    if (action === "copy") { await navigator.clipboard.writeText(button.dataset.text); say("Copied."); }
    if (action === "share") {
      const payload = { title: button.dataset.title, url: button.dataset.url, text: button.dataset.title };
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`); say("Copied, ready to send."); }
    }
    if (action === "timer-start") startTimer(document.getElementById("timer-min")?.value);
    if (action === "timer-reset") resetTimer();
    if (action === "install-app") await installApp();
    if (action === "toggle-password") {
      const input = button.parentElement?.querySelector("input");
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "Show password" : "Hide password";
    }
    if (action === "dismiss-install") { localStorage.setItem("lisa-install-hide", "1"); state.showInstall = ""; render(); }
    if (action === "open-source") {
      const current = state.recipes.find((item) => item.id === route().id);
      await openSource(button.dataset.url, button.dataset.title, current);
    }
    if (action === "close-reader") { state.reader = null; render(); }
    if (action === "reader-back") {
      if (state.reader?.stack?.length > 1) { state.reader.stack.pop(); render(); }
      else { state.reader = null; render(); }
    }
    if (action === "crumb") { state.reader.stack = state.reader.stack.slice(0, Number(button.dataset.index) + 1); render(); }
    if (action === "delete-recipe" && confirm("Remove this recipe from the book?")) {
      await api(`/api/recipes/${button.dataset.id}`, { method: "DELETE" });
      state.recipes = state.recipes.filter((item) => item.id !== button.dataset.id);
      go("#/");
    }
    if (action === "delete-media") {
      const data = await api(`/api/recipes/${button.dataset.id}/media/${button.dataset.media}`, { method: "DELETE" });
      replaceRecipe(data.recipe);
    }
    if (action === "edit-note") {
      const note = state.notes.find((item) => String(item.id) === button.dataset.id);
      if (!note) return;
      state.editingNote = note.id;
      state.noteDraft = note.body || "";
      state.noteFiles.forEach((item) => URL.revokeObjectURL(item.url));
      state.noteFiles = [];
      render();
      document.querySelector(".composer")?.scrollIntoView({ block: "start" });
      document.getElementById("note-body")?.focus();
    }
    if (action === "cancel-note") {
      state.editingNote = "";
      state.noteDraft = "";
      render();
    }
    if (action === "delete-note" && confirm("Delete this note?")) {
      if (String(state.editingNote) === String(button.dataset.id)) {
        state.editingNote = "";
        state.noteDraft = "";
      }
      await api(`/api/notes/${button.dataset.id}`, { method: "DELETE" });
      await refreshPrivate();
      say("Note removed.");
      render();
    }
    if (action === "note-pick") document.getElementById(`note-pick-${button.dataset.kind}`)?.click();
    if (action === "drop-file") {
      const gone = state.noteFiles.find((item) => item.id === button.dataset.id);
      if (gone) URL.revokeObjectURL(gone.url);
      state.noteFiles = state.noteFiles.filter((item) => item.id !== button.dataset.id);
      const box = document.getElementById("note-body");
      if (box) state.noteDraft = box.value;
      render();
    }
    if (action === "edit-library") { rememberFilm(); state.libraryEdit = button.dataset.id; render(); }
    if (action === "cancel-library-edit") { state.libraryEdit = ""; render(); }
    if (action === "react") {
      event.preventDefault();
      const type = button.dataset.type;
      const id = button.dataset.id;
      const kind = button.dataset.kind;
      const lock = `${type}:${id}:${kind}`;
      if (state.reacting === lock) return;
      state.reacting = lock;
      flipSocial(type, id, kind);
      render();
      try {
        const result = await api("/api/reactions", { method: "POST", json: { targetType: type, targetId: id, kind } });
        applyReaction(type, id, result);
        render();
        refreshPrivate().then(() => {
          if (type === "world" && route().name === "world") return ensureWorld(route().id);
          render();
        }).catch(() => {});
      } catch (error) {
        flipSocial(type, id, kind);
        render();
        say(error.message || "That did not work.");
      } finally {
        state.reacting = "";
      }
    }
    if (action === "follow") {
      const result = await api(`/api/people/${button.dataset.id}/follow`, { method: "POST" });
      const person = (state.people || []).find((item) => String(item.id) === String(button.dataset.id));
      if (person) {
        const was = person.following;
        person.following = result.following;
        person.followers = Math.max(0, (person.followers || 0) + (result.following && !was ? 1 : !result.following && was ? -1 : 0));
      }
      if (state.profile && String(state.profile.id) === String(button.dataset.id)) {
        state.profile.following = result.following;
        state.profile.followers = person ? person.followers : state.profile.followers;
      }
      render();
    }
    if (action === "delete-comment" && confirm("Delete this comment?")) {
      await api(`/api/comments/${button.dataset.id}`, { method: "DELETE" });
      dropComment(button.dataset.id);
      render();
      refreshPrivate().then(() => render()).catch(() => {});
    }
    if (action === "delete-library" && confirm("Delete this?")) {
      await api(`/api/library/${button.dataset.id}`, { method: "DELETE" });
      if (String(state.libraryEdit) === String(button.dataset.id)) state.libraryEdit = "";
      await refreshPrivate();
      say("Deleted.");
      render();
    }
    if (action === "camera-open") await openCamera(state.recording?.facing || "environment");
    if (action === "camera-flip") await openCamera(state.recording?.facing === "user" ? "environment" : "user");
    if (action === "camera-close") closeCamera();
    if (action === "record") {
      if (state.recording?.on) stopRecording();
      else await startRecording();
    }
    if (action === "keep-recipe") {
      const data = await api(`/api/world/${button.dataset.id}/keep`, { method: "POST" });
      replaceRecipe(data.recipe);
      say("Added to the book.");
      render();
    }
    if (action === "retry-world") {
      delete state.worldCache[route().id];
      state.worldMiss = "";
      state.worldError = "";
      state.worldLoading = false;
      render();
    }
    if (action === "preview-ringer") {
      try { await previewCallSound(); }
      catch { say("The phone did not play that sound. Tap the page once and try again."); }
      return;
    }
    if (action === "clear-ringer") {
      await clearCallSound();
      state.ringerName = "";
      say("Calls will use the book's ring.");
      render();
      return;
    }
    if (action === "sign-out") {
      localStorage.removeItem("lisa-token");
      state.user = null;
      state.menu = false;
      if (!location.hash || location.hash === "#/" || location.hash === "#") render();
      else go("#/");
    }
    if (action === "toggle-menu") {
      state.menu = !state.menu;
      state.menuFresh = state.menu;
      render();
    }
    if (action === "close-menu") {
      state.menu = false;
      render();
    }
  } catch (error) {
    if (error?.name !== "AbortError") say(error.message || "That did not work.");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "q") {
    state.q = event.target.value;
    state.qFocus = true;
    state.qCaret = event.target.selectionStart;
    render();
    const field = document.getElementById("q");
    if (field) { field.focus(); field.setSelectionRange(state.qCaret, state.qCaret); }
    clearTimeout(state.bookTimer);
    state.bookTimer = setTimeout(runBookSearch, 350);
  }
  if (event.target.id === "note-body") state.noteDraft = event.target.value;
  if (event.target.closest?.("#film-form")) rememberFilm();
  if (event.target.id === "shelf-q") {
    state.shelfQ = event.target.value;
    state.shelfFocus = true;
    state.shelfCaret = event.target.selectionStart;
    clearTimeout(state.shelfTimer);
    state.shelfTimer = setTimeout(() => { loadShelf(); }, 400);
  }
});

document.addEventListener("change", async (event) => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.dataset.commentFile) {
    const form = input.closest("form");
    const file = input.files?.[0];
    input.value = "";
    if (!form || !file?.size) return;
    if (file.size > 40_000_000) {
      say("That video is too long. Try a shorter clip.");
      return;
    }
    const kind = input.dataset.commentFile === "video" ? "video" : "image";
    const stored = kind === "image" ? await shrinkImage(file) : file;
    state.commentPicks[`${form.dataset.type}:${form.dataset.id}`] = { file: stored, kind, name: file.name };
    render();
    return;
  }
  if (input instanceof HTMLInputElement && input.id === "ringer-file") {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      state.ringerName = await saveCallSound(file);
      say("That sound will play when the book is open and someone calls.");
      render();
    } catch (error) {
      say(error.message || "That sound did not save.");
    }
    return;
  }
  if (!(input instanceof HTMLInputElement) || !input.dataset.notePick) return;
  try {
    const box = document.getElementById("note-body");
    if (box) state.noteDraft = box.value;
    const incoming = [...(input.files || [])];
    input.value = "";
    for (const file of incoming) {
      if (!file?.size) {
        say("That file did not come through. Try it again.");
        continue;
      }
      if (file.size > 40_000_000) {
        say("That video is too long for the notepad. Try a shorter clip.");
        continue;
      }
      const picked = input.dataset.notePick;
      let kind = fileKind(file);
      if (picked === "video") kind = "video";
      if (picked === "image" && kind !== "video") kind = "image";
      const stored = kind === "image" ? await shrinkImage(file) : file;
      state.noteFiles.push({
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file: stored,
        url: URL.createObjectURL(stored),
        kind,
        name: fileLabel(file, kind)
      });
    }
    render();
  } catch (error) {
    say(error.message || "That file did not come through. Try it again.");
  }
});

let noteBusy = false;
async function postNote(form) {
  if (noteBusy) return;
  noteBusy = true;
  const formData = new FormData(form);
  const text = String(formData.get("body") || state.noteDraft || "").trim();
  const title = String(formData.get("title") || "").trim() || text.split("\n")[0].slice(0, 80) || "Family Story";
  const files = state.noteFiles.slice();
  try {
    if (state.editingNote) {
      const payload = { body: text, title };
      const editingId = state.editingNote;
      const result = await api(`/api/notes/${editingId}`, { method: "PATCH", json: payload });
      const saved = result.note || {};
      state.notes = state.notes.map((item) => String(item.id) === String(editingId) ? {
        ...item,
        ...saved,
        attachments: saved.attachments?.length ? saved.attachments : item.attachments,
        author: item.author,
        social: item.social
      } : item);
      state.editingNote = "";
      state.noteDraft = "";
      say("Note saved.");
      refreshPrivate().then(() => render()).catch(() => {});
      return;
    }
    if (!text && !files.length) throw new Error("Write a note, or add a picture or video.");
    state.notePosting = true;
    state.noteDraft = text;
    render();
    const attachments = [];
    for (const item of files) {
      const saved = await uploadFileFast(item.file, item.name);
      const kind = item.kind === "video" || saved.kind === "video" ? "video" : item.kind === "image" || saved.kind === "image" ? "image" : "file";
      attachments.push({ path: saved.path, name: item.name, kind });
    }
    const result = await api("/api/notes", { method: "POST", json: { title, body: text, attachments } });
    const note = {
      id: result.note?.id,
      title: result.note?.title || title,
      body: text,
      attachments: result.note?.attachments?.length ? result.note.attachments : attachments,
      updatedAt: result.note?.updatedAt || new Date().toISOString(),
      author: result.note?.author || state.user || { name: "Family" },
      social: result.note?.social || { likes: 0, stars: 0, liked: false, starred: false, comments: [] }
    };
    files.forEach((item) => URL.revokeObjectURL(item.url));
    state.noteFiles = state.noteFiles.filter((item) => !files.includes(item));
    state.noteDraft = "";
    state.notePosting = false;
    state.notes = [note, ...state.notes.filter((item) => String(item.id) !== String(note.id))];
    say("Post published to family board!");
    render();
    refreshPrivate().then(() => render()).catch(() => {});
  } catch (error) {
    state.notePosting = false;
    say(error.message || "That note did not post. Try it again.");
  } finally {
    noteBusy = false;
  }
}

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    if (await deskSubmit(form, data)) return;
    if (await shopSubmit(form, shopCtx())) return;
    if (form.classList.contains("comment-form")) {
      const text = String(data.body || "").trim();
      const type = form.dataset.type;
      const id = form.dataset.id;
      const key = `${type}:${id}`;
      const picked = state.commentPicks?.[key];
      if (!text && !picked?.file) throw new Error("Write a comment, or add a picture or video.");
      const button = form.querySelector("[type=submit]");
      if (button) button.textContent = "Posting…";
      const attachments = [];
      if (picked?.file) {
        const saved = await uploadFileFast(picked.file, picked.name);
        const kind = picked.kind === "video" || saved.kind === "video" ? "video" : "image";
        attachments.push({ path: saved.path, name: picked.name, kind });
      }
      const result = await api("/api/comments", { method: "POST", json: { targetType: type, targetId: id, body: text, attachments } });
      delete state.commentPicks[key];
      const newComment = result.comment || {
        id: `new-${Date.now()}`,
        body: text,
        attachments,
        createdAt: new Date().toISOString(),
        author: state.user || { name: "Family" }
      };
      pushComment(type, id, newComment);
      if (state.activeModalPost && String(state.activeModalPost.id) === String(id)) {
        if (!state.activeModalPost.social) state.activeModalPost.social = { likes: 0, comments: [] };
        if (!Array.isArray(state.activeModalPost.social.comments)) state.activeModalPost.social.comments = [];
        if (!state.activeModalPost.social.comments.some(c => String(c.id) === String(newComment.id))) {
          state.activeModalPost.social.comments.push(newComment);
        }
      }
      form.reset();
      const input = form.querySelector("input[name=body]");
      if (input) input.value = "";
      say("Comment added!");
      render();
      refreshPrivate().then(() => {
        if (type === "world" && route().name === "world") return ensureWorld(route().id);
        render();
      }).catch(() => {});
      return;
    }
    if (form.id === "register-form" || form.id === "login-form") {
      const result = await api(form.id === "login-form" ? "/api/auth/login" : "/api/auth/register", { method: "POST", json: data });
      localStorage.setItem("lisa-token", result.token);
      state.user = result.user;
      await refreshPrivate();
      say(`Welcome, ${result.user.name}.`);
      go("#/");
    }
    if (form.id === "profile-form") {
      const result = await api("/api/auth/me", { method: "PATCH", json: { name: data.name, bio: data.bio, avatarUrl: data.avatarUrl } });
      state.user = result.user;
      say("Profile saved.");
      render();
    }
    if (form.id === "avatar-form") {
      const body = new FormData();
      const picture = await shrinkImage(new FormData(form).get("avatar"));
      body.set("avatar", picture);
      const result = await api("/api/auth/avatar", { method: "POST", body });
      state.user = result.user;
      say("Portrait saved.");
      render();
    }
    if (form.id === "shelf-form") {
      state.shelfQ = String(data.q || "");
      state.shelfFocus = true;
      clearTimeout(state.shelfTimer);
      await loadShelf();
    }
    if (form.id === "recipe-form") {
      const editing = route().name === "edit";
      const result = await api(editing ? `/api/recipes/${route().id}` : "/api/recipes", { method: editing ? "PATCH" : "POST", json: data });
      replaceRecipe(result.recipe);
      go(`#/recipe/${result.recipe.id}`);
    }
    if (form.id === "media-form") {
      const raw = new FormData(form).get("file");
      const picture = raw?.type?.startsWith("image/") ? await shrinkImage(raw) : raw;
      const saved = await uploadPieces(picture, picture?.name);
      const kind = saved.kind === "video" ? "video" : "image";
      const role = kind === "image" && !state.recipes.find((item) => item.id === route().id)?.image ? "cover" : "gallery";
      const result = await api(`/api/recipes/${route().id}/media?kind=${kind}&role=${role}`, { method: "POST", json: { path: saved.path } });
      replaceRecipe(result.recipe);
      say("Picture saved.");
      render();
    }
    if (form.id === "note-form") {
      await postNote(form);
    }
    if (form.id === "link-form") {
      const url = String(data.url || "").trim();
      if (socialLink(url)) throw new Error("TikTok and Facebook stay out of the book. Use YouTube, or a video file you host.");
      const kind = youtubeId(url) ? "youtube" : hostedVideo(url) ? "hosted" : "";
      if (!kind) throw new Error("Paste a YouTube link, or a video file you host that ends in .mp4 or .webm.");
      await api("/api/library", { method: "POST", json: { ...data, url, kind } });
      await refreshPrivate();
      say("Saved for later.");
      render();
    }
    if (form.id === "film-form") {
      rememberFilm();
      const fields = new FormData(form);
      const chosen = fields.get("file");
      const take = state.recording?.blob;
      const file = take?.size ? take : chosen;
      if (!file?.size) throw new Error("Record a take or choose a video first.");
      const title = String(fields.get("title") || "").trim();
      if (!title) throw new Error("Give the film a title.");
      const button = form.querySelector("[type=submit]");
      if (button) button.textContent = "Saving…";
      const started = await api("/api/films", {
        method: "POST",
        json: {
          title,
          description: String(fields.get("description") || ""),
          mime: String(file.type || "video/webm").split(";")[0],
          size: file.size
        }
      });
      try {
        const part = started.partSize || 800_000;
        for (let offset = 0, idx = 0; offset < file.size; offset += part, idx += 1) {
          await api(`/api/films/parts?path=${encodeURIComponent(started.path)}&idx=${idx}`, {
            method: "PUT",
            body: file.slice(offset, offset + part),
            headers: { "Content-Type": "application/octet-stream" }
          });
        }
      } catch (error) {
        await api(`/api/library/${started.id}`, { method: "DELETE" }).catch(() => {});
        throw error;
      }
      closeCamera();
      state.filmDraft = { title: "", description: "" };
      await refreshPrivate();
      say("Film saved in your studio.");
      render();
    }
    if (form.id === "library-edit-form") {
      await api(`/api/library/${data.id}`, { method: "PATCH", json: data });
      state.libraryEdit = "";
      await refreshPrivate();
      say("Saved.");
      render();
    }
  } catch (error) {
    say(error.message);
  }
});

function blankSocial(social) {
  return { likes: 0, stars: 0, liked: false, starred: false, comments: [], ...(social || {}) };
}

function eachTarget(type, id, visit) {
  const mealId = String(id).replace(/^mealdb-/, "");
  const touch = (item) => {
    const key = reactionTarget(item);
    if (key.type === type && key.id === id) item.social = visit(item.social);
  };
  for (const list of [state.shelf, state.featured, state.bookHits]) {
    for (const meal of list || []) {
      if (!meal) continue;
      if (type === "world" && String(meal.id).replace(/^mealdb-/, "") === mealId) meal.social = visit(meal.social);
    }
  }
  for (const recipe of Object.values(state.worldCache)) if (recipe) touch(recipe);
  for (const recipe of state.recipes) touch(recipe);
  for (const note of state.notes) {
    if (type === "note" && String(note.id) === String(id)) note.social = visit(note.social);
  }
  if (state.activeModalPost && type === "note" && String(state.activeModalPost.id) === String(id)) {
    state.activeModalPost.social = visit(state.activeModalPost.social);
  }
  for (const item of state.library) {
    if (type === "film" && String(item.id) === String(id)) item.social = visit(item.social);
  }
  for (const person of state.people || []) {
    if (type === "person" && String(person.id) === String(id)) person.social = visit(person.social);
  }
  if (state.profile && type === "person" && String(state.profile.id) === String(id)) {
    state.profile.social = visit(state.profile.social);
  }
}

function flipSocial(type, id, kind) {
  eachTarget(type, id, (social) => {
    const box = blankSocial(social);
    if (kind === "star") {
      box.starred = !box.starred;
      box.stars = Math.max(0, (Number(box.stars) || 0) + (box.starred ? 1 : -1));
    } else {
      box.liked = !box.liked;
      box.likes = Math.max(0, (Number(box.likes) || 0) + (box.liked ? 1 : -1));
    }
    return box;
  });
}

function applyReaction(type, id, result) {
  eachTarget(type, id, (social) => ({
    ...blankSocial(social),
    likes: Number(result?.likes) || 0,
    stars: Number(result?.stars) || 0,
    liked: Boolean(result?.liked),
    starred: Boolean(result?.starred)
  }));
}

function pushComment(type, id, comment) {
  eachTarget(type, id, (social) => {
    const box = blankSocial(social);
    const comments = Array.isArray(box.comments) ? box.comments : [];
    if (comment?.id && comments.some((item) => String(item.id) === String(comment.id))) return box;
    box.comments = [...comments, comment];
    return box;
  });
}

function dropComment(commentId) {
  const drop = (social) => {
    const box = blankSocial(social);
    box.comments = (box.comments || []).filter((item) => String(item.id) !== String(commentId));
    return box;
  };
  for (const list of [state.shelf, state.featured, state.bookHits]) {
    for (const meal of list || []) if (meal) meal.social = drop(meal.social);
  }
  for (const recipe of Object.values(state.worldCache)) if (recipe) recipe.social = drop(recipe.social);
  for (const recipe of state.recipes) recipe.social = drop(recipe.social);
  for (const note of state.notes) note.social = drop(note.social);
  for (const item of state.library) item.social = drop(item.social);
}

async function runBookSearch() {
  const q = state.q.trim();
  const seq = ++state.bookHitSeq;
  if (!q || matchingRecipes().length) {
    state.bookHits = [];
    state.bookHitNote = "";
    state.bookHitLoading = false;
    if (route().name === "home") render();
    return;
  }
  state.bookHitLoading = true;
  try {
    const data = await api(`/api/world?q=${encodeURIComponent(q)}`);
    if (seq !== state.bookHitSeq) return;
    state.bookHits = data.meals || [];
    state.bookHitNote = data.notice || "";
  } catch (error) {
    if (seq !== state.bookHitSeq) return;
    state.bookHits = [];
    state.bookHitNote = error.message || "The open library could not be reached.";
  }
  state.bookHitLoading = false;
  if (route().name === "home") {
    render();
    const field = document.getElementById("q");
    if (field && state.qFocus) {
      field.focus();
      const pos = state.qCaret ?? field.value.length;
      field.setSelectionRange(pos, pos);
    }
  }
}

async function loadShelf() {
  const seq = ++state.shelfSeq;
  state.shelfLoading = true;
  try {
    const params = new URLSearchParams();
    if (state.shelfQ) params.set("q", state.shelfQ);
    else if (state.shelfCategory) params.set("category", state.shelfCategory);
    const data = await api(`/api/world?${params}`);
    if (seq !== state.shelfSeq) return;
    state.shelf = data.meals;
    state.shelfNotice = data.notice || "";
    state.shelfCategories = data.categories;
    if (!state.shelfQ) state.shelfCategory = data.category || state.shelfCategory;
    if (!state.featured.length && !state.shelfQ) state.featured = data.meals.slice(0, 6);
    state.shelfError = "";
  } catch (error) {
    if (seq !== state.shelfSeq) return;
    state.shelfError = error.message;
  }
  state.shelfLoading = false;
  render();
  const field = document.getElementById("shelf-q");
  if (field && state.shelfFocus) {
    field.focus();
    const pos = state.shelfCaret ?? field.value.length;
    field.setSelectionRange(pos, pos);
  }
}

async function ensureWorld(id) {
  const key = String(id || "");
  state.worldLoading = true;
  state.worldError = "";
  try {
    const data = await api(`/api/world/${encodeURIComponent(key)}`);
    if (!data?.recipe?.title) throw new Error("That plate did not come back.");
    state.worldCache[key] = data.recipe;
  } catch (error) {
    delete state.worldCache[key];
    state.worldError = error.name === "TimeoutError"
      ? "That plate is taking too long. Tap Try again."
      : (error.message || "That plate did not open.");
  }
  state.worldLoading = false;
  if (route().name === "world" && String(route().id) === key) render();
}

function replaceRecipe(recipe) {
  const index = state.recipes.findIndex((item) => item.id === recipe.id);
  if (index >= 0) state.recipes[index] = recipe;
  else state.recipes.unshift(recipe);
  render();
}

async function toggleRecord() {
  if (state.recording?.on) stopRecording();
  else await startRecording();
}

let recClock = null;
let cameraClosing = false;

function rememberFilm() {
  const form = document.getElementById("film-form");
  if (!form) return;
  const data = new FormData(form);
  state.filmDraft = {
    title: String(data.get("title") || ""),
    description: String(data.get("description") || "")
  };
}

function stopClock() {
  clearInterval(recClock);
  recClock = null;
}

function startClock() {
  stopClock();
  recClock = setInterval(() => {
    const el = document.getElementById("rec-clock");
    if (!el || !state.recording?.on || !state.recording.started) return;
    const seconds = Math.max(0, Math.floor((Date.now() - state.recording.started) / 1000));
    el.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }, 250);
}

function recorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function openCamera(facing = "environment") {
  rememberFilm();
  if (!navigator.mediaDevices?.getUserMedia) {
    say("This phone cannot open the camera in the book.");
    return;
  }
  state.recording?.stream?.getTracks().forEach((track) => track.stop());
  if (state.recording?.url) URL.revokeObjectURL(state.recording.url);
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: { ideal: facing } }
    });
  } catch {
    say("Allow the camera, then tap Open camera again.");
    return;
  }
  state.recording = { stream, facing, on: false, blob: null, url: "" };
  render();
  document.querySelector(".stage")?.scrollIntoView({ block: "center" });
}

async function startRecording() {
  if (!state.recording?.stream) return openCamera();
  if (typeof MediaRecorder === "undefined") {
    say("This phone can show the camera, but it cannot record here. Choose a video file instead.");
    return;
  }
  const preview = document.getElementById("live-preview");
  await waitForPicture(preview);
  if (!preview?.videoWidth) {
    say("The camera has not shown a picture yet. Wait a moment, then tap Record.");
    return;
  }
  const mime = recorderMime();
  const stream = state.recording.stream;
  const facing = state.recording.facing;
  let recorder;
  try {
    recorder = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 1_200_000,
      audioBitsPerSecond: 64_000
    });
  } catch {
    say("This phone cannot record in the book. Choose a video file instead.");
    return;
  }
  const chunks = [];
  cameraClosing = false;
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = () => {
    stream.getTracks().forEach((track) => track.stop());
    stopClock();
    if (cameraClosing) {
      state.recording = null;
      render();
      return;
    }
    const type = (recorder.mimeType || mime || "video/webm").split(";")[0];
    const blob = new Blob(chunks, { type });
    rememberFilm();
    state.recording = { blob, url: URL.createObjectURL(blob), on: false, facing };
    render();
  };
  recorder.start(200);
  state.recording = { stream, recorder, facing, on: true, started: Date.now(), blob: null, url: "" };
  rememberFilm();
  render();
  startClock();
}

async function waitForPicture(video) {
  if (!video) return;
  try { await video.play(); } catch { /* the preview may already be playing */ }
  if (video.videoWidth > 0) return;
  await new Promise((resolve) => {
    const finish = () => resolve();
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => finish());
    else video.addEventListener("loadeddata", finish, { once: true });
    setTimeout(finish, 800);
  });
}

function stopRecording() {
  const recorder = state.recording?.recorder;
  if (recorder?.state !== "recording") return;
  if (typeof recorder.requestData === "function") recorder.requestData();
  recorder.stop();
}

function closeCamera() {
  rememberFilm();
  cameraClosing = true;
  stopClock();
  const rec = state.recording;
  if (rec?.url) URL.revokeObjectURL(rec.url);
  if (rec?.recorder?.state === "recording") rec.recorder.stop();
  else {
    rec?.stream?.getTracks().forEach((track) => track.stop());
    state.recording = null;
    render();
  }
}

window.addEventListener("hashchange", () => { state.reader = null; state.menu = false; deskNavigated(); render(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.menu) { state.menu = false; render(); }
});

function saveTimer() {
  localStorage.setItem("lisa-timer", JSON.stringify({
    endAt: timer.running ? timer.endAt : 0,
    pausedRemaining: timer.running ? 0 : timer.pausedRemaining,
    alerted: timer.alerted
  }));
}

function paintTimer() {
  const readout = document.getElementById("timer-readout");
  if (readout) readout.textContent = timerText();
  const button = document.querySelector("[data-action='timer-start']");
  if (button) button.textContent = timer.running ? "Pause" : "Start";
}

function stopTicker() {
  if (timer.handle) clearInterval(timer.handle);
  timer.handle = null;
}

function startTicker() {
  stopTicker();
  timer.handle = setInterval(tickTimer, 250);
}

async function holdScreen() {
  try {
    if (document.visibilityState !== "visible" || !timer.running || !navigator.wakeLock) return;
    wakeLock = await navigator.wakeLock.request("screen");
  } catch { /* a locked phone releases this on its own */ }
}

function releaseScreen() {
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}

async function scheduleTimerAlert(endAt) {
  if (!("Notification" in window) || !navigator.serviceWorker) return;
  if (Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch { return; }
  }
  if (Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.ready;
  const pending = await registration.getNotifications({ tag: "lisa-timer" }).catch(() => []);
  pending.forEach((note) => note.close());
  if ("TimestampTrigger" in window) {
    try {
      await registration.showNotification("Lisa's Recipe Book", {
        body: "The timer is up.",
        tag: "lisa-timer",
        showTrigger: new TimestampTrigger(endAt)
      });
      return;
    } catch { /* the service worker will watch the clock instead */ }
  }
  registration.active?.postMessage({ type: "timer-start", endAt });
}

function clearTimerAlert() {
  navigator.serviceWorker?.ready.then((registration) => {
    registration.active?.postMessage({ type: "timer-clear" });
  }).catch(() => {});
}

function beep() {
  try {
    const context = new AudioContext();
    const tone = (when, freq) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.2, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.35);
      osc.start(when);
      osc.stop(when + 0.36);
    };
    const now = context.currentTime;
    tone(now, 880);
    tone(now + 0.4, 880);
    tone(now + 0.8, 1175);
  } catch { /* the written notice still shows */ }
}

function finishTimer() {
  if (timer.alerted) return;
  timer.alerted = true;
  timer.running = false;
  timer.endAt = 0;
  timer.pausedRemaining = 0;
  stopTicker();
  releaseScreen();
  localStorage.removeItem("lisa-timer");
  beep();
  say("The timer is up.");
  if (navigator.serviceWorker && Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("Lisa's Recipe Book", {
        body: "The timer is up.",
        tag: "lisa-timer",
        renotify: true
      });
    }).catch(() => {});
  }
}

function tickTimer() {
  if (!timer.running) return;
  if (Date.now() >= timer.endAt) finishTimer();
  else paintTimer();
}

function restoreTimer() {
  try {
    const saved = JSON.parse(localStorage.getItem("lisa-timer") || "null");
    if (!saved) return;
    if (saved.endAt && saved.endAt > Date.now()) {
      timer.endAt = saved.endAt;
      timer.running = true;
      timer.alerted = false;
      startTicker();
      holdScreen();
      scheduleTimerAlert(saved.endAt);
      return;
    }
    if (saved.endAt && !saved.alerted) {
      timer.endAt = saved.endAt;
      finishTimer();
      return;
    }
    timer.pausedRemaining = Number(saved.pausedRemaining) || 0;
  } catch { /* a broken save just starts fresh */ }
}

function startTimer(minutesInput) {
  if (timer.running) {
    timer.pausedRemaining = remainingSeconds();
    timer.running = false;
    timer.endAt = 0;
    stopTicker();
    releaseScreen();
    clearTimerAlert();
    saveTimer();
    paintTimer();
    return;
  }
  const seconds = timer.pausedRemaining || Math.max(0, Number(minutesInput) || 0) * 60;
  if (!seconds) return;
  timer.alerted = false;
  timer.pausedRemaining = 0;
  timer.endAt = Date.now() + seconds * 1000;
  timer.running = true;
  saveTimer();
  startTicker();
  holdScreen();
  scheduleTimerAlert(timer.endAt);
  paintTimer();
}

function resetTimer() {
  timer.running = false;
  timer.endAt = 0;
  timer.pausedRemaining = 0;
  timer.alerted = false;
  stopTicker();
  releaseScreen();
  clearTimerAlert();
  localStorage.removeItem("lisa-timer");
  render();
}

async function installApp() {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const choice = await deferredInstall.userChoice.catch(() => null);
  deferredInstall = null;
  if (choice?.outcome === "accepted") localStorage.setItem("lisa-install-hide", "1");
  state.showInstall = "";
  render();
}

function offerInstall() {
  if (installedAlready() || localStorage.getItem("lisa-install-hide")) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const android = /android/i.test(navigator.userAgent);
  if (ios) state.showInstall = "ios";
  else if (deferredInstall) state.showInstall = "ready";
  else if (android) state.showInstall = "help";
  else state.showInstall = deferredInstall ? "ready" : "";
}

async function rememberIfInstalled() {
  if (installedAlready()) {
    localStorage.setItem("lisa-install-hide", "1");
    state.showInstall = "";
    return;
  }
  try {
    const related = await navigator.getInstalledRelatedApps?.();
    if (related?.length) {
      localStorage.setItem("lisa-install-hide", "1");
      state.showInstall = "";
    }
  } catch { /* the card can still be closed by hand */ }
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstall = event;
  if (!localStorage.getItem("lisa-install-hide") && !installedAlready()) {
    state.showInstall = "ready";
    render();
  }
});

window.addEventListener("appinstalled", () => {
  localStorage.setItem("lisa-install-hide", "1");
  state.showInstall = "";
  deferredInstall = null;
  render();
});

document.addEventListener("visibilitychange", () => {
  if (installedAlready()) {
    localStorage.setItem("lisa-install-hide", "1");
    state.showInstall = "";
    paintInstall();
  }
  if (document.visibilityState === "visible") {
    tickTimer();
    if (timer.running) holdScreen();
  }
});

window.addEventListener("pageshow", () => tickTimer());

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=5").catch(() => {});
restoreTimer();
offerInstall();
rememberIfInstalled().catch(() => {});

async function openSpokenFind(forced) {
  const params = new URLSearchParams(location.search);
  const spoken = String(forced ?? params.get("find") ?? "").trim().slice(0, 160);
  if (!spoken) {
    if (forced == null && params.has("find") && (location.hash || "#/") !== "#/search") location.hash = "#/search";
    return;
  }
  state.searchQ = spoken;
  if ((location.hash || "#/") !== "#/search") location.hash = "#/search";
  try {
    state.searchResult = await api(`/api/search?q=${encodeURIComponent(spoken)}`);
  } catch (error) {
    state.searchResult = { query: spoken, recipes: [], meals: [], notes: [], films: [], messages: [], missing: [], notice: error.message || "The search did not finish." };
  }
}

// 1. Bind desk communications and render initial shell immediately
try {
  bindDesk({ state, api, esc, go, say, face, render, route });
} catch {}
render();

// 2. Load recipes, notes, and user data asynchronously
async function bootApp() {
  try {
    const boot = await api("/api/recipes").catch(() => null);
    if (boot?.recipes) {
      state.recipes = boot.recipes;
      render();
    }
  } catch (err) {
    console.warn("Recipes load notice:", err);
  }

  try {
    loadShelf().catch(() => {});
  } catch {}

  try {
    await loadFeedNotes();
    render();
  } catch (err) {
    console.warn("Notes load notice:", err);
  }

  try {
    const me = await api("/api/auth/me").catch(() => null);
    if (me?.user) {
      state.user = me.user;
      await refreshPrivate();
      render();
    }
  } catch {}

  try {
    const initialRoute = route();
    if (initialRoute.name === "post" && initialRoute.id) {
      const match = (state.notes || []).find((n) => String(n.id) === String(initialRoute.id));
      if (match) {
        state.activeModalPost = match;
        render();
      }
    }
  } catch {}

  try {
    state.ringerName = await ringerLabel().catch(() => "");
    setInterval(() => { deskTick().catch(() => {}); }, 2500);
    await openSpokenFind();
    window.launchQueue?.setConsumer?.((params) => {
      try {
        const next = new URL(params?.targetURL || "", location.origin);
        const spoken = next.searchParams.get("find") || "";
        if (spoken) openSpokenFind(spoken);
      } catch {}
    });
  } catch {}

  render();
}

bootApp().catch((err) => {
  console.error("bootApp caught:", err);
  render();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.zoomedImage) {
      state.zoomedImage = null;
      render();
      return;
    }
    if (state.shareDialogPost) {
      state.shareDialogPost = null;
      render();
      return;
    }
    if (state.activeModalPost) {
      closePostModal();
      return;
    }
  }
  if (state.activeModalPost) {
    const visual = getActiveModalVisuals();
    if (!visual.length) return;
    if (e.key === "ArrowLeft") {
      state.lightboxMediaIndex = (state.lightboxMediaIndex - 1 + visual.length) % visual.length;
      render();
    } else if (e.key === "ArrowRight") {
      state.lightboxMediaIndex = (state.lightboxMediaIndex + 1) % visual.length;
      render();
    }
  }
});
