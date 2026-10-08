import { attachCallMedia, bindDesk, callLayer, clearCallSound, deskAction, deskNavigated, deskSubmit, deskTick, linkTools, messagesView, pageLink, paintDeskBadge, previewCallSound, ringerLabel, saveCallSound, searchView, warmRinger } from "./desk.js?v=26";
import { loadCart, shopClick, shopSubmit, shopView, addRecipeIngredientsToCart } from "./shop.js?v=6";

const API = window.APP_CONFIG?.apiBase || "";
const LISA_CHANNEL_ID = "UCOQlqCabDLlzQEzlcHfvXzg";

const DEFAULT_VIDEO_CHANNELS = [
  {
    id: "lisas-channel",
    name: "Lisa's Kitchen Studio",
    handle: "@LisasKitchenStudio",
    tagline: "Homestyle Southern Traditions, Cajun Dark Roux & Survivor Kitchen",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: true,
    isOfficial: true,
    videos: [
      {
        id: "lisa-frito-pie",
        title: "LOADED WALKING BAG FRITO PIE",
        channel: "Lisa's Kitchen Studio",
        duration: "Quick Tutorial",
        youtube: "https://www.youtube.com/watch?v=_TwRwMX_pz0",
        thumbnail: "https://i4.ytimg.com/vi/_TwRwMX_pz0/hqdefault.jpg",
        category: "cooking",
        recipeId: "loaded-walking-bag-frito-pie",
        description: "Crunchy. Cheesy. Beefy. Legendary. Hot homemade beef chili and velvety RoTel queso ladled straight into snack-size Frito bags and loaded high with fixings."
      }
    ]
  },
  {
    id: "cooking-channel",
    name: "Southern & Cajun Kitchen Classics",
    handle: "@SouthernCajunKitchen",
    tagline: "Authentic Dark Roux, Braised Texas Comfort & Cast Iron Baking",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: false,
    videos: [
      {
        id: "curated-gumbo",
        title: "Cook Up Gumbo as Good as Grandma's",
        channel: "Smokin' & Grillin with AB",
        duration: "21:30",
        youtube: "https://www.youtube.com/watch?v=hNOG_FzUMIE",
        thumbnail: "https://img.youtube.com/vi/hNOG_FzUMIE/hqdefault.jpg",
        category: "cooking",
        recipeId: "chicken-sausage-gumbo",
        description: "Learn how to stir a deep chocolate roux, sweat the holy trinity, and simmer rich Cajun chicken and sausage gumbo to perfection."
      },
      {
        id: "curated-pot-roast",
        title: "Best Tender Chuck Pot Roast & Pan Gravy",
        channel: "Natasha's Kitchen",
        duration: "10:45",
        youtube: "https://www.youtube.com/watch?v=Go8b1Cpjr84",
        thumbnail: "https://img.youtube.com/vi/Go8b1Cpjr84/hqdefault.jpg",
        category: "cooking",
        recipeId: "sunday-pot-roast",
        description: "Fall-apart tender beef chuck roast seared and braised slow in rich red wine and beef broth with sweet carrots and tender potatoes."
      },
      {
        id: "curated-peach-cobbler",
        title: "Easy Southern Homemade Peach Cobbler",
        channel: "Preppy Kitchen",
        duration: "8:50",
        youtube: "https://www.youtube.com/watch?v=A_i71qdBnvw",
        thumbnail: "https://img.youtube.com/vi/A_i71qdBnvw/hqdefault.jpg",
        category: "cooking",
        recipeId: "peach-cobbler",
        description: "Warm, sweet spiced peaches bubbling under a golden, tender homemade biscuit crust. A true Sunday dinner staple."
      }
    ]
  },
  {
    id: "gardening-channel",
    name: "Raised Beds & Backyard Kitchen Garden",
    handle: "@KitchenGardenGuides",
    tagline: "Growing Your Own Herbs, Heirloom Tomatoes & Garden-to-Table Pickling",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: false,
    videos: [
      {
        id: "curated-raised-beds",
        title: "7 Raised Bed Gardening Hacks You'll Wish You Knew Sooner",
        channel: "Next Level Gardening",
        duration: "14:12",
        youtube: "https://www.youtube.com/watch?v=gomWBqoOzzE",
        thumbnail: "https://img.youtube.com/vi/gomWBqoOzzE/hqdefault.jpg",
        category: "gardening",
        description: "Essential raised bed tips: the best soil mixture, watering hacks, spacing vegetables, and growing fragrant kitchen herbs."
      },
      {
        id: "curated-pickling",
        title: "How to Make the Best Ever Homemade Dill Pickles",
        channel: "Better Homes and Gardens",
        duration: "6:24",
        youtube: "https://www.youtube.com/watch?v=I_bR01qzQxs",
        thumbnail: "https://img.youtube.com/vi/I_bR01qzQxs/hqdefault.jpg",
        category: "gardening",
        description: "Step-by-step garden cucumber canning: garlic dill brine, keeping your pickles crunchy, and simple water-bath processing."
      }
    ]
  },
  {
    id: "pets-channel",
    name: "The Pet Connection: Healthy Dog Meals & Treats",
    handle: "@HealthyPupsKitchen",
    tagline: "Veterinarian-Safe Cooked Dog Meals, Bone Broths & Homemade Canine Biscuits",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: false,
    videos: [
      {
        id: "curated-dog-meal",
        title: "Complete & Balanced Homemade Fresh Dog Meals",
        channel: "PetCubes Official",
        duration: "11:05",
        youtube: "https://www.youtube.com/watch?v=iP2vIXn6208",
        thumbnail: "https://img.youtube.com/vi/iP2vIXn6208/hqdefault.jpg",
        category: "pets",
        recipeId: "dog-meal-week",
        description: "Nutritionist-formulated, gentle homemade dog food with lean protein, wholesome vegetables, and natural calcium for daily health."
      },
      {
        id: "curated-dog-treats",
        title: "3 Healthy Homemade Dog Treat Recipes",
        channel: "Bigger Bolder Baking with Gemma Stafford",
        duration: "7:45",
        youtube: "https://www.youtube.com/watch?v=OpCNt3qFYpc",
        thumbnail: "https://img.youtube.com/vi/OpCNt3qFYpc/hqdefault.jpg",
        category: "pets",
        recipeId: "pumpkin-dog-biscuits",
        description: "Wholesome 3-ingredient dog treats made with pure pumpkin and dog-safe peanut butter for crunchy, tail-wagging snacks."
      }
    ]
  },
  {
    id: "survivor-channel",
    name: "Survivor Kitchen & Healing Foods",
    handle: "@SurvivorKitchen",
    tagline: "Anti-Inflammatory Broths, Restorative Comfort & Nourishing Meals",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: true,
    videos: [
      {
        id: "curated-healing-broth",
        title: "Ultimate Anti-Inflammatory Bone Broth for Gut & Immunity",
        channel: "The Doctor's Kitchen",
        duration: "12:18",
        youtube: "https://www.youtube.com/watch?v=4iswJTdV-oo",
        thumbnail: "https://img.youtube.com/vi/4iswJTdV-oo/hqdefault.jpg",
        category: "wellness",
        recipeId: "healing-bone-broth",
        description: "Nutrient-dense, slow-simmered bone broth rich in collagen, ginger, turmeric, and healing root aromatics to support recovery and gut health."
      },
      {
        id: "curated-golden-milk",
        title: "Golden Milk Recipe for Rest & Anti-Inflammation",
        channel: "Sasu Flavas",
        duration: "5:32",
        youtube: "https://www.youtube.com/watch?v=6GUhYp0cs9w",
        thumbnail: "https://img.youtube.com/vi/6GUhYp0cs9w/hqdefault.jpg",
        category: "wellness",
        description: "Warm, soothing golden turmeric milk with cinnamon and black pepper for maximum curcumin absorption, restful sleep, and comfort."
      }
    ]
  }
];

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
  fontSize: localStorage.getItem("lisa-font-size") || "regular",
  activeVideo: null,
  showVideoUploadModal: false,
  uploadVideoSource: "file",
  uploadVideoPreview: null,
  uploadSelectedFile: null,
  uploadSelectedExistingVideo: "",
  uploadYouTubeUrl: "",
  uploadSetPrimary: false,
  uploadVideoTitle: "",
  uploadVideoNotes: "",
  uploadSelectedRecipe: "",
  videoChannels: JSON.parse(JSON.stringify(DEFAULT_VIDEO_CHANNELS)),
  videoCategory: "all",
  videoLoading: false,
  recipeCache: {},
  recipeFetching: {},
  teleprompterRecipe: null,
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
try { document.documentElement.setAttribute("data-font-size", state.fontSize); } catch {}
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
        <img class="ribbon-mark" src="/ribbon.svg" alt="Pink Ribbon">
        <span>
          <p class="eyebrow"><span class="survivor-ribbon-tag">🎗️ Breast Cancer Survivor</span> Homestyle Cajun & Texas</p>
          <h1>Lisa's Kitchen & Deliveries</h1>
        </span>
      </a>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div class="typography-switcher" aria-label="Font size switcher" title="Adjust text size for easier reading">
          <span class="type-label"><i class="bi bi-type"></i> Size:</span>
          <button type="button" class="type-btn ${state.fontSize === 'regular' ? 'active' : ''}" data-action="set-font-size" data-size="regular" title="Standard Text">A</button>
          <button type="button" class="type-btn ${state.fontSize === 'large' ? 'active' : ''}" data-action="set-font-size" data-size="large" title="Large Text">A+</button>
          <button type="button" class="type-btn ${state.fontSize === 'senior' ? 'active' : ''}" data-action="set-font-size" data-size="senior" title="Senior High-Legibility Reader">A++</button>
        </div>
        <nav class="nav" aria-label="Desktop navigation">
          <a class="${route().name === 'home' || route().name === 'recipe' ? 'active' : ''}" href="#/"><i class="bi bi-book"></i> Recipes</a>
          <a class="${route().name === 'studio' || route().name === 'videos' ? 'active' : ''}" href="#/studio"><i class="bi bi-camera-reels"></i> Videos & Studio</a>
          <a class="${route().name === 'shop' && route().id !== 'cart' ? 'active' : ''}" href="#/shop"><i class="bi bi-bag"></i> Shop & Errands</a>
          <a class="basket-link ${route().name === 'shop' && route().id === 'cart' ? 'active' : ''}" href="#/shop/cart"><i class="bi bi-cart"></i> Cart${state.cart?.length ? ` (${state.cart.reduce((sum, line) => sum + Number(line.qty || 0), 0)})` : ""}</a>
          <a class="${route().name === 'notes' ? 'active' : ''}" href="#/notes"><i class="bi bi-journal-text"></i> Kitchen Notes</a>
          <a class="${route().name === 'messages' ? 'active' : ''}" href="#/messages"><i class="bi bi-chat-dots"></i> Messages</a>
        </nav>
      </div>
    </header>
    <main class="wrap">${main}</main>
    ${appBar()}
    ${callLayer()}
    ${state.activeVideo ? videoModal() : ""}
    ${state.activeModalPost ? lightboxModal() : ""}
    ${state.shareDialogPost ? shareDialog() : ""}
    ${state.zoomedImage ? imageZoomModal() : ""}
    ${state.showVideoUploadModal ? videoUploadModal() : ""}
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
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Privacy & Trust</span></nav>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <h2 class="page-title" style="margin:0;">Privacy & What to Expect</h2>
      <span style="font-size:12px;padding:3px 10px;background:#fce4ec;color:#ad1457;border-radius:999px;font-weight:700;">🎗️ Lisa's Survivor Kitchen</span>
    </div>
    <p style="font-size:16px;line-height:1.6;color:var(--muted);max-width:720px;">
      Lisa's Recipe Book & Errand Delivery Service is built on family trust, honest food, and community care. We want you to feel safe, respected, and in complete control of your experience.
    </p>

    <div style="display:grid;gap:20px;margin-top:20px;">
      <!-- Section 1: What to Expect as a Visitor -->
      <section class="panel" style="border-radius:20px;border-left:5px solid var(--moss);">
        <h3 style="display:flex;align-items:center;gap:8px;font-size:20px;margin:0 0 10px;color:var(--ink);">
          <i class="bi bi-eye-fill" style="color:var(--moss);"></i> 1. What to Expect When Browsing
        </h3>
        <p><strong>Open access for everyone:</strong> You never have to create an account or sign in just to read recipes, check ingredients, watch cooking videos, or look through the shop catalog.</p>
        <ul style="margin:8px 0;padding-left:20px;line-height:1.6;">
          <li><strong>No paywalls:</strong> All family Texas, Cajun, pet treats, and gardening recipes are free to read and print.</li>
          <li><strong>No invasive tracking:</strong> We do not track you across the web, use advertising trackers, or sell your reading habits to data brokers.</li>
          <li><strong>External video playback:</strong> YouTube videos (including Lisa's official channel) play using privacy-enhanced YouTube embeds under YouTube's standard terms.</li>
        </ul>
      </section>

      <!-- Section 2: Profiles, Accounts & Cache Management -->
      <section class="panel" style="border-radius:20px;border-left:5px solid #0088cc;">
        <h3 style="display:flex;align-items:center;gap:8px;font-size:20px;margin:0 0 10px;color:var(--ink);">
          <i class="bi bi-person-badge-fill" style="color:#0088cc;"></i> 2. Your Profile & Account Data
        </h3>
        <p>An account lets you post kitchen notes, save custom recipes, leave comments, follow family members, and access the video recording studio.</p>
        <div style="background:var(--paper);border-radius:12px;padding:14px;margin:12px 0;">
          <strong style="color:var(--ink);display:block;margin-bottom:4px;">🔐 How Your Credentials Are Protected:</strong>
          <span style="font-size:14px;color:var(--muted);line-height:1.5;">
            Passwords are cryptographically scrambled using irreversible salted <strong>bcrypt</strong> hashing. No one—not even the site administrators—can view your raw password.
          </span>
        </div>
        <p><strong>What to do if you clear your browser cache:</strong></p>
        <ul style="margin:8px 0;padding-left:20px;line-height:1.6;">
          <li>Clearing browser cookies or site data simply signs this device out. Your saved recipes, notes, photos, and orders are <em>never</em> lost.</li>
          <li><strong>1-Click Quick Sign-In:</strong> If you are Mom or using Lisa's profile, tap <em>"Quick Sign-In as Lisa"</em> on the login screen to immediately restore your session without retyping passwords.</li>
          <li>To edit your name, bio, or photo, visit your <a href="#/profile">Profile</a> anytime. To permanently remove an account, contact the kitchen administrator.</li>
        </ul>
      </section>

      <!-- Section 3: Shop Orders, Delivery & Payments -->
      <section class="panel" style="border-radius:20px;border-left:5px solid #2e7d32;">
        <h3 style="display:flex;align-items:center;gap:8px;font-size:20px;margin:0 0 10px;color:var(--ink);">
          <i class="bi bi-cart-check-fill" style="color:#2e7d32;"></i> 3. Ordering, Errand Deliveries & Payments
        </h3>
        <p>When you place an order for fresh meals, desserts, pet treats, or a local Lubbock/Wolfforth errand run:</p>
        <ul style="margin:8px 0;padding-left:20px;line-height:1.6;">
          <li><strong>What we collect for fulfillment:</strong> Your name, phone number (for delivery runner texts/calls), drop-off street address, and any special gate/porch instructions.</li>
          <li><strong>Telegram Runner Dispatch:</strong> A dispatch copy of your order is sent to our kitchen's private Telegram chat so runners can pack and deliver your order hot and fresh.</li>
          <li><strong>We NEVER store credit cards:</strong>
            <ul style="margin:4px 0 8px;padding-left:18px;">
              <li><strong>Cash App:</strong> Payments are processed directly through Cash App to cashtag <strong>$Yellow9859</strong>. Cash App secures your banking information independently.</li>
              <li><strong>Square Free Card Processing:</strong> Card payments are securely facilitated through Square's certified payment gateway.</li>
              <li><strong>Cash on Delivery:</strong> You may also arrange cash payment upon delivery directly with the runner.</li>
            </ul>
          </li>
        </ul>
      </section>

      <!-- Section 4: Camera, Audio & Recording Studio -->
      <section class="panel" style="border-radius:20px;border-left:5px solid #d81b60;">
        <h3 style="display:flex;align-items:center;gap:8px;font-size:20px;margin:0 0 10px;color:var(--ink);">
          <i class="bi bi-camera-video-fill" style="color:#d81b60;"></i> 4. Camera, Microphone & Cooking Studio
        </h3>
        <p>Mom's Recording Studio includes a camera preview, audio checks, and teleprompter cue cards to film cooking tutorials:</p>
        <ul style="margin:8px 0;padding-left:20px;line-height:1.6;">
          <li><strong>Permission on demand:</strong> The app only accesses your camera and microphone when you explicitly click <em>"Open camera"</em> or <em>"Record"</em>.</li>
          <li><strong>Local browser stream:</strong> Live video preview stays strictly inside your device's browser memory until you intentionally click <em>"Save film"</em>.</li>
          <li><strong>Private family calls:</strong> Real-time desk video/audio calls are point-to-point and are never recorded or archived on our servers.</li>
        </ul>
      </section>

      <!-- Section 5: What We Promise Never To Do -->
      <section class="panel" style="border-radius:20px;background:#fff8fa;border:1px solid #f8bbd0;">
        <h3 style="display:flex;align-items:center;gap:8px;font-size:20px;margin:0 0 10px;color:#880e4f;">
          <i class="bi bi-shield-fill-check" style="color:#ad1457;"></i> 5. Our Promise to You
        </h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:14px;margin-top:10px;">
          <div style="background:#fff;padding:12px 14px;border-radius:12px;border:1px solid rgba(216,27,96,0.15);">
            <strong style="color:var(--ink);display:flex;align-items:center;gap:6px;">
              <i class="bi bi-x-circle-fill" style="color:#c2185b;"></i> No Selling Your Data
            </strong>
            <p style="margin:4px 0 0;font-size:13px;color:var(--muted);">We never sell, rent, or trade your phone number, email, or address to anyone.</p>
          </div>
          <div style="background:#fff;padding:12px 14px;border-radius:12px;border:1px solid rgba(216,27,96,0.15);">
            <strong style="color:var(--ink);display:flex;align-items:center;gap:6px;">
              <i class="bi bi-x-circle-fill" style="color:#c2185b;"></i> No Pop-Up Advertisements
            </strong>
            <p style="margin:4px 0 0;font-size:13px;color:var(--muted);">This is a family cookbook and kitchen delivery app, not an ad farm.</p>
          </div>
          <div style="background:#fff;padding:12px 14px;border-radius:12px;border:1px solid rgba(216,27,96,0.15);">
            <strong style="color:var(--ink);display:flex;align-items:center;gap:6px;">
              <i class="bi bi-check-circle-fill" style="color:#2e7d32;"></i> Complete Control
            </strong>
            <p style="margin:4px 0 0;font-size:13px;color:var(--muted);">Edit or delete your comments, notes, and profile anytime you choose.</p>
          </div>
        </div>
      </section>

      <!-- Section 6: Contact & Questions -->
      <section class="panel" style="border-radius:20px;text-align:center;padding:24px;">
        <h4 style="font-size:18px;margin:0 0 6px;color:var(--ink);">Have a Question or Need Help with an Order?</h4>
        <p style="margin:0 0 16px;color:var(--muted);font-size:14px;">Reach out directly to Lisa's Kitchen or your assigned errand runner.</p>
        <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;">
          <a class="btn moss" href="#/shop"><i class="bi bi-bag"></i> Browse the Shop</a>
          <a class="btn quiet" href="#/"><i class="bi bi-book"></i> Back to Recipes</a>
        </div>
      </section>
    </div>
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
        <div class="gallery" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%, 180px), 1fr));gap:12px;margin-top:14px;">
          ${(recipe.media || []).map((item) => {
            const isVid = item.kind === "video";
            return `
            <figure class="gallery-media-card" style="margin:0;position:relative;border-radius:14px;overflow:hidden;background:#181818;box-shadow:0 4px 14px rgba(0,0,0,0.12);border:1px solid rgba(0,0,0,0.08);">
              ${isVid ? `
                <div class="gallery-video-wrap" style="position:relative;width:100%;height:140px;background:#000;overflow:hidden;">
                  <video src="${esc(asset(item.path))}" style="width:100%;height:100%;object-fit:cover;" preload="metadata" playsinline muted></video>
                  <button type="button" class="gallery-popout-btn" data-action="popout-recipe-media" data-id="${esc(item.id)}" data-kind="video" data-path="${esc(item.path)}" data-caption="${esc(item.caption || recipe.title)}" title="Pop out and enlarge video" style="position:absolute;inset:0;width:100%;height:100%;background:rgba(0,0,0,0.38);border:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;cursor:pointer;gap:6px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:#d81b60;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(216,27,96,0.5);font-size:20px;">
                      <i class="bi bi-play-fill" style="margin-left:3px;"></i>
                    </div>
                    <span style="font-size:11px;font-weight:700;background:rgba(0,0,0,0.75);padding:3px 10px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;">
                      <i class="bi bi-arrows-fullscreen"></i> Tap to Enlarge
                    </span>
                  </button>
                </div>
              ` : `
                <div class="gallery-image-wrap" data-action="zoom-recipe-image" data-src="${esc(asset(item.path))}" data-title="${esc(item.caption || recipe.title)}" data-credit="${esc(recipe.title + ' Gallery Photo')}" style="position:relative;width:100%;height:140px;cursor:pointer;overflow:hidden;">
                  <img src="${esc(asset(item.path))}" alt="${esc(item.caption || recipe.title)}" style="width:100%;height:100%;object-fit:cover;">
                  <button type="button" class="plate-zoom-hint" data-action="zoom-recipe-image" data-src="${esc(asset(item.path))}" data-title="${esc(item.caption || recipe.title)}" data-credit="${esc(recipe.title + ' Gallery Photo')}" style="position:absolute;inset:0;width:100%;height:100%;background:rgba(0,0,0,0.2);border:0;display:flex;align-items:flex-end;justify-content:flex-end;padding:8px;color:#fff;cursor:pointer;">
                    <span style="background:rgba(0,0,0,0.75);padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:4px;">
                      <i class="bi bi-arrows-fullscreen"></i> Tap to Zoom
                    </span>
                  </button>
                </div>
              `}
              <div style="padding:8px 10px;background:var(--card);display:flex;align-items:center;justify-content:space-between;gap:6px;">
                <span style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;">
                  ${isVid ? `<i class="bi bi-camera-video-fill" style="color:var(--moss);"></i> Video` : `<i class="bi bi-image" style="color:var(--moss);"></i> Photo`}
                  ${item.caption ? ` • ${esc(item.caption)}` : ""}
                </span>
                <div style="display:flex;align-items:center;gap:4px;">
                  <button type="button" class="btn quiet" data-action="${isVid ? 'popout-recipe-media' : 'zoom-recipe-image'}" data-id="${esc(item.id)}" data-kind="${item.kind}" data-path="${esc(item.path)}" data-src="${esc(asset(item.path))}" data-title="${esc(item.caption || recipe.title)}" data-credit="${esc(recipe.title + ' Gallery Photo')}" data-caption="${esc(item.caption || recipe.title)}" style="padding:3px 8px;font-size:11px;font-weight:700;">
                    <i class="bi bi-arrows-fullscreen"></i> Enlarge
                  </button>
                  ${state.user ? `<button class="btn quiet" data-action="delete-media" data-id="${recipe.id}" data-media="${item.id}" style="padding:3px 6px;font-size:11px;">Remove</button>` : ""}
                </div>
              </div>
            </figure>
            `;
          }).join("")}
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
          <button class="btn moss" type="button" data-action="open-video-upload-modal" data-recipe-id="${esc(recipe.id)}" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <i class="bi bi-cloud-arrow-up-fill"></i> Upload a Video
          </button>
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
        ${(() => {
          const yt = youtubeId(recipe.youtube);
          const vids = (recipe.media || []).filter(m => m.kind === "video");
          if (yt) {
            return `
              <div class="recipe-youtube-theater" style="margin:24px 0 20px;background:var(--card);border:2px solid #f48fb1;border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(216,27,96,0.1);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:13px;padding:4px 12px;background:#fce4ec;color:#ad1457;border-radius:999px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                      <i class="bi bi-youtube" style="color:#ff0000;font-size:16px;"></i> Official YouTube Video Tutorial
                    </span>
                    ${vids.length ? `<span style="font-size:11px;padding:2px 8px;background:var(--sand);color:var(--muted);border-radius:999px;font-weight:700;">+${vids.length} extra clip${vids.length > 1 ? 's' : ''}</span>` : ""}
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="btn moss" data-action="popout-recipe-video" data-youtube="${esc(recipe.youtube)}" data-title="${esc(recipe.title)}" style="font-size:13px;padding:6px 14px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                      <i class="bi bi-arrows-fullscreen"></i> Pop Out Theater Player
                    </button>
                    <button type="button" class="btn quiet" data-action="open-video-upload-modal" data-recipe-id="${esc(recipe.id)}" style="font-size:13px;padding:6px 12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                      <i class="bi bi-cloud-arrow-up-fill"></i> Upload Additional Video
                    </button>
                  </div>
                </div>
                <div class="watch" style="border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.15);">
                  <iframe src="https://www.youtube.com/embed/${esc(yt)}?enablejsapi=1&rel=0&playsinline=1" title="${esc(recipe.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                </div>
              </div>
            `;
          }
          if (vids.length > 0) {
            const firstVid = vids[0];
            return `
              <div class="recipe-youtube-theater" style="margin:24px 0 20px;background:var(--card);border:2px solid #f48fb1;border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(216,27,96,0.1);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span style="font-size:13px;padding:4px 12px;background:#fce4ec;color:#ad1457;border-radius:999px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                      <i class="bi bi-camera-video-fill" style="color:#d81b60;font-size:16px;"></i> Kitchen Video Tutorial
                    </span>
                    <span style="font-size:11px;padding:2px 8px;background:#c8e6c9;color:#1b5e20;border-radius:999px;font-weight:700;">Uploaded Video</span>
                    ${vids.length > 1 ? `<span style="font-size:11px;padding:2px 8px;background:var(--sand);color:var(--muted);border-radius:999px;font-weight:700;">+${vids.length - 1} more clip${vids.length > 2 ? 's' : ''}</span>` : ""}
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="btn moss" data-action="popout-recipe-media" data-id="${esc(firstVid.id)}" data-kind="video" data-path="${esc(firstVid.path)}" data-caption="${esc(firstVid.caption || recipe.title)}" style="font-size:13px;padding:6px 14px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                      <i class="bi bi-arrows-fullscreen"></i> Pop Out Theater Player
                    </button>
                    <button type="button" class="btn quiet" data-action="open-video-upload-modal" data-recipe-id="${esc(recipe.id)}" style="font-size:13px;padding:6px 12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
                      <i class="bi bi-cloud-arrow-up-fill"></i> Upload Additional Video
                    </button>
                  </div>
                </div>
                <div class="watch" style="border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.15);aspect-ratio:16/9;background:#000;">
                  <video controls playsinline style="width:100%;height:100%;object-fit:contain;background:#000;" src="${esc(asset(firstVid.path))}"></video>
                </div>
              </div>
            `;
          }
          return `
            <div class="recipe-add-video-prompt" style="margin:20px 0;padding:16px 20px;background:linear-gradient(135deg, #fff0f5 0%, #ffebee 100%);border:1.5px dashed #f48fb1;border-radius:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;border-radius:14px;background:#fce4ec;display:flex;align-items:center;justify-content:center;color:#d81b60;font-size:22px;box-shadow:0 4px 12px rgba(216,27,96,0.15);">
                  <i class="bi bi-camera-reels-fill"></i>
                </div>
                <div>
                  <strong style="color:#880e4f;font-size:15px;display:block;">Cook with Lisa on Video</strong>
                  <span style="font-size:13px;color:#6d4c5d;">Have a cooking video or want to record one? Upload a video file or link YouTube to this recipe!</span>
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="btn moss" data-action="open-video-upload-modal" data-recipe-id="${esc(recipe.id)}" data-source="file" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:8px 16px;">
                  <i class="bi bi-cloud-arrow-up-fill"></i> Upload Video
                </button>
                <button type="button" class="btn quiet" data-action="open-video-upload-modal" data-recipe-id="${esc(recipe.id)}" data-source="youtube" style="font-size:13px;padding:8px 14px;font-weight:600;">
                  <i class="bi bi-youtube" style="color:#ff0000;"></i> Link YouTube
                </button>
              </div>
            </div>
          `;
        })()}
        ${reactBar(reactionTarget(recipe).type, reactionTarget(recipe).id, recipe.social)}
        ${commentsBlock(reactionTarget(recipe).type, reactionTarget(recipe).id, recipe.social)}
        <div class="recipe-cart-card" style="margin:20px 0;padding:16px 20px;background:linear-gradient(135deg, #fff0f5, #ffe4ec);border:1.5px solid #f48fb1;border-radius:18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 6px 20px rgba(216,27,96,0.08);">
          <div>
            <strong style="color:#880e4f;font-size:16px;display:flex;align-items:center;gap:8px;">
              <i class="bi bi-cart-check-fill" style="color:#d81b60;font-size:18px;"></i> Need these groceries for this recipe?
            </strong>
            <p style="margin:3px 0 0;font-size:14px;color:#6d4c5d;">One click adds this recipe's entire ingredient list to your shopping & errand cart.</p>
          </div>
          <button type="button" class="btn moss" data-action="add-recipe-groceries" data-id="${esc(recipe.id)}" style="font-weight:700;display:inline-flex;align-items:center;gap:8px;padding:10px 20px;font-size:15px;border-radius:12px;box-shadow:0 4px 12px rgba(216,27,96,0.22);">
            <i class="bi bi-cart-plus-fill"></i> Add All Ingredients to Cart
          </button>
        </div>

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
      <div class="field">
        <label style="font-weight:700;">Step-by-Step Cooking Video (YouTube link or uploaded video)
          <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
            <input name="youtube" value="${esc(value.youtube || '')}" placeholder="https://www.youtube.com/watch?v=..." style="flex:1;min-width:240px;">
            <button type="button" class="btn quiet" data-action="open-video-upload-modal" data-recipe-id="${esc(value.id || '')}" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;">
              <i class="bi bi-cloud-arrow-up-fill"></i> Upload Video File
            </button>
          </div>
        </label>
        <p style="margin:4px 0 0;font-size:12px;color:var(--muted);">Paste a YouTube link or tap Upload Video to attach a video directly.</p>
      </div>
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

function iconPhoto() {
  return `<i class="bi bi-camera-fill" aria-hidden="true"></i>`;
}

function iconVideo() {
  return `<i class="bi bi-camera-video-fill" aria-hidden="true"></i>`;
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

async function loadChannels(forceSync = false) {
  state.videoLoading = true;
  try {
    const endpoint = forceSync ? "/api/channels/sync" : "/api/channels";
    const res = await api(endpoint).catch(() => null);
    if (res?.channels?.length) {
      state.videoChannels = res.channels;
    }
    // Merge any locally saved custom videos
    try {
      const custom = JSON.parse(localStorage.getItem("lisa_custom_videos") || "[]");
      const lisaChannel = state.videoChannels.find(c => c.id === "lisas-channel");
      if (lisaChannel && custom.length) {
        for (const cv of custom) {
          if (!lisaChannel.videos.some(v => v.id === cv.id || (v.youtube && v.youtube === cv.youtube))) {
            lisaChannel.videos.unshift(cv);
          }
        }
      }
    } catch {}
    render();
  } catch (e) {
    console.warn("Could not load channels", e);
  } finally {
    state.videoLoading = false;
  }
}

async function syncLisaYouTube(interactive = true) {
  if (interactive) say("Checking @LisasKitchenStudio for latest uploads... ⏳");
  try {
    const res = await api("/api/channels/sync").catch(() => null);
    if (res?.channels?.length) {
      state.videoChannels = res.channels;
      render();
      if (interactive) say("Synced with Lisa's YouTube channel! 🎬");
      return;
    }
  } catch {}

  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${LISA_CHANNEL_ID}`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
    const feedRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) });
    if (feedRes.ok) {
      const xml = await feedRes.text();
      const entries = xml.split("<entry>").slice(1);
      const lisaChannel = state.videoChannels.find(c => c.id === "lisas-channel");
      let added = 0;
      if (lisaChannel) {
        for (const entry of entries) {
          const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
          const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
          const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
          const thumbMatch = entry.match(/<media:thumbnail url="([^"]+)"/);
          if (videoIdMatch && titleMatch) {
            const vId = videoIdMatch[1];
            const exists = lisaChannel.videos.some(v => (v.youtube || "").includes(vId));
            if (!exists) {
              lisaChannel.videos.unshift({
                id: `lisa-${vId}`,
                title: titleMatch[1].trim(),
                channel: "Lisa's Kitchen Studio",
                duration: "YouTube Video",
                youtube: `https://www.youtube.com/watch?v=${vId}`,
                thumbnail: thumbMatch ? thumbMatch[1] : `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
                category: "cooking",
                description: descMatch ? descMatch[1].trim() : ""
              });
              added++;
            }
          }
        }
        render();
        if (interactive) say(added > 0 ? `Found ${added} new video(s) on YouTube! 🎬` : "Lisa's YouTube videos are up to date! ✨");
        return;
      }
    }
  } catch {}
  if (interactive) say("YouTube channel is up to date! ✨");
}

async function fetchSingleRecipe(id) {
  try {
    const res = await api(`/api/recipes/${encodeURIComponent(id)}`);
    if (res?.recipe) {
      state.recipeCache = state.recipeCache || {};
      state.recipeCache[id] = res.recipe;
      const idx = state.recipes.findIndex((r) => r.id === id);
      if (idx >= 0) state.recipes[idx] = res.recipe;
      else state.recipes.push(res.recipe);
      render();
    }
  } catch (e) {
    console.warn("Could not fetch recipe", id, e);
  } finally {
    if (state.recipeFetching) delete state.recipeFetching[id];
  }
}

function videoModal() {
  const vid = state.activeVideo;
  if (!vid) return "";
  const ytId = youtubeId(vid.youtube || vid.url);
  return `
    <div class="scrim" data-action="close-video-modal" style="z-index:900;"></div>
    <div class="video-modal-dialog" role="dialog" aria-modal="true" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(95vw, 920px);max-height:94vh;overflow-y:auto;background:var(--card);border:2px solid #f48fb1;border-radius:24px;padding:20px;z-index:910;box-shadow:0 24px 70px rgba(0,0,0,0.45);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;padding:4px 12px;background:#fce4ec;color:#ad1457;border-radius:999px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <i class="bi ${ytId ? 'bi-youtube' : 'bi-camera-video-fill'}"></i> ${esc(vid.channel || "Kitchen Video")}
          </span>
          <span style="font-size:12px;color:var(--muted);font-weight:600;">Theater Mode</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="btn quiet" type="button" data-action="toggle-theater-fullscreen" style="padding:6px 12px;font-size:13px;font-weight:600;" title="Toggle Fullscreen">
            <i class="bi bi-arrows-fullscreen"></i> Fullscreen
          </button>
          <button class="btn quiet" type="button" data-action="close-video-modal" style="padding:6px 14px;font-size:14px;font-weight:600;"><i class="bi bi-x-lg"></i> Close</button>
        </div>
      </div>
      <div style="position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:18px;overflow:hidden;margin-bottom:16px;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
        ${ytId ? `<iframe id="theater-iframe-player" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" src="https://www.youtube.com/embed/${esc(ytId)}?enablejsapi=1&rel=0&playsinline=1&autoplay=1" title="${esc(vid.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` : `<video id="theater-video-player" controls autoplay playsinline style="width:100%;height:100%;object-fit:contain;background:#000;" src="${esc(asset(vid.url || vid.filePath))}"></video>`}
      </div>
      <h3 style="font-size:22px;margin:0 0 8px;font-family:var(--serif);color:var(--ink);">${esc(vid.title)}</h3>
      ${vid.description || vid.notes ? `<p style="color:var(--muted);font-size:15px;margin:0 0 16px;line-height:1.6;">${esc(vid.description || vid.notes)}</p>` : ""}
      <div style="padding-top:14px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
          ${vid.recipeId ? `<a class="btn moss" href="#/recipe/${esc(vid.recipeId)}" data-action="close-video-modal"><i class="bi bi-book"></i> Open Matching Recipe</a>` : ""}
          ${vid.youtube ? `<a class="btn quiet" href="${esc(vid.youtube)}" target="_blank" rel="noopener" style="font-weight:600;"><i class="bi bi-box-arrow-up-right"></i> Open on YouTube</a>` : (!ytId && (vid.url || vid.filePath) ? `<a class="btn quiet" href="${esc(asset(vid.url || vid.filePath))}" download target="_blank" rel="noopener" style="font-weight:600;"><i class="bi bi-download"></i> Download Video</a>` : "")}
        </div>
        <button class="btn quiet" type="button" data-action="close-video-modal" style="font-size:13px;">Done</button>
      </div>
    </div>
  `;
}

function videoUploadModal() {
  const chosenRecipe = state.uploadSelectedRecipe ? state.recipes.find(r => r.id === state.uploadSelectedRecipe) : null;
  const source = state.uploadVideoSource || "file";

  // Check if chosen recipe already has any videos
  const existingVideos = [];
  if (chosenRecipe?.youtube) {
    existingVideos.push({
      kind: "youtube",
      title: "Official YouTube Tutorial",
      url: chosenRecipe.youtube
    });
  }
  if (Array.isArray(chosenRecipe?.media)) {
    for (const m of chosenRecipe.media) {
      if (m.kind === "video") {
        existingVideos.push({
          kind: "video",
          title: m.caption || "Kitchen Video Clip",
          url: m.path
        });
      }
    }
  }

  // Collect all available videos in Lisa's Studio and library
  const availableStudioVideos = [];
  for (const ch of (state.videoChannels || [])) {
    for (const v of (ch.videos || [])) {
      const link = v.url || v.filePath || v.youtube;
      if (link && !availableStudioVideos.some(x => x.url === link)) {
        availableStudioVideos.push({
          id: v.id,
          title: v.title,
          channel: ch.name || "Lisa's Kitchen Studio",
          url: link,
          youtube: v.youtube || (link.includes("youtube") ? link : ""),
          thumbnail: v.thumbnail || ""
        });
      }
    }
  }
  for (const item of (state.library || [])) {
    if ((item.kind === "film" || item.kind === "youtube") && item.url) {
      if (!availableStudioVideos.some(x => x.url === item.url)) {
        availableStudioVideos.push({
          id: `lib-${item.id}`,
          title: item.title,
          channel: "Saved Library Item",
          url: item.url,
          youtube: item.kind === "youtube" ? item.url : "",
          thumbnail: item.thumbnail || ""
        });
      }
    }
  }

  const generatedTitle = state.uploadVideoTitle || (chosenRecipe ? `Lisa's ${chosenRecipe.title} Tutorial` : "Lisa's Homestyle Cooking Video");

  return `
    <div class="scrim" data-action="close-video-upload-modal" style="z-index:900;"></div>
    <div class="video-modal-dialog" role="dialog" aria-modal="true" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(95vw, 700px);max-height:92vh;overflow-y:auto;background:var(--card);border:2px solid #f48fb1;border-radius:24px;padding:22px;z-index:910;box-shadow:0 24px 70px rgba(0,0,0,0.45);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;padding:4px 12px;background:#fce4ec;color:#ad1457;border-radius:999px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">
            <i class="bi bi-camera-reels-fill"></i> Lisa's Video Studio
          </span>
          <h3 style="font-family:var(--serif);font-size:22px;margin:0;color:var(--ink);">Add or Upload Cooking Video</h3>
        </div>
        <button class="btn quiet" type="button" data-action="close-video-upload-modal" style="padding:6px 14px;"><i class="bi bi-x-lg"></i></button>
      </div>

      <p style="font-size:14px;color:var(--muted);margin:0 0 14px;line-height:1.5;">
        Upload a pre-recorded video file from your phone or computer, select a video already in the Studio, or link directly from YouTube.
      </p>

      <!-- Recipe Selector -->
      <div class="field" style="margin-bottom:12px;">
        <label style="font-weight:700;font-size:14px;display:block;margin-bottom:4px;">
          Select Recipe to Connect:
          <select name="recipeId" id="upload-modal-recipe" data-action="upload-recipe-change" style="margin-top:4px;width:100%;font-size:14px;padding:8px 12px;">
            <option value="">No recipe attached (Standalone Studio video)</option>
            ${state.recipes.map(r => `<option value="${esc(r.id)}" ${state.uploadSelectedRecipe === r.id ? 'selected' : ''}>${esc(r.title)}</option>`).join("")}
          </select>
        </label>
      </div>

      <!-- Incase one is already available banner -->
      ${existingVideos.length > 0 ? `
        <div style="background:#f1f8e9;border:1.5px solid #81c784;border-radius:14px;padding:12px 14px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
            <span style="font-weight:700;color:#2e7d32;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
              <i class="bi bi-check-circle-fill"></i> Video already available for ${esc(chosenRecipe?.title)} (${existingVideos.length})
            </span>
            <span style="font-size:11px;background:#c8e6c9;color:#1b5e20;padding:2px 8px;border-radius:999px;font-weight:700;">Active in Book</span>
          </div>
          <p style="font-size:12px;color:#33691e;margin:4px 0 0;line-height:1.4;">
            This recipe already has <strong>${esc(existingVideos[0].title)}</strong> attached. You can add an extra video clip (alternate angle, seasoning tip) or set your new video as the primary tutorial.
          </p>
        </div>
      ` : ""}

      <!-- Source Chooser Tabs -->
      <div style="margin-bottom:14px;">
        <label style="font-weight:700;font-size:13px;color:var(--ink);display:block;margin-bottom:6px;">Choose Video Source:</label>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(170px, 1fr));gap:8px;">
          <button type="button" class="btn ${source === 'file' ? 'moss' : 'quiet'}" data-action="set-upload-source" data-source="file" style="font-weight:700;font-size:13px;padding:8px 10px;justify-content:center;">
            <i class="bi bi-cloud-arrow-up-fill"></i> 1. Upload Video File
          </button>
          <button type="button" class="btn ${source === 'existing' ? 'moss' : 'quiet'}" data-action="set-upload-source" data-source="existing" style="font-weight:700;font-size:13px;padding:8px 10px;justify-content:center;">
            <i class="bi bi-collection-play-fill"></i> 2. Pick Studio Video
          </button>
          <button type="button" class="btn ${source === 'youtube' ? 'moss' : 'quiet'}" data-action="set-upload-source" data-source="youtube" style="font-weight:700;font-size:13px;padding:8px 10px;justify-content:center;">
            <i class="bi bi-youtube" style="${source === 'youtube' ? '' : 'color:#ff0000;'}"></i> 3. Link YouTube URL
          </button>
        </div>
      </div>

      <form id="upload-video-form" class="stack" style="gap:14px;">
        <input type="hidden" name="source" value="${esc(source)}">
        <input type="hidden" name="recipeId" value="${esc(state.uploadSelectedRecipe || '')}">

        <!-- SOURCE 1: FILE UPLOAD -->
        ${source === 'file' ? `
          <div class="field" style="background:#fafafa;padding:14px;border-radius:14px;border:1px solid var(--line);">
            <label style="font-weight:700;font-size:13px;display:block;margin-bottom:6px;">
              Choose Video File (MP4, WebM, MOV):
              <input type="file" id="upload-modal-file" name="file" accept="video/mp4,video/webm,video/quicktime,video/*" data-action="pick-upload-file" ${!state.uploadSelectedFile ? 'required' : ''} style="margin-top:6px;width:100%;padding:10px;border:2px dashed #f48fb1;border-radius:12px;background:#fff8fa;cursor:pointer;">
            </label>
            <div id="upload-preview-container" style="${state.uploadVideoPreview ? 'display:block;' : 'display:none;'}margin-top:10px;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:16/9;box-shadow:0 6px 18px rgba(0,0,0,0.2);">
              <video id="upload-preview-player" controls playsinline style="width:100%;height:100%;object-fit:contain;" src="${esc(state.uploadVideoPreview || '')}"></video>
            </div>
            ${state.uploadSelectedFile ? `<p style="font-size:12px;color:var(--moss);font-weight:600;margin:6px 0 0;"><i class="bi bi-file-earmark-play-fill"></i> Selected: ${esc(state.uploadSelectedFile.name)} (${(state.uploadSelectedFile.size / (1024 * 1024)).toFixed(1)} MB)</p>` : ""}
          </div>
        ` : ""}

        <!-- SOURCE 2: PICK FROM STUDIO/LIBRARY -->
        ${source === 'existing' ? `
          <div class="field" style="background:#fafafa;padding:14px;border-radius:14px;border:1px solid var(--line);">
            <label style="font-weight:700;font-size:13px;display:block;margin-bottom:6px;">
              Select Video Already in Studio or Library:
              <select name="existingVideoUrl" id="upload-modal-existing" data-action="upload-existing-change" style="margin-top:6px;width:100%;font-size:14px;padding:8px 12px;" required>
                <option value="">-- Choose an available video --</option>
                ${availableStudioVideos.map(v => `
                  <option value="${esc(v.url)}" ${state.uploadSelectedExistingVideo === v.url ? 'selected' : ''}>
                    ${esc(v.title)} (${esc(v.channel)})
                  </option>
                `).join("")}
              </select>
            </label>
            ${state.uploadVideoPreview ? `
              <div style="margin-top:10px;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:16/9;box-shadow:0 6px 18px rgba(0,0,0,0.2);">
                ${youtubeId(state.uploadVideoPreview) ? `
                  <iframe style="width:100%;height:100%;border:0;" src="https://www.youtube.com/embed/${esc(youtubeId(state.uploadVideoPreview))}?rel=0" allowfullscreen></iframe>
                ` : `
                  <video controls playsinline style="width:100%;height:100%;object-fit:contain;" src="${esc(asset(state.uploadVideoPreview))}"></video>
                `}
              </div>
            ` : ""}
          </div>
        ` : ""}

        <!-- SOURCE 3: YOUTUBE LINK -->
        ${source === 'youtube' ? `
          <div class="field" style="background:#fafafa;padding:14px;border-radius:14px;border:1px solid var(--line);">
            <label style="font-weight:700;font-size:13px;display:block;margin-bottom:6px;">
              YouTube Video Link:
              <input type="url" name="youtubeUrl" id="upload-modal-youtube-url" data-action="upload-youtube-input" placeholder="https://www.youtube.com/watch?v=_TwRwMX_pz0 or https://youtu.be/..." value="${esc(state.uploadYouTubeUrl || chosenRecipe?.youtube || '')}" style="margin-top:6px;width:100%;" required>
            </label>
            <p style="margin:4px 0 0;font-size:12px;color:var(--muted);">Paste any video, Short, or live stream link from YouTube.</p>
          </div>
        ` : ""}

        <!-- Video Title Input -->
        <div class="field">
          <label style="font-weight:700;font-size:14px;display:block;margin-bottom:4px;">Video Title:
            <input name="title" id="upload-modal-title" required placeholder="e.g. Grandma's Gumbo Tutorial" value="${esc(generatedTitle)}" style="margin-top:4px;width:100%;">
          </label>
        </div>

        <!-- Video Notes Input -->
        <div class="field">
          <label style="font-weight:700;font-size:14px;display:block;margin-bottom:4px;">Notes & Creator Tips:
            <textarea name="notes" id="upload-modal-notes" rows="2" placeholder="Tell viewers what to watch for, temperature tips, or secret seasonings." style="margin-top:4px;width:100%;">${esc(state.uploadVideoNotes || '')}</textarea>
          </label>
        </div>

        ${existingVideos.length > 0 ? `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff8fa;border:1px solid #f8bbd0;border-radius:10px;">
            <input type="checkbox" id="upload-modal-set-primary" name="setPrimary" ${state.uploadSetPrimary ? 'checked' : ''} style="width:18px;height:18px;accent-color:#d81b60;">
            <label for="upload-modal-set-primary" style="font-size:13px;font-weight:600;color:#880e4f;cursor:pointer;">
              Make this the main featured tutorial video for this recipe (replaces current primary video)
            </label>
          </div>
        ` : ""}

        <!-- YouTube Channel Carry-Over Section -->
        <div style="background:linear-gradient(135deg, #fff0f5 0%, #ffebee 100%);border:1.5px solid #f48fb1;border-radius:16px;padding:14px 16px;margin:2px 0;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
            <strong style="color:#c2185b;font-size:14px;display:flex;align-items:center;gap:6px;">
              <i class="bi bi-youtube" style="color:#ff0000;font-size:18px;"></i> Carry Over to @LisasKitchenStudio on YouTube
            </strong>
            <span style="font-size:11px;background:#fce4ec;color:#ad1457;padding:2px 8px;border-radius:999px;font-weight:700;">1-Click Kit</span>
          </div>
          <p style="font-size:12px;color:#6d4c5d;margin:0 0 10px;line-height:1.5;">
            To publish this video on your YouTube channel, launch YouTube Studio below and use our pre-formatted title, description, ingredients, and recipe link:
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
            <button type="button" class="btn quiet" data-action="copy-youtube-kit" style="font-size:12px;padding:6px 12px;font-weight:700;">
              <i class="bi bi-clipboard-check"></i> Copy Title & Description for YouTube
            </button>
            <a class="btn quiet" href="https://studio.youtube.com/channel/UCOQlqCabDLlzQEzlcHfvXzg/videos/upload" target="_blank" rel="noopener" style="font-size:12px;padding:6px 12px;font-weight:700;">
              <i class="bi bi-box-arrow-up-right"></i> Open YouTube Studio Uploader
            </a>
          </div>
          <div class="field" style="margin:0;">
            <label style="font-size:12px;color:#880e4f;font-weight:600;display:block;">
              YouTube URL after publishing (optional):
              <input type="url" name="youtubeCarryOverUrl" id="upload-modal-carryover-url" placeholder="https://www.youtube.com/watch?v=... (paste after uploading to YouTube)" style="margin-top:3px;width:100%;font-size:12px;padding:6px 10px;">
            </label>
          </div>
        </div>

        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:4px;">
          <button class="btn quiet" type="button" data-action="close-video-upload-modal">Cancel</button>
          <button class="btn moss" type="submit" id="upload-modal-submit" style="font-weight:700;padding:10px 20px;font-size:15px;">
            <i class="bi bi-cloud-arrow-up-fill"></i> Save Video to Lisa's Kitchen Studio
          </button>
        </div>
      </form>
    </div>
  `;
}

function studio() {
  if (!state.videoChannels?.length && !state.videoLoading) {
    loadChannels();
  }
  const allChannels = state.videoChannels || [];
  let allVideos = [];
  for (const ch of allChannels) {
    if (ch.videos) {
      for (const v of ch.videos) allVideos.push({ ...v, channelTagline: ch.tagline, channelUrl: ch.url });
    }
  }
  const currentCat = state.videoCategory || "all";
  const filteredVideos = currentCat === "all" ? allVideos : allVideos.filter(v => v.category === currentCat);

  const saved = state.library.filter((item) => item.kind !== "film" && keptLink(item.url));
  const films = state.library.filter((item) => item.kind === "film");
  const teleRecipe = state.teleprompterRecipe ? state.recipes.find(r => r.id === state.teleprompterRecipe) : null;

  return shell(`
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px;">
      <div>
        <div style="display:inline-flex;align-items:center;gap:6px;padding:3px 12px;background:#fce4ec;border:1px solid #f48fb1;border-radius:999px;color:#ad1457;font-size:12px;font-weight:700;margin-bottom:8px;">
          🎗️ Breast Cancer Survivor Cooking Studio
        </div>
        <h2 class="page-title" style="margin:0 0 4px;">Lisa's Video Studio & YouTube Hub</h2>
        <p style="margin:0;color:var(--muted);font-size:15px;">Mom's dedicated cooking channel, video teleprompter studio, and curated guides for gardening, pet treats & wellness.</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <a class="btn moss" href="https://www.youtube.com/@LisasKitchenStudio" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:8px;font-weight:700;">
          <i class="bi bi-youtube"></i> Visit Lisa's YouTube Channel
        </a>
      </div>
    </div>

    <!-- YouTube Featured Channel Hero Banner -->
    <div class="panel" style="background:linear-gradient(135deg, #fff0f5 0%, #ffe4ec 100%);border:2px solid #f48fb1;border-radius:24px;padding:24px;margin-bottom:20px;box-shadow:0 10px 30px rgba(216,27,96,0.12);">
      <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:18px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:68px;height:68px;border-radius:20px;background:linear-gradient(135deg, #d81b60, #ad1457);display:flex;align-items:center;justify-content:center;color:#fff;font-size:32px;box-shadow:0 8px 24px rgba(216,27,96,0.35);">
            <i class="bi bi-youtube"></i>
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <h3 style="font-family:var(--serif);font-size:24px;margin:0;color:#880e4f;">Lisa's Kitchen Studio</h3>
              <span style="font-size:11px;padding:2px 8px;background:#fce4ec;color:#ad1457;border-radius:999px;font-weight:700;">Official Channel</span>
            </div>
            <p style="margin:4px 0 0;font-size:14px;color:#6d4c5d;"><strong>@LisasKitchenStudio</strong> • Homestyle Southern Traditions, Cajun Dark Roux, and Survivor Kitchen</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a class="btn moss" href="https://www.youtube.com/@LisasKitchenStudio" target="_blank" rel="noopener" style="font-weight:700;display:inline-flex;align-items:center;gap:8px;">
            <i class="bi bi-youtube"></i> Visit @LisasKitchenStudio
          </a>
          <button type="button" class="btn quiet" data-action="sync-youtube-feed" style="font-weight:600;display:inline-flex;align-items:center;gap:6px;">
            <i class="bi bi-arrow-repeat"></i> Sync Channel
          </button>
          <button type="button" class="btn quiet" data-action="open-video-upload-modal" style="font-weight:600;display:inline-flex;align-items:center;gap:6px;">
            <i class="bi bi-cloud-arrow-up-fill"></i> Upload a Video
          </button>
          <button type="button" class="btn quiet" data-action="camera-open" style="font-weight:600;display:inline-flex;align-items:center;gap:6px;">
            <i class="bi bi-camera-video"></i> Record a Video
          </button>
        </div>
      </div>
    </div>

    <!-- Curated Video Section Header -->
    <div style="margin:32px 0 16px;">
      <div style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--moss);font-weight:700;margin-bottom:4px;">
        <i class="bi bi-collection-play-fill"></i> Verified Video Tutorials & Masterclasses
      </div>
      <h3 style="font-family:var(--serif);font-size:22px;margin:0 0 6px;color:var(--ink);">Curated Cooking Guides & Kitchen Inspirations</h3>
      <p style="margin:0;font-size:14px;color:var(--muted);">Selected step-by-step videos for classic Southern dark roux, tender chuck pot roast, raised bed gardening, and healthy pet food.</p>
    </div>

    <!-- Video Category Channels Filter -->
    <div style="display:flex;align-items:center;gap:8px;overflow-x:auto;padding-bottom:10px;margin-bottom:16px;">
      ${[
        ["all", "All Videos"],
        ["cooking", "🍳 Southern & Cajun Classics"],
        ["gardening", "🌱 Raised Beds & Gardening"],
        ["pets", "🐾 Healthy Pet Snacks & Dog Food"],
        ["wellness", "💕 Survivor Wellness & Broths"]
      ].map(([cat, label]) => `
        <button type="button" class="chip ${currentCat === cat ? "active" : ""}" data-action="filter-video-cat" data-cat="${cat}" style="font-size:14px;padding:8px 16px;white-space:nowrap;font-weight:600;">
          ${label}
        </button>
      `).join("")}
    </div>

    <!-- Video Grid -->
    <div class="video-grid">
      ${filteredVideos.map(vid => `
        <article class="video-card">
          <div class="video-thumb-wrap" data-action="watch-video" data-id="${esc(vid.id)}">
            <img src="${esc(vid.thumbnail || '/images/garden-to-table.jpg')}" alt="${esc(vid.title)}" loading="lazy" onerror="this.onerror=null;this.src='/images/garden-to-table.jpg';">
            <div class="video-play-badge"><i class="bi bi-play-fill"></i></div>
            ${vid.duration ? `<span class="video-duration">${esc(vid.duration)}</span>` : ""}
          </div>
          <div class="video-content">
            <div class="video-channel-tag">
              <i class="bi bi-play-circle-fill" style="color:var(--moss);"></i>
              ${esc(vid.channel)}
            </div>
            <h4 class="video-title">${esc(vid.title)}</h4>
            <p class="video-desc">${esc(vid.description)}</p>
            <div class="video-actions">
              <button type="button" class="btn moss" data-action="watch-video" data-id="${esc(vid.id)}" style="font-size:13px;padding:6px 14px;font-weight:700;">
                <i class="bi bi-play-fill"></i> Watch Video
              </button>
              ${vid.recipeId ? `<a class="btn quiet" href="#/recipe/${esc(vid.recipeId)}" style="font-size:13px;padding:6px 12px;"><i class="bi bi-book"></i> Open Recipe</a>` : ""}
            </div>
          </div>
        </article>
      `).join("")}
    </div>

    <!-- Mom's Teleprompter & Recording Studio -->
    <div style="margin-top:40px;padding-top:24px;border-top:2px dashed var(--line);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div>
          <h3 style="font-family:var(--serif);font-size:24px;margin:0 0 4px;color:var(--ink);">Mom's Kitchen Recording Studio</h3>
          <p style="margin:0;font-size:14px;color:var(--muted);">Record a cooking video, read recipe steps on the teleprompter cue card, upload a video file, or link an external YouTube video.</p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <button type="button" class="btn moss" data-action="open-video-upload-modal" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:8px 16px;">
            <i class="bi bi-cloud-arrow-up-fill"></i> Upload Video File
          </button>
        </div>
      </div>

      <div class="split">
        <!-- Teleprompter Cue Card & Camera -->
        <div class="panel" style="border-radius:18px;">
          <h4 style="margin:0 0 12px;font-size:17px;display:flex;align-items:center;gap:8px;">
            <i class="bi bi-camera-video-fill" style="color:var(--moss);"></i> Live Video Recorder & Teleprompter
          </h4>
          <div class="field" style="margin-bottom:12px;">
            <label style="font-size:13px;font-weight:600;">Recipe to display on Teleprompter while filming:
              <select data-action="pick-teleprompter-recipe" style="margin-top:4px;">
                <option value="">No recipe selected (free film)</option>
                ${state.recipes.map(r => `<option value="${esc(r.id)}" ${state.teleprompterRecipe === r.id ? "selected" : ""}>${esc(r.title)}</option>`).join("")}
              </select>
            </label>
          </div>
          ${teleRecipe ? `
            <div style="background:#fff4f8;border:1px solid #f48fb1;border-radius:12px;padding:14px;margin-bottom:14px;max-height:220px;overflow-y:auto;">
              <strong style="color:#ad1457;font-size:14px;">Teleprompter Cue Card: ${esc(teleRecipe.title)}</strong>
              <p style="font-size:13px;margin:6px 0;color:#6d4c5d;"><strong>Ingredients:</strong> ${(teleRecipe.ingredients || []).slice(0, 6).join(", ")}...</p>
              <ol style="font-size:13px;margin:0;padding-left:18px;color:#333;">
                ${(teleRecipe.steps || []).map(s => `<li style="margin-bottom:4px;">${esc(s)}</li>`).join("")}
              </ol>
            </div>
          ` : ""}
          ${cameraStage()}
        </div>

        <!-- Link External YouTube Video -->
        <form id="link-form" class="panel" style="border-radius:18px;">
          <h4 style="margin:0 0 12px;font-size:17px;display:flex;align-items:center;gap:8px;">
            <i class="bi bi-youtube" style="color:#ff0000;"></i> Link YouTube Video to Recipe
          </h4>
          <div class="field" style="margin-bottom:12px;">
            <label style="font-size:13px;font-weight:600;">Choose Recipe in Book to Attach Video to:
              <select name="recipeId" id="link-video-recipe-select" data-action="pick-link-recipe" style="margin-top:4px;">
                <option value="">No recipe attached (standalone Studio video)</option>
                ${state.recipes.map(r => `<option value="${esc(r.id)}" ${r.id === "loaded-walking-bag-frito-pie" ? "selected" : ""}>${esc(r.title)}</option>`).join("")}
              </select>
            </label>
          </div>
          <div class="field"><label>Video Title<input name="title" id="link-video-title" required placeholder="e.g. LOADED WALKING BAG FRITO PIE" value="LOADED WALKING BAG FRITO PIE"></label></div>
          <div class="field"><label>YouTube Video Link<input name="url" id="link-video-url" required placeholder="https://youtube.com/watch?v=..." value="https://www.youtube.com/watch?v=_TwRwMX_pz0"></label></div>
          <div class="field"><label>Notes & Creator Tips<textarea name="notes" id="link-video-notes" rows="3" placeholder="Tell viewers what to watch for or how to prep.">Crunchy. Cheesy. Beefy. Legendary. Hot homemade beef chili and velvety RoTel queso ladled straight into individual Frito snack bags.</textarea></label></div>
          <button class="btn moss" type="submit" style="font-weight:700;">Save & Link YouTube Video</button>
        </form>
      </div>

      <!-- Saved Community Videos & Personal Films -->
      ${saved.length || films.length ? `
        <h4 style="margin:28px 0 14px;font-size:20px;">My Saved Videos & Community Films</h4>
        <div class="stack">
          ${[...saved, ...films].map(libraryCard).join("")}
        </div>
      ` : ""}
    </div>
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
  return `
  <div class="panel quick-login-card" style="margin-bottom:24px;background:linear-gradient(135deg, #fff0f5, #ffe4ec);border:2px solid #f48fb1;border-radius:20px;padding:24px;text-align:center;box-shadow:0 10px 30px rgba(216,27,96,0.12);">
    <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 14px;background:#fce4ec;border:1px solid #f06292;border-radius:999px;color:#ad1457;font-size:12px;font-weight:700;margin-bottom:12px;">
      🎗️ Breast Cancer Survivor Kitchen & Studio
    </div>
    <h3 style="font-family:var(--serif);font-size:26px;margin:2px 0 8px;color:#880e4f;">Lisa's 1-Click Profile Restore</h3>
    <p style="color:#6d4c5d;font-size:15px;max-width:580px;margin:0 auto 18px;line-height:1.5;">
      Cleared your cache or using a new browser? Tap below to immediately sign in as <strong>Lisa (Mom & Survivor)</strong> with full profile access, saved recipes, and studio controls!
    </p>
    <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:12px;">
      <button type="button" class="btn moss" data-action="quick-login-lisa" style="font-size:16px;padding:12px 28px;font-weight:700;border-radius:12px;display:inline-flex;align-items:center;gap:10px;box-shadow:0 6px 20px rgba(216,27,96,0.28);">
        <i class="bi bi-box-arrow-in-right"></i> Quick Sign In as Lisa (Mom)
      </button>
    </div>
  </div>

  <div class="split">
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
    let recipe = state.recipes.find((item) => item.id === current.id) || state.recipeCache?.[current.id];
    if (recipe) {
      document.title = `${recipe.title} · Lisa's Recipe Book`;
      try {
        html = recipeView(recipe);
      } catch (err) {
        console.error("Recipe render caught:", err);
        html = shell(`<div class="panel" style="padding:28px;text-align:center;"><p class="empty">Could not display this recipe.</p><a class="btn" href="#/">Back to Recipes</a></div>`);
      }
    } else {
      document.title = "Opening recipe · Lisa's Recipe Book";
      html = shell(`<div class="panel" style="padding:48px 24px;text-align:center;"><p class="empty"><i class="bi bi-hourglass-split"></i> Loading recipe from Lisa's Book…</p></div>`);
      if (!state.recipeFetching?.[current.id]) {
        state.recipeFetching = state.recipeFetching || {};
        state.recipeFetching[current.id] = true;
        fetchSingleRecipe(current.id);
      }
    }
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
  } else if (current.name === "studio" || current.name === "videos") {
    document.title = "Studio & YouTube Hub · Lisa's Recipe Book";
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
  if (button.dataset.action === "sync-youtube-feed") {
    event.preventDefault();
    await syncLisaYouTube(true);
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
    if (action === "quick-login-lisa") {
      event.preventDefault();
      try {
        const result = await api("/api/auth/quick-lisa", { method: "POST" });
        localStorage.setItem("lisa-token", result.token);
        state.user = result.user;
        await refreshPrivate();
        say(`Welcome back, ${result.user.name}! 💕🎗️`);
        go("#/");
      } catch (err) {
        say(err.message || "Could not log in as Lisa.");
      }
      return;
    }
    if (action === "add-recipe-groceries") {
      event.preventDefault();
      const recipeId = button.dataset.id;
      const recipe = state.recipes.find(r => r.id === recipeId) || state.recipeCache?.[recipeId];
      if (recipe) {
        addRecipeIngredientsToCart(state, recipe);
        say(`Added groceries for "${recipe.title}" to cart! 🛒`);
        render();
      }
      return;
    }
    if (action === "set-font-size") {
      event.preventDefault();
      const size = button.dataset.size || "regular";
      state.fontSize = size;
      localStorage.setItem("lisa-font-size", size);
      document.documentElement.setAttribute("data-font-size", size);
      say(`Text size set to: ${size === 'senior' ? 'Senior High-Legibility' : size === 'large' ? 'Large' : 'Standard'}`);
      render();
      return;
    }
    if (action === "filter-video-cat") {
      event.preventDefault();
      state.videoCategory = button.dataset.cat || "all";
      render();
      return;
    }
    if (action === "watch-video") {
      event.preventDefault();
      const vidId = button.dataset.id;
      let match = null;
      for (const ch of (state.videoChannels || [])) {
        match = (ch.videos || []).find(v => v.id === vidId);
        if (match) break;
      }
      if (match) {
        state.activeVideo = match;
        render();
      }
      return;
    }
    if (action === "close-video-modal") {
      event.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
      state.activeVideo = null;
      render();
      return;
    }
    if (action === "open-video-upload-modal") {
      event.preventDefault();
      const recId = button.dataset.recipeId;
      if (recId) {
        state.uploadSelectedRecipe = recId;
        const rec = state.recipes.find(r => r.id === recId);
        if (rec) state.uploadVideoTitle = `Lisa's ${rec.title} Tutorial`;
      }
      if (button.dataset.source) {
        state.uploadVideoSource = button.dataset.source;
      }
      state.showVideoUploadModal = true;
      render();
      return;
    }
    if (action === "set-upload-source") {
      event.preventDefault();
      state.uploadVideoSource = button.dataset.source || "file";
      render();
      return;
    }
    if (action === "close-video-upload-modal") {
      event.preventDefault();
      state.showVideoUploadModal = false;
      state.uploadVideoPreview = null;
      render();
      return;
    }
    if (action === "copy-youtube-kit") {
      event.preventDefault();
      const recId = document.getElementById("upload-modal-recipe")?.value || state.uploadSelectedRecipe;
      const title = document.getElementById("upload-modal-title")?.value || (recId ? state.recipes.find(r => r.id === recId)?.title : "Lisa's Cooking Video");
      const notes = document.getElementById("upload-modal-notes")?.value || "";
      const rec = state.recipes.find(r => r.id === recId);

      let kit = `${title} | Lisa's Kitchen Studio\n\n`;
      if (notes) kit += `${notes}\n\n`;
      if (rec) {
        kit += `INGREDIENTS:\n${(rec.ingredients || []).map(i => `- ${i}`).join("\n")}\n\n`;
        kit += `INSTRUCTIONS:\n${(rec.steps || []).map((s, idx) => `${idx + 1}. ${s}`).join("\n")}\n\n`;
        kit += `Servings: ${rec.yieldText || "Family"}\n`;
        if (rec.prepMinutes) kit += `Prep time: ${rec.prepMinutes} mins | `;
        if (rec.cookMinutes) kit += `Cook time: ${rec.cookMinutes} mins\n\n`;
      }
      kit += `Full Printable Recipe in Lisa's Kitchen Book:\nhttps://lisa.synthetix-labz.cloud\n\n`;
      kit += `#LisasKitchenStudio #HomestyleCooking #SurvivorKitchen #TexasCooking #CajunCooking #FamilyRecipes`;

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(kit).then(() => {
          say("Copied Title, Description, Ingredients & Tags to clipboard! Ready to paste into YouTube Studio. 📋");
        }).catch(() => {
          say("Title & Description ready in box.");
        });
      } else {
        say("Title & Description ready in box.");
      }
      return;
    }
    if (action === "toggle-theater-fullscreen") {
      event.preventDefault();
      const dlg = document.querySelector(".video-modal-dialog");
      const videoEl = document.querySelector("#theater-video-player");
      const target = dlg || videoEl;
      if (!document.fullscreenElement) {
        (target?.requestFullscreen?.() || videoEl?.webkitEnterFullscreen?.())?.catch?.(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
      return;
    }
    if (action === "popout-recipe-media") {
      event.preventDefault();
      event.stopPropagation();
      const kind = button.dataset.kind;
      const path = button.dataset.path;
      const caption = button.dataset.caption || "Cooking Video";
      if (kind === "video") {
        state.activeVideo = {
          id: `media-${button.dataset.id || Date.now()}`,
          title: caption,
          url: path,
          channel: "Mom's Kitchen Video",
          description: caption,
          recipeId: route().id
        };
        render();
      } else {
        state.zoomedImage = {
          src: asset(path),
          title: caption,
          credit: "Recipe Photograph"
        };
        render();
      }
      return;
    }
    if (action === "popout-recipe-video") {
      event.preventDefault();
      event.stopPropagation();
      const ytUrl = button.dataset.youtube;
      const title = button.dataset.title || "Video Tutorial";
      state.activeVideo = {
        id: "recipe-yt-popout",
        title: `${title} - Step-by-Step Tutorial`,
        youtube: ytUrl,
        channel: "Lisa's Kitchen Studio",
        description: `Watch the full step-by-step video tutorial for ${title}.`,
        recipeId: route().id
      };
      render();
      return;
    }
    if (action === "force-download-png") {
      event.preventDefault();
      const url = button.dataset.url;
      const filename = button.dataset.filename || "image.png";
      say("Downloading PNG image…");
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement("a");
        tempLink.href = blobUrl;
        tempLink.download = filename;
        document.body.appendChild(tempLink);
        tempLink.click();
        tempLink.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        say(`Saved ${filename}! 📷`);
      } catch (err) {
        window.location.href = url;
      }
      return;
    }
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
  if (event.target.id === "upload-modal-youtube-url") {
    state.uploadYouTubeUrl = event.target.value.trim();
  }
  if (event.target.id === "upload-modal-title") {
    state.uploadVideoTitle = event.target.value;
  }
  if (event.target.id === "upload-modal-notes") {
    state.uploadVideoNotes = event.target.value;
  }
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
  if (input instanceof HTMLInputElement && input.dataset.action === "pick-upload-file") {
    const file = input.files?.[0];
    if (file) {
      state.uploadSelectedFile = file;
      state.uploadVideoPreview = URL.createObjectURL(file);
      const titleInput = document.getElementById("upload-modal-title");
      if (titleInput && !titleInput.value) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        state.uploadVideoTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
      render();
    }
    return;
  }
  if (input instanceof HTMLSelectElement && input.dataset.action === "upload-recipe-change") {
    state.uploadSelectedRecipe = input.value;
    const rec = state.recipes.find(r => r.id === input.value);
    if (rec) {
      state.uploadVideoTitle = `Lisa's ${rec.title} Tutorial`;
    }
    render();
    return;
  }
  if (input instanceof HTMLSelectElement && input.dataset.action === "upload-existing-change") {
    state.uploadSelectedExistingVideo = input.value;
    state.uploadVideoPreview = input.value;
    for (const ch of (state.videoChannels || [])) {
      const match = (ch.videos || []).find(v => v.url === input.value || v.filePath === input.value || v.youtube === input.value);
      if (match) {
        state.uploadVideoTitle = match.title;
        break;
      }
    }
    render();
    return;
  }
  if (input instanceof HTMLInputElement && input.id === "upload-modal-set-primary") {
    state.uploadSetPrimary = input.checked;
    return;
  }
  if (input instanceof HTMLSelectElement && input.dataset.action === "pick-link-recipe") {
    const recipeId = input.value;
    const recipe = state.recipes.find(r => r.id === recipeId);
    const titleInput = document.getElementById("link-video-title");
    const urlInput = document.getElementById("link-video-url");
    if (recipe) {
      if (titleInput && (!titleInput.value || titleInput.value.includes("Tutorial") || titleInput.value.includes("Video") || titleInput.value.includes("FRITO"))) {
        titleInput.value = `Lisa's ${recipe.title} Tutorial`;
      }
      if (urlInput && !urlInput.value && recipe.youtube) {
        urlInput.value = recipe.youtube;
      }
    }
    return;
  }
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
      const ytId = youtubeId(url);
      const isHosted = hostedVideo(url);
      if (!ytId && !isHosted) throw new Error("Paste a YouTube link (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...).");

      const title = String(data.title || "").trim() || "Lisa's Cooking Tutorial";
      const recipeId = String(data.recipeId || "").trim();
      const notes = String(data.notes || "").trim();

      const newVid = {
        id: `lisa-${ytId || Date.now()}`,
        title,
        channel: "Lisa's Kitchen Studio",
        duration: "Tutorial",
        youtube: url,
        thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "/images/garden-to-table.jpg",
        category: "cooking",
        recipeId: recipeId || undefined,
        description: notes || "Featured video from Lisa's Kitchen Studio."
      };

      // 1. Add to Lisa's channel in state.videoChannels immediately
      const ch = state.videoChannels.find(c => c.id === "lisas-channel");
      if (ch) {
        if (!Array.isArray(ch.videos)) ch.videos = [];
        const exists = ch.videos.some(v => (v.youtube || "").includes(ytId || url));
        if (!exists) ch.videos.unshift(newVid);
      }

      // 2. Link to selected recipe in state.recipes
      if (recipeId) {
        const target = state.recipes.find(r => r.id === recipeId);
        if (target) {
          target.youtube = url;
          if (state.recipeCache?.[recipeId]) state.recipeCache[recipeId].youtube = url;
        }
      }

      // 3. Persist in localStorage so it never disappears on refresh
      try {
        const savedCustom = JSON.parse(localStorage.getItem("lisa_custom_videos") || "[]");
        savedCustom.unshift(newVid);
        localStorage.setItem("lisa_custom_videos", JSON.stringify(savedCustom.slice(0, 50)));
      } catch {}

      // 4. Attempt background backend sync without crashing on 401 or 500
      try {
        await api("/api/channels/link-recipe", { method: "POST", json: { title, url, recipeId, notes } }).catch(() => null);
        await api("/api/library", { method: "POST", json: { title, url, kind: "youtube", description: notes, notes } }).catch(() => null);
      } catch {}

      say(recipeId ? "Video linked to recipe and added to Lisa's Studio! 🎬" : "Video added to Lisa's Kitchen Studio! 🎬");
      render();
    }
    if (form.id === "upload-video-form") {
      const source = data.source || state.uploadVideoSource || "file";
      const title = String(data.title || "").trim() || "Lisa's Cooking Video";
      const recipeId = String(data.recipeId || state.uploadSelectedRecipe || "").trim();
      const notes = String(data.notes || "").trim();
      const carryOverYt = String(data.youtubeCarryOverUrl || "").trim();
      const setPrimary = Boolean(data.setPrimary);

      const button = form.querySelector("[type=submit]");
      if (button) {
        button.disabled = true;
        button.textContent = "Saving Video…";
      }

      let filePath = "";
      let isYt = false;
      let finalYt = carryOverYt;

      if (source === "file") {
        const fileInput = document.getElementById("upload-modal-file");
        const file = fileInput?.files?.[0] || state.uploadSelectedFile;
        if (!file || !file.size) throw new Error("Please choose a video file first.");
        try {
          const uploaded = await uploadFileFast(file, file.name);
          filePath = uploaded?.path || "";
        } catch (err) {
          console.warn("Upload fallback to local object URL:", err);
        }
        if (!filePath) {
          filePath = URL.createObjectURL(file);
        }
      } else if (source === "existing") {
        const existingUrl = data.existingVideoUrl || state.uploadSelectedExistingVideo;
        if (!existingUrl) throw new Error("Please select an existing video from the list.");
        filePath = existingUrl;
        if (youtubeId(existingUrl)) {
          isYt = true;
          finalYt = existingUrl;
        }
      } else if (source === "youtube") {
        const ytInputUrl = data.youtubeUrl || state.uploadYouTubeUrl;
        if (!ytInputUrl || !youtubeId(ytInputUrl)) throw new Error("Please enter a valid YouTube video URL.");
        filePath = ytInputUrl;
        isYt = true;
        finalYt = ytInputUrl;
      }

      const ytId = youtubeId(finalYt || filePath);
      const newVid = {
        id: `lisa-${ytId || Date.now()}`,
        title,
        channel: "Lisa's Kitchen Studio",
        duration: (isYt || ytId) ? "YouTube Tutorial" : "Uploaded Video",
        url: filePath,
        filePath,
        youtube: (isYt || ytId) ? (finalYt || filePath) : (carryOverYt || ""),
        thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "/images/garden-to-table.jpg",
        category: "cooking",
        recipeId: recipeId || undefined,
        description: notes || "Featured cooking video from Lisa's Kitchen Studio."
      };

      // 1. Add to Lisa's channel in state.videoChannels
      const ch = (state.videoChannels || []).find(c => c.id === "lisas-channel");
      if (ch) {
        if (!Array.isArray(ch.videos)) ch.videos = [];
        const existingIdx = ch.videos.findIndex(v => v.id === newVid.id || (v.url && v.url === newVid.url));
        if (existingIdx >= 0) ch.videos[existingIdx] = newVid;
        else ch.videos.unshift(newVid);
      }

      // 2. Link to recipe in state.recipes & add to gallery media
      if (recipeId) {
        const target = state.recipes.find(r => r.id === recipeId);
        if (target) {
          if (finalYt && (setPrimary || !target.youtube)) {
            target.youtube = finalYt;
          }
          if (!Array.isArray(target.media)) target.media = [];
          target.media.unshift({
            id: `media-${Date.now()}`,
            kind: (isYt || ytId) ? "youtube" : "video",
            path: filePath,
            caption: title
          });
        }
      }

      // 3. Persist in localStorage so it never disappears on refresh
      try {
        const savedCustom = JSON.parse(localStorage.getItem("lisa_custom_videos") || "[]");
        savedCustom.unshift(newVid);
        localStorage.setItem("lisa_custom_videos", JSON.stringify(savedCustom.slice(0, 50)));
      } catch {}

      // 4. Background server sync
      try {
        await api("/api/channels/link-recipe", {
          method: "POST",
          json: { title, url: finalYt || filePath, recipeId, notes }
        }).catch(() => null);
      } catch {}

      state.showVideoUploadModal = false;
      state.uploadVideoPreview = null;
      state.uploadSelectedFile = null;
      state.uploadVideoTitle = "";
      state.uploadVideoNotes = "";
      state.uploadSelectedRecipe = "";
      state.uploadYouTubeUrl = "";
      state.uploadSelectedExistingVideo = "";

      say(recipeId ? "🎬 Video saved and linked to recipe!" : "🎬 Video saved to Lisa's Kitchen Studio!");
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

// 1. Bind desk communications and hydrate cached data immediately
try {
  const cachedRecipes = JSON.parse(localStorage.getItem("lisa_recipes_cache") || "[]");
  if (cachedRecipes?.length) state.recipes = cachedRecipes;
} catch {}

try {
  bindDesk({ state, api, esc, go, say, face, render, route });
} catch {}
render();

// 2. Load recipes, notes, and user data asynchronously
async function bootApp() {
  try {
    const boot = await api("/api/recipes").catch(() => null);
    if (boot?.recipes?.length) {
      state.recipes = boot.recipes;
      try { localStorage.setItem("lisa_recipes_cache", JSON.stringify(boot.recipes)); } catch {}
      render();
    }
  } catch (err) {
    console.warn("Recipes load notice:", err);
  }

  try {
    loadShelf().catch(() => {});
  } catch {}

  try {
    loadChannels().then(() => {
      // Auto-check Lisa's YouTube channel in background
      syncLisaYouTube(false).catch(() => {});
    }).catch(() => {});
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

document.addEventListener("change", (e) => {
  const sel = e.target.closest("[data-action='pick-teleprompter-recipe']");
  if (sel) {
    state.teleprompterRecipe = sel.value || null;
    render();
  }
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
