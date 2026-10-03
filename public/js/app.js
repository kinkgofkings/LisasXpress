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
  libraryEdit: ""
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
  if (src.startsWith("/uploads/")) return `${API}${src}${src.includes("?") ? "&" : "?"}v=2`;
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
  if (cuisine === "library") return "Library";
  return cuisine || "";
}
function youtubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    return parsed.searchParams.get("v") || (parsed.pathname.match(/\/(embed|shorts)\/([^/]+)/) || [])[2] || "";
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
  const here = route().name;
  const links = [["home", "Book"], ["library", "Library"], ["notes", "Notepad"], ["studio", "Studio"], ["profile", "Profile"]];
  const avatar = state.user?.avatar
    ? `<img class="avatar" alt="" src="${esc(asset(state.user.avatar))}" style="width:36px;height:36px">`
    : "";
  const active = (id) => {
    if (id === "home") return here === "home" || here === "recipe";
    if (id === "library") return here === "library" || here === "world";
    return here === id;
  };
  return `
    <header class="mast">
      <a class="brand" href="#/">
        <img class="ribbon-mark" src="/ribbon.svg" alt="">
        <span>
          <p class="eyebrow">For Lisa Miller</p>
          <h1>Lisa's Recipe Book</h1>
        </span>
      </a>
      <nav class="nav">
        ${links.map(([id, label]) => `<a class="${active(id) ? "active" : ""}" href="#/${id === "home" ? "" : id}">${label}</a>`).join("")}
        ${state.user ? `<a href="#/profile">${avatar || esc(state.user.name.split(" ")[0])}</a><button class="btn quiet" type="button" data-action="sign-out">Log out</button>` : `<a class="btn ${here === "account" ? "active" : ""}" href="#/account">Log in</a>`}
      </nav>
    </header>
    <main class="wrap">${main}</main>
    ${state.reader ? reader() : ""}
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
  `;
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

function home() {
  const list = state.recipes.filter((recipe) => {
    const blob = `${recipe.title} ${recipe.summary} ${recipe.category}`.toLowerCase();
    if (state.cuisine !== "all" && recipe.cuisine !== state.cuisine) return false;
    if (state.q && !blob.includes(state.q.toLowerCase())) return false;
    return true;
  });
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
      ${[["all", "All"], ["texas", "Texas"], ["cajun", "Cajun"], ["library", "Kept"]].map(([item, label]) => `<button type="button" class="chip ${state.cuisine === item ? "active" : ""}" data-cuisine="${item}">${label}</button>`).join("")}
      <span class="empty">${list.length} recipes</span>
    </div>
    <section class="grid">
      ${list.map(card).join("") || `<p class="empty">${state.cuisine === "library" ? "Nothing kept from the library yet. Browse below and keep a plate." : "Nothing matches that search."}</p>`}
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

function worldCard(meal) {
  return `<a class="card" href="#/world/${esc(meal.id)}">
    ${meal.image ? `<img src="${esc(meal.image)}" alt="${esc(meal.title)}">` : `<div class="ph"></div>`}
    <div>
      <div class="kicker">Library${meal.category ? ` · ${esc(meal.category)}` : ""}${meal.area ? ` · ${esc(meal.area)}` : ""}</div>
      <h2>${esc(meal.title)}</h2>
      <p>Open it, then keep it beside your own recipes.</p>
    </div>
  </a>`;
}

function card(recipe) {
  return `<a class="card" href="#/recipe/${recipe.id}">
    ${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="${esc(recipe.title)}">` : `<div class="ph"></div>`}
    <div>
      <div class="kicker">${esc(cuisineLabel(recipe.cuisine))} · ${esc(recipe.category)}${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}</div>
      <h2>${esc(recipe.title)}</h2>
      <p>${esc(recipe.summary)}</p>
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
        <p class="kicker">${recipe.world ? "Library" : esc(cuisineLabel(recipe.cuisine))} · ${esc(recipe.category)}${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}</p>
        <h2 class="page-title" style="font-size:clamp(36px,5vw,58px)">${esc(recipe.title)}</h2>
        <p>${esc(recipe.summary)}</p>
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
          ${recipe.youtube ? `<a class="btn quiet" href="${esc(recipe.youtube)}" target="_blank" rel="noopener">Watch on YouTube</a>` : ""}
          ${recipe.world
            ? (kept
              ? `<a class="btn" href="#/recipe/${kept.id}">Open in your book</a>`
              : (state.user
                ? `<button class="btn" data-action="keep-recipe" data-id="${esc(recipe.mealId)}">Keep in the book</button>`
                : `<a class="btn" href="#/account">Log in to keep this</a>`))
            : (state.user
              ? `<a class="btn quiet" href="#/edit/${recipe.id}">Edit</a><button class="btn danger" data-action="delete-recipe" data-id="${recipe.id}">Delete</button>`
              : `<a class="btn quiet" href="#/account">Log in to edit</a>`)}
        </div>
        <div class="share-box no-print timer">
          <strong id="timer-readout">${timerText()}</strong>
          <input id="timer-min" type="number" min="1" max="240" placeholder="Min" style="width:80px">
          <button class="btn moss" data-action="timer-start">${timer.running ? "Pause" : "Start"}</button>
          <button class="btn quiet" data-action="timer-reset">Reset</button>
        </div>
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
        <div class="field"><label>Table<select name="cuisine">${[["texas", "Texas"], ["cajun", "Cajun"], ["library", "Library"]].map(([id, label]) => `<option value="${id}" ${value.cuisine === id ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
        <div class="field"><label>Kind<select name="category">${["Mains", "Sides", "Breakfast", "Sweets", "Drinks"].map((item) => `<option ${value.category === item ? "selected" : ""}>${item}</option>`).join("")}</select></label></div>
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
    ${state.shelfError ? `<p class="empty">${esc(state.shelfError)}</p>` : ""}
    <section class="grid">
      ${state.shelf.map(worldCard).join("") || (state.shelfLoading ? "" : `<p class="empty">Nothing matches that search.</p>`)}
    </section>
  `);
}

function notesView() {
  if (!state.user) return accountGate("Log in to open your notepad.");
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
          <textarea id="note-body" name="body" rows="3" placeholder="Write a note…">${esc(state.noteDraft)}</textarea>
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
      ${state.notes.map(notePost).join("") || `<p class="empty composer-empty">Your notes will show up here.</p>`}
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
  return `<article class="post">
    <header>
      ${face(state.user)}
      <div>
        <strong>${esc(state.user?.name || "Lisa")}</strong>
        <time>${esc(when(note.updatedAt))}</time>
      </div>
      <div class="post-tools">
        <button class="btn quiet" type="button" data-action="edit-note" data-id="${esc(note.id)}">Edit</button>
        <button class="btn danger" type="button" data-action="delete-note" data-id="${esc(note.id)}">Delete</button>
      </div>
    </header>
    ${note.body ? `<p>${esc(note.body)}</p>` : ""}
    ${media ? `<div class="post-media ${visual.length > 1 ? "many" : "one"}">${media}</div>` : ""}
    ${chips ? `<div class="file-row">${chips}</div>` : ""}
  </article>`;
}

function when(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function studio() {
  if (!state.user) return accountGate("Log in to save films and links.");
  const saved = state.library.filter((item) => item.kind !== "film");
  const films = state.library.filter((item) => item.kind === "film");
  return shell(`
    <h2 class="page-title">Studio</h2>
    <p>Save a TikTok, Facebook post, or YouTube video for later. Record a film here, or upload one, and keep the YouTube description with it.</p>
    <div class="split">
      <form id="link-form" class="panel">
        <h3>Save for later</h3>
        <div class="field"><label>Where<select name="kind"><option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="facebook">Facebook</option></select></label></div>
        <div class="field"><label>Title<input name="title" required></label></div>
        <div class="field"><label>Link<input name="url" required placeholder="https://"></label></div>
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
    <h3>Saved to watch</h3>
    <div class="stack">
      ${saved.map(libraryCard).join("") || `<p class="empty">Nothing saved yet.</p>`}
    </div>
    <h3>Your shelf</h3>
    <div class="stack">${films.map(libraryCard).join("") || `<p class="empty">Your films will sit here.</p>`}</div>
  `);
}

function cameraStage() {
  const rec = state.recording;
  if (!rec?.stream && !rec?.url) return `<button class="btn quiet" type="button" data-action="camera-open">Open camera</button>`;
  const live = Boolean(rec.stream);
  return `<div class="stage ${live ? "" : "review"}">
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
  return `<article class="film">
    <div class="card-tools">
      <p class="kicker">${esc(item.kind)}</p>
      <button class="btn quiet" type="button" data-action="edit-library" data-id="${esc(item.id)}">Edit</button>
      <button class="btn danger" type="button" data-action="delete-library" data-id="${esc(item.id)}">Delete</button>
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
    ${id ? `<iframe class="frame" src="https://www.youtube-nocookie.com/embed/${esc(id)}" allowfullscreen></iframe>` : ""}
    ${!editing && item.notes ? `<p>${esc(item.notes)}</p>` : ""}
    ${!editing && item.description ? `<p>${esc(item.description)}</p>` : ""}
    ${!editing && item.url ? `<div class="actions"><button class="btn quiet" data-action="open-source" data-url="${esc(item.url)}" data-title="${esc(item.title)}">Open inside the book</button></div>` : ""}
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
  } else if (current.name === "profile" || current.name === "account") {
    document.title = current.name === "account" ? "Log in · Lisa's Recipe Book" : "Profile · Lisa's Recipe Book";
    html = current.name === "profile" ? profile() : accountGate("Log in with your email and password. First time here? Create an account in the next box.");
  } else {
    document.title = "Lisa's Recipe Book";
    html = home();
  }
  root.innerHTML = html;
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

async function refreshPrivate() {
  if (!state.user) { state.notes = []; state.library = []; return; }
  const [notes, library] = await Promise.all([api("/api/notes"), api("/api/library")]);
  state.notes = notes.notes;
  state.library = library.items;
}

document.addEventListener("click", async (event) => {
  const link = event.target.closest("#reader-body a");
  if (link) {
    event.preventDefault();
    const href = link.getAttribute("href");
    if (href && href.startsWith("http")) await openSource(href, link.textContent);
    return;
  }
  const button = event.target.closest("[data-action], [data-cuisine], [data-shelf]");
  if (!button) return;
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
      say("Kept in the book.");
      go(`#/recipe/${data.recipe.id}`);
    }
    if (action === "retry-world") { state.worldMiss = ""; state.worldError = ""; render(); }
    if (action === "sign-out") { localStorage.removeItem("lisa-token"); state.user = null; go("#/"); }
  } catch (error) {
    if (error?.name !== "AbortError") say(error.message || "That did not work.");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "q") {
    state.q = event.target.value;
    const caret = event.target.selectionStart;
    render();
    const field = document.getElementById("q");
    if (field) { field.focus(); field.setSelectionRange(caret, caret); }
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
  let warned = "";
  for (const file of incoming) {
    if (state.noteFiles.length >= 6) { warned = "Six files is the limit for one note."; break; }
    const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
    if (kind !== "image" && file.size > 1_500_000) {
      warned = kind === "video" ? "That video is too big to keep. Try a short clip." : "That file is too large.";
      continue;
    }
    const stored = kind === "image" ? await shrinkImage(file) : file;
    if (stored.size > 1_500_000) { warned = "That picture is still too large."; continue; }
    state.noteFiles.push({
      id: crypto.randomUUID(),
      file: stored,
      url: URL.createObjectURL(stored),
      kind,
      name: file.name || "File"
    });
  }
  if (warned) say(warned);
  else render();
});

document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  try {
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
      const incoming = new FormData(form);
      const picture = await shrinkImage(incoming.get("file"));
      const body = new FormData();
      body.set("file", picture);
      const kind = picture?.type?.startsWith("video/") ? "video" : "image";
      const role = kind === "image" && !state.recipes.find((item) => item.id === route().id)?.image ? "cover" : "gallery";
      const result = await api(`/api/recipes/${route().id}/media?kind=${kind}&role=${role}`, { method: "POST", body });
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
        const body = new FormData();
        body.set("body", text);
        state.noteFiles.forEach((item) => body.append("file", item.file, item.name || "file"));
        await api("/api/notes", { method: "POST", body });
        state.noteFiles.forEach((item) => URL.revokeObjectURL(item.url));
        state.noteFiles = [];
        state.noteDraft = "";
        await refreshPrivate();
        say("Posted.");
        render();
      }
    }
    if (form.id === "link-form") {
      await api("/api/library", { method: "POST", json: data });
      await refreshPrivate();
      say("Saved for later.");
      render();
    }
    if (form.id === "film-form") {
      rememberFilm();
      const body = new FormData(form);
      const take = state.recording?.blob;
      if (take && !body.get("file")?.size) {
        if (take.size > 1_500_000) throw new Error("That take is too long to keep. Record a shorter one.");
        const ext = take.type.includes("mp4") ? "mp4" : "webm";
        body.set("file", take, `lisa-film.${ext}`);
      }
      body.set("kind", "film");
      await api("/api/library", { method: "POST", body });
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
      video: { facingMode: { ideal: facing }, width: { ideal: 640 }, height: { ideal: 480 } }
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
  const mime = recorderMime();
  const stream = state.recording.stream;
  const facing = state.recording.facing;
  let recorder;
  try {
    recorder = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      videoBitsPerSecond: 500_000,
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
    const blob = new Blob(chunks, { type: recorder.mimeType || mime || "video/webm" });
    rememberFilm();
    state.recording = { blob, url: URL.createObjectURL(blob), on: false, facing };
    render();
  };
  recorder.start();
  state.recording = { stream, recorder, facing, on: true, started: Date.now(), blob: null, url: "" };
  rememberFilm();
  render();
  startClock();
}

function stopRecording() {
  if (state.recording?.recorder?.state === "recording") state.recording.recorder.stop();
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

window.addEventListener("hashchange", () => { state.reader = null; render(); });

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

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
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
