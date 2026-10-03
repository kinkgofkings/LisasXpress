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
  noteFiles: [],
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
  menuFresh: false
};
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
  if (src.startsWith("/uploads/")) return `${API}${src}${src.includes("?") ? "&" : "?"}v=3`;
  return src;
}

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

async function uploadPieces(file, name) {
  const started = await api("/api/media", {
    method: "POST",
    json: { mime: String(file.type || "").split(";")[0], size: file.size, name: name || file.name || "file" }
  });
  const part = started.partSize || 800_000;
  for (let offset = 0, idx = 0; offset < file.size; offset += part, idx += 1) {
    await api(`/api/media/parts?path=${encodeURIComponent(started.path)}&idx=${idx}`, {
      method: "PUT",
      body: file.slice(offset, offset + part),
      headers: { "Content-Type": "application/octet-stream" }
    });
  }
  return started;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem("lisa-token");
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.json) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.json);
  }
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function route() {
  const parts = (location.hash.replace(/^#/, "") || "/").split("/").filter(Boolean);
  return { name: parts[0] || "home", id: decodeURIComponent(parts[1] || "") };
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
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function shell(main) {
  return `
    <header class="mast">
      <a class="brand" href="#/">
        <img class="ribbon-mark" src="/ribbon.svg" alt="">
        <span>
          <p class="eyebrow">For Lisa Miller</p>
          <h1>Lisa's Recipe Book</h1>
        </span>
      </a>
    </header>
    <main class="wrap">${main}</main>
    ${appBar()}
    ${state.menu ? superMenu() : ""}
    ${state.reader ? reader() : ""}
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
  `;
}

function sectionOn(id) {
  const here = route().name;
  if (id === "home") return here === "home" || here === "recipe";
  if (id === "library") return here === "library" || here === "world";
  if (id === "write") return here === "new" || here === "edit";
  return here === id;
}

function appBar() {
  const menuOn = state.menu || ["family", "profile", "account", "privacy", "terms", "new", "edit"].includes(route().name);
  const item = (href, icon, label, on) => `<a class="appbar-item ${on ? "active" : ""}" href="${href}" ${on ? 'aria-current="page"' : ""}><i class="bi ${icon}" aria-hidden="true"></i><span>${label}</span></a>`;
  return `<nav class="appbar" aria-label="Sections">
    ${item("#/", "bi-book", "Book", sectionOn("home"))}
    ${item("#/library", "bi-collection", "Library", sectionOn("library"))}
    ${item("#/notes", "bi-journal-text", "Notepad", sectionOn("notes"))}
    ${item("#/studio", "bi-camera-reels", "Studio", sectionOn("studio"))}
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
        ${menuLink("#/library", "bi-collection", "Library", sectionOn("library"))}
        ${menuLink("#/notes", "bi-journal-text", "Notepad", sectionOn("notes"))}
        ${menuLink("#/studio", "bi-camera-reels", "Studio", sectionOn("studio"))}
        ${menuLink("#/family", "bi-people", "Family", sectionOn("family"))}
        ${menuLink("#/new", "bi-plus-circle", "Write a recipe", sectionOn("write"))}
      </div>
      <p class="menu-label">Account</p>
      <div class="menu-list">
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

function privacyView() {
  return shell(`
    <h2 class="page-title">Privacy</h2>
    <p>This is a family book for Lisa Miller and the people she invites. It is not a public social network.</p>
    <section class="panel legal">
      <h3>What the book keeps</h3>
      <p>An account holds a name, an email, and a password. The password is stored as a code, not as the words you type. You can also add a short line about yourself and a portrait.</p>
      <p>The book also keeps recipes, notes, pictures, films, comments, likes, stars, and who follows whom.</p>
      <h3>Who can see it</h3>
      <p>Anyone with an account sees the same recipes, notes, and films. A guest can read the recipes without logging in. Notes, the studio, and the family list stay behind the login.</p>
      <h3>What we do not do</h3>
      <p>We do not sell this information, and the book does not show ads. A portrait you paste from a link is loaded from that address. A YouTube film plays from YouTube, under YouTube's own rules.</p>
      <h3>Where it lives</h3>
      <p>The book is hosted on Cloudflare. Open Profile to change your name, your line about yourself, or your portrait. Log out when you are done on a shared phone. If you want an account taken off the book, ask the person who set it up.</p>
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
      <p>Notes and comments should be fit for the whole family, including Lisa. Something that does not belong in a family book can be taken down.</p>
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

function home() {
  const list = matchingRecipes();
  const outside = Boolean(state.q.trim()) && !list.length;
  const featured = state.recipes.find((recipe) => recipe.id === "oak-smoked-brisket") || state.recipes[0];
  return shell(`
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Cajun, Texas, and the open library</p>
        <h2 class="page-title" style="font-size:clamp(42px,6vw,72px)">A table with your name on it.</h2>
        <p>Your plates from the bayou and the Hill Country, dressed in survivor pink, with a whole library when you want something new.</p>
        <div class="actions">
          <a class="btn" href="#/library">Browse the library</a>
          <a class="btn quiet" href="#/new">Add a recipe</a>
          ${state.user ? `<a class="btn quiet" href="#/studio">Open the studio</a>` : `<a class="btn quiet" href="#/account">Log in</a>`}
        </div>
      </div>
      ${featured ? `<a class="hero-photo" href="#/recipe/${featured.id}" style="background-image:url('${esc(asset(featured.image))}')"><span>${esc(featured.title)}</span></a>` : ""}
    </section>
    <div class="toolbar">
      <input id="q" placeholder="Search the book" value="${esc(state.q)}">
      ${[["all", "All"], ["texas", "Texas"], ["texmex", "Tex-Mex"], ["stews", "Stews"], ["breakfast", "Breakfast"], ["sweets", "Sweets"], ["kids", "Little ones"], ["pets", "The Pet Connection"], ["garden", "Garden"], ["cajun", "Cajun"], ["library", "Kept"]].map(([item, label]) => `<button type="button" class="chip ${state.cuisine === item ? "active" : ""}" data-cuisine="${item}">${label}</button>`).join("")}
      <span class="empty">${list.length} recipes</span>
    </div>
    ${!state.q.trim() && state.cuisine === "all" ? stapleBands() : ""}
    ${outside && state.bookHitNote ? `<p class="empty">${esc(state.bookHitNote)}</p>` : ""}
    <section class="grid">
      ${outside
        ? (state.bookHits.length ? state.bookHits.map(worldCard).join("") : (state.bookHitNote && !state.bookHitLoading ? "" : `<p class="empty">Looking through the open library…</p>`))
        : (list.map(card).join("") || `<p class="empty">${state.cuisine === "library" ? "Nothing kept from the library yet. Browse below and keep a plate." : "Nothing matches that search."}</p>`)}
    </section>
    <section class="library-band">
      <div class="band-head">
        <div>
          <p class="kicker">Open library</p>
          <h2>More plates, in the same book.</h2>
        </div>
        <a class="btn" href="#/library">See the whole library</a>
      </div>
      <div class="grid">
        ${state.featured.map(worldCard).join("") || `<p class="empty">${esc(state.shelfError || "The library is on its way.")}</p>`}
      </div>
    </section>
  `);
}

function plateBand(kicker, title, recipes, limit = 4) {
  const shown = recipes.slice(0, limit);
  if (!shown.length) return "";
  return `<section class="library-band">
    <div class="band-head"><div><p class="kicker">${esc(kicker)}</p><h2>${esc(title)}</h2></div></div>
    <div class="grid">${shown.map(card).join("")}</div>
  </section>`;
}

function stapleBands() {
  const plates = state.recipes;
  return [
    plateBand("Texas", "The Texas table.", plates.filter((recipe) => recipe.cuisine === "texas" && recipe.category === "Mains")),
    plateBand("Breakfast", "Morning plates.", plates.filter((recipe) => recipe.category === "Breakfast")),
    plateBand("Tex-Mex", "Tex-Mex, on this table.", plates.filter((recipe) => recipe.cuisine === "texmex" && recipe.category === "Mains")),
    plateBand("Sweets", "Cobblers, fudge, and fried ice cream.", plates.filter((recipe) => recipe.category === "Sweets")),
    plateBand("From the garden", "Pulled, washed, pickled, and canned.", plates.filter((recipe) => recipe.cuisine === "garden")),
    plateBand("The pot", "Pot roasts and homemade stews.", plates.filter((recipe) => /stew|pot roast/i.test(recipe.title)), 6),
    plateBand("Little ones", "Soft fruit for babies. Fruit, yogurt, and oats for toddlers.", plates.filter((recipe) => recipe.cuisine === "kids"), 6),
    plateBand("The Pet Connection", "Cooked meals. Meat, liver, vegetables, and eggshell.", plates.filter((recipe) => recipe.cuisine === "pets" && recipe.category === "Meals"), 8),
    plateBand("Dog treats", "Treats. Not the whole supper.", plates.filter((recipe) => recipe.cuisine === "pets" && recipe.category !== "Meals"), 8)
  ].join("");
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
      </div>
    </a>
    <div class="card-actions">${add}${reactBar("world", `mealdb-${mealId}`, meal.social, false)}</div>
  </article>`;
}

function card(recipe) {
  const target = reactionTarget(recipe);
  return `<a class="card" href="#/recipe/${recipe.id}">
    ${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="${esc(recipe.title)}">` : `<div class="ph"></div>`}
    <div>
      <div class="kicker">${esc(cuisineLabel(recipe.cuisine))} · ${esc(recipe.category)}${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}</div>
      <h2>${esc(recipe.title)}</h2>
      <p>${esc(recipe.summary)}</p>
      ${recipe.author ? `<p class="empty">From ${esc(recipe.author.name)}</p>` : ""}
      ${reactBar(target.type, target.id, recipe.social, false)}
    </div>
  </a>`;
}

function recipeView(recipe) {
  const shareText = `${recipe.title} from Lisa's Recipe Book`;
  const link = recipeLink(recipe);
  const kept = recipe.world ? state.recipes.find((item) => item.sourceUrl === recipe.sourceUrl) : null;
  return shell(`
    <article class="recipe">
      <div>
        <div class="plate">${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="${esc(recipe.title)}">` : ""}</div>
        <p class="credit">${esc(recipe.imageCredit || "")}</p>
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
        ${reactBar(reactionTarget(recipe).type, reactionTarget(recipe).id, recipe.social, true)}
        <h3>Ingredients</h3>
        <ul>${recipe.ingredients.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        <h3>Method</h3>
        <ol>${recipe.steps.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>
        ${recipe.notes ? `<h3>Notes</h3><p>${esc(recipe.notes)}</p>` : ""}
        ${recipe.sourceUrl ? `<p class="no-print"><button class="btn-line" data-action="open-source" data-url="${esc(recipe.sourceUrl)}" data-title="${esc(recipe.sourceTitle || "Source")}">Open “${esc(recipe.sourceTitle || "source")}” in the book</button></p>` : ""}
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
        <div class="field"><label>Table<select name="cuisine">${[["texas", "Texas"], ["texmex", "Tex-Mex"], ["garden", "Garden"], ["kids", "Little ones"], ["pets", "The Pet Connection"], ["cajun", "Cajun"], ["library", "Library"]].map(([id, label]) => `<option value="${id}" ${value.cuisine === id ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
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

function notesView() {
  if (!state.user) return accountGate("Log in to see the family's notes.");
  const picks = state.noteFiles.map((item) => `<div class="pick">
    ${item.kind === "image" ? `<img src="${esc(item.url)}" alt="">` : item.kind === "video" ? `<video src="${esc(item.url)}" muted></video>` : `<span class="file-chip">${esc(item.name)}</span>`}
    <button type="button" class="pick-x" data-action="drop-file" data-id="${esc(item.id)}" aria-label="Remove ${esc(item.name)}">×</button>
  </div>`).join("");
  return shell(`
    <div class="feed">
      <p class="kicker">Notepad</p>
      <form id="note-form" class="composer">
        <div class="composer-row">
          ${face(state.user)}
          <textarea id="note-body" name="body" rows="3" placeholder="Share a note with the family…">${esc(state.noteDraft)}</textarea>
        </div>
        ${picks ? `<div class="picks">${picks}</div>` : ""}
        <div class="composer-tools">
          ${state.editingNote ? "" : `<button class="tool" type="button" data-action="note-pick" data-kind="image">${iconPhoto()}<span>Photo</span></button>
          <button class="tool" type="button" data-action="note-pick" data-kind="video">${iconVideo()}<span>Video</span></button>
          <button class="tool" type="button" data-action="note-pick" data-kind="file">${iconFile()}<span>File</span></button>`}
          ${state.editingNote ? `<button class="btn quiet" type="button" data-action="cancel-note">Cancel</button>` : ""}
          <button class="btn" type="submit">${state.editingNote ? "Save" : "Post"}</button>
        </div>
        <input id="note-pick-image" data-note-pick="image" type="file" accept="image/*" multiple hidden>
        <input id="note-pick-video" data-note-pick="video" type="file" accept="video/mp4,video/webm,video/quicktime" hidden>
        <input id="note-pick-file" data-note-pick="file" type="file" accept="application/pdf,text/plain,.pdf,.txt" multiple hidden>
      </form>
      ${state.notes.map(notePost).join("") || `<p class="empty composer-empty">Family notes will show up here.</p>`}
    </div>
  `);
}

function face(user) {
  if (user?.avatar) return `<img class="face" src="${esc(asset(user.avatar))}" alt="">`;
  return `<span class="face-ph">${esc((user?.name || "L").trim().slice(0, 1) || "L")}</span>`;
}

function iconPhoto() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5v-13Zm2.1 10.7 2.4-3a.8.8 0 0 1 1.25 0l1.4 1.7 1.15-1.4a.8.8 0 0 1 1.24 0l2.15 2.6V5.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v10.7Zm1.5-6.4a1.35 1.35 0 1 0 0-2.7 1.35 1.35 0 0 0 0 2.7Z"/></svg>`;
}

function iconVideo() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 7.2A2.2 2.2 0 0 1 6.2 5h7.1A2.2 2.2 0 0 1 15.5 7.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 16.8V7.2Zm13.2 1.7 2.2-1.4A1 1 0 0 1 21 8.4v7.2a1 1 0 0 1-1.6.8l-2.2-1.4V8.9Z"/></svg>`;
}

function iconFile() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 3.5h6.2L19 9.2V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Zm5.5 1.6V9h4.1l-4.1-3.9ZM8.2 12.2h7.6v1.4H8.2v-1.4Zm0 3h5.4v1.4H8.2v-1.4Z"/></svg>`;
}

function notePost(note) {
  const files = Array.isArray(note.attachments) ? note.attachments : [];
  const visual = files.filter((item) => item.kind === "image" || item.kind === "video");
  const docs = files.filter((item) => item.kind === "file");
  const media = visual.map((item) => item.kind === "video"
    ? `<video src="${esc(asset(item.path))}" controls playsinline></video>`
    : `<img src="${esc(asset(item.path))}" alt="">`).join("");
  const chips = docs.map((item) => `<a class="file-chip" href="${esc(asset(item.path))}" download="${esc(item.name || "file")}">${iconFile()}<span>${esc(item.name || "File")}</span></a>`).join("");
  const author = note.author || { name: "Family" };
  const mine = state.user && String(note.author?.id) === String(state.user.id);
  return `<article class="post">
    <header>
      ${face(author)}
      <div>
        <strong>${esc(author.name || "Family")}</strong>
        <time>${esc(when(note.updatedAt))}</time>
      </div>
      ${mine ? `<div class="post-tools">
        <button class="btn quiet" type="button" data-action="edit-note" data-id="${esc(note.id)}">Edit</button>
        <button class="btn danger" type="button" data-action="delete-note" data-id="${esc(note.id)}">Delete</button>
      </div>` : ""}
    </header>
    ${note.body ? `<p>${esc(note.body)}</p>` : ""}
    ${media ? `<div class="post-media ${visual.length > 1 ? "many" : "one"}">${media}</div>` : ""}
    ${chips ? `<div class="file-row">${chips}</div>` : ""}
    ${reactBar("note", note.id, note.social, true)}
  </article>`;
}

function reactBar(type, id, social, withComments) {
  if (!state.user) return "";
  const box = social || { likes: 0, stars: 0, liked: false, starred: false, comments: [] };
  const comments = withComments ? `<form class="comment-form" data-type="${esc(type)}" data-id="${esc(id)}">
      <input name="body" placeholder="Write a comment" required>
      <button class="btn quiet" type="submit">Comment</button>
    </form>
    <div class="comments">${(box.comments || []).map(commentLine).join("")}</div>` : "";
  return `<div class="react">
    <button type="button" class="react-btn ${box.liked ? "on" : ""}" data-action="react" data-kind="like" data-type="${esc(type)}" data-id="${esc(id)}">Like${box.likes ? ` ${box.likes}` : ""}</button>
    <button type="button" class="react-btn ${box.starred ? "on" : ""}" data-action="react" data-kind="star" data-type="${esc(type)}" data-id="${esc(id)}">Star${box.stars ? ` ${box.stars}` : ""}</button>
    ${comments}
  </div>`;
}

function commentLine(comment) {
  const mine = state.user && String(comment.author?.id) === String(state.user.id);
  return `<p class="comment">${face(comment.author)}<span><strong>${esc(comment.author?.name || "Family")}</strong> ${esc(comment.body)}</span>${mine ? `<button type="button" class="btn quiet" data-action="delete-comment" data-id="${esc(comment.id)}">Delete</button>` : ""}</p>`;
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
    ${!editing && item.url && !id && !hostedVideo(item.url) ? `<div class="actions"><button class="btn quiet" data-action="open-source" data-url="${esc(item.url)}" data-title="${esc(item.title)}">Open inside the book</button></div>` : ""}
    ${reactBar("film", item.id, item.social, true)}
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
      <div class="field"><label>Name<input name="name" value="Lisa Miller" required autocomplete="name"></label></div>
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
  } else if (current.name === "family") {
    document.title = "Family · Lisa's Recipe Book";
    html = familyView();
  } else if (current.name === "profile" || current.name === "account") {
    document.title = current.name === "account" ? "Log in · Lisa's Recipe Book" : "Profile · Lisa's Recipe Book";
    html = current.name === "profile" ? profile() : accountGate("Log in with your email and password. First time here? Create an account in the next box.");
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
  root.innerHTML = html;
  state.menuFresh = false;
  document.body.classList.toggle("menu-open", state.menu);
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

async function refreshPrivate() {
  if (!state.user) { state.notes = []; state.library = []; state.people = []; return; }
  const [notes, library, people, recipes] = await Promise.all([
    api("/api/notes"),
    api("/api/library"),
    api("/api/people"),
    api("/api/recipes")
  ]);
  state.notes = notes.notes;
  state.library = library.items;
  state.people = people.people;
  state.recipes = recipes.recipes;
}

document.addEventListener("click", async (event) => {
  const link = event.target.closest("#reader-body a");
  if (link) {
    event.preventDefault();
    const href = link.getAttribute("href");
    if (href && href.startsWith("http")) await openSource(href, link.textContent);
    return;
  }
  const jump = event.target.closest("a.menu-link, a.appbar-item");
  if (jump && state.menu) {
    state.menu = false;
    const next = jump.hash || "#/";
    if (next === (location.hash || "#/")) render();
  }
  const button = event.target.closest("[data-action], [data-cuisine], [data-shelf]");
  if (!button) return;
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
      await api("/api/reactions", { method: "POST", json: { targetType: type, targetId: id, kind } });
      flipSocial(type, id, kind);
      await refreshPrivate();
      if (type === "world" && route().name === "world") await ensureWorld(route().id);
      else render();
    }
    if (action === "follow") {
      const result = await api(`/api/people/${button.dataset.id}/follow`, { method: "POST" });
      const person = (state.people || []).find((item) => String(item.id) === String(button.dataset.id));
      if (person) {
        const was = person.following;
        person.following = result.following;
        person.followers = Math.max(0, (person.followers || 0) + (result.following && !was ? 1 : !result.following && was ? -1 : 0));
      }
      render();
    }
    if (action === "delete-comment" && confirm("Delete this comment?")) {
      await api(`/api/comments/${button.dataset.id}`, { method: "DELETE" });
      await refreshPrivate();
      if (route().name === "world") await ensureWorld(route().id);
      else render();
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
    if (action === "retry-world") { state.worldMiss = ""; state.worldError = ""; render(); }
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
  if (!(input instanceof HTMLInputElement) || !input.dataset.notePick) return;
  const box = document.getElementById("note-body");
  if (box) state.noteDraft = box.value;
  const incoming = [...input.files];
  input.value = "";
  for (const file of incoming) {
    const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
    const stored = kind === "image" ? await shrinkImage(file) : file;
    state.noteFiles.push({
      id: crypto.randomUUID(),
      file: stored,
      url: URL.createObjectURL(stored),
      kind,
      name: file.name || "File"
    });
  }
  render();
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    if (form.classList.contains("comment-form")) {
      const text = String(data.body || "").trim();
      if (!text) throw new Error("Write a comment first.");
      await api("/api/comments", { method: "POST", json: { targetType: form.dataset.type, targetId: form.dataset.id, body: text } });
      await refreshPrivate();
      if (form.dataset.type === "world" && route().name === "world") await ensureWorld(route().id);
      else render();
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
      const text = String(data.body || "").trim();
      if (state.editingNote) {
        const payload = { body: text };
        if (text) payload.title = text.split("\n")[0].slice(0, 80);
        await api(`/api/notes/${state.editingNote}`, { method: "PATCH", json: payload });
        state.editingNote = "";
        state.noteDraft = "";
        await refreshPrivate();
        say("Note saved.");
        render();
      } else {
        if (!text && !state.noteFiles.length) throw new Error("Write a note, or add a picture.");
        const attachments = [];
        for (const item of state.noteFiles) {
          const saved = await uploadPieces(item.file, item.name);
          attachments.push({ path: saved.path, name: item.name, kind: saved.kind });
        }
        await api("/api/notes", { method: "POST", json: { body: text, attachments } });
        state.noteFiles.forEach((item) => URL.revokeObjectURL(item.url));
        state.noteFiles = [];
        state.noteDraft = "";
        await refreshPrivate();
        say("Posted.");
        render();
      }
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

function flipSocial(type, id, kind) {
  const apply = (social) => {
    const box = { likes: 0, stars: 0, liked: false, starred: false, comments: [], ...(social || {}) };
    if (kind === "star") {
      box.starred = !box.starred;
      box.stars = Math.max(0, box.stars + (box.starred ? 1 : -1));
    } else {
      box.liked = !box.liked;
      box.likes = Math.max(0, box.likes + (box.liked ? 1 : -1));
    }
    return box;
  };
  const mealId = String(id).replace(/^mealdb-/, "");
  for (const list of [state.shelf, state.featured, state.bookHits]) {
    for (const meal of list) {
      if (type === "world" && String(meal.id).replace(/^mealdb-/, "") === mealId) meal.social = apply(meal.social);
    }
  }
  for (const recipe of Object.values(state.worldCache)) {
    if (recipe && reactionTarget(recipe).type === type && reactionTarget(recipe).id === id) recipe.social = apply(recipe.social);
  }
  for (const recipe of state.recipes) {
    const key = reactionTarget(recipe);
    if (key.type === type && key.id === id) recipe.social = apply(recipe.social);
  }
  for (const note of state.notes) {
    if (type === "note" && String(note.id) === String(id)) note.social = apply(note.social);
  }
  for (const item of state.library) {
    if (type === "film" && String(item.id) === String(id)) item.social = apply(item.social);
  }
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
  state.worldLoading = true;
  state.worldError = "";
  try {
    const data = await api(`/api/world/${id}`);
    state.worldCache[id] = data.recipe;
  } catch (error) {
    state.worldError = error.message;
  }
  state.worldLoading = false;
  if (route().name === "world" && route().id === id) render();
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

window.addEventListener("hashchange", () => { state.reader = null; state.menu = false; render(); });
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

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=3").catch(() => {});
restoreTimer();
await rememberIfInstalled();
offerInstall();

const boot = await api("/api/health").then(() => api("/api/recipes")).catch((error) => ({ error }));
if (boot.error) {
  document.getElementById("app").innerHTML = `<p class="boot">${esc(boot.error)}</p>`;
} else {
  state.recipes = boot.recipes;
  loadShelf();
  try {
    const me = await api("/api/auth/me");
    state.user = me.user;
    if (state.user) await refreshPrivate();
  } catch { /* a guest can still read */ }
  render();
}
