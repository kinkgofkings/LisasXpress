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
  recording: null
};
const timer = { seconds: 0, handle: null };

const $ = (html) => html;
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

function asset(src) {
  if (!src) return "";
  if (/^https?:\/\//.test(src)) return src;
  if (src.startsWith("/uploads/")) return `${API}${src}`;
  return src;
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
  return `${location.origin}${location.pathname}#/recipe/${recipe.id}`;
}
function youtubeId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1);
    return parsed.searchParams.get("v") || (parsed.pathname.match(/\/(embed|shorts)\/([^/]+)/) || [])[2] || "";
  } catch { return ""; }
}
function pad(n) { return String(n).padStart(2, "0"); }
function timerText() { return `${pad(Math.floor(timer.seconds / 60))}:${pad(timer.seconds % 60)}`; }

function shell(main) {
  const here = route().name;
  const links = [["home", "Book"], ["notes", "Notepad"], ["studio", "Studio"], ["profile", "Profile"]];
  const avatar = state.user?.avatar
    ? `<img class="avatar" alt="" src="${esc(asset(state.user.avatar))}" style="width:36px;height:36px">`
    : "";
  return `
    <header class="mast">
      <a class="brand" href="#/">
        <p class="eyebrow">For Lisa Miller</p>
        <h1>Lisa's Recipe Book</h1>
      </a>
      <nav class="nav">
        ${links.map(([id, label]) => `<a class="${here === id || (id === "home" && here === "recipe") ? "active" : ""}" href="#/${id === "home" ? "" : id}">${label}</a>`).join("")}
        ${state.user ? `<a href="#/profile">${avatar || esc(state.user.name.split(" ")[0])}</a>` : `<a class="${here === "account" ? "active" : ""}" href="#/account">Set up profile</a>`}
      </nav>
    </header>
    <main class="wrap">${main}</main>
    ${state.reader ? reader() : ""}
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
  `;
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
        <p class="eyebrow" style="color:#e7c7a2">Cajun & Texas</p>
        <h2 class="page-title" style="color:#fffaf4;font-size:clamp(42px,6vw,72px)">A table with your name on it.</h2>
        <p>Thirty plates from the bayou and the Hill Country, including the ones already written in Tex's kitchen. Add your own, print them, and send them on.</p>
        <div class="actions"><a class="btn" href="#/new">Add a recipe</a>${state.user ? `<a class="btn quiet" href="#/studio" style="color:#fff;border-color:rgba(255,255,255,.3)">Open the studio</a>` : `<a class="btn quiet" href="#/account" style="color:#fff;border-color:rgba(255,255,255,.3)">Create your profile</a>`}</div>
      </div>
      ${featured ? `<a class="hero-photo" href="#/recipe/${featured.id}" style="background-image:url('${esc(asset(featured.image))}')"><span>${esc(featured.title)}</span></a>` : ""}
    </section>
    <div class="toolbar">
      <input id="q" placeholder="Search the book" value="${esc(state.q)}">
      ${["all", "texas", "cajun"].map((item) => `<button class="chip ${state.cuisine === item ? "active" : ""}" data-cuisine="${item}">${item === "all" ? "All" : item === "texas" ? "Texas" : "Cajun"}</button>`).join("")}
      <span class="empty">${list.length} recipes</span>
    </div>
    <section class="grid">
      ${list.map(card).join("") || `<p class="empty">Nothing matches that search.</p>`}
    </section>
  `);
}

function card(recipe) {
  return `<a class="card" href="#/recipe/${recipe.id}">
    ${recipe.image ? `<img src="${esc(asset(recipe.image))}" alt="${esc(recipe.title)}">` : `<div class="ph"></div>`}
    <div>
      <div class="kicker">${esc(recipe.cuisine)} · ${esc(recipe.category)}${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}</div>
      <h2>${esc(recipe.title)}</h2>
      <p>${esc(recipe.summary)}</p>
    </div>
  </a>`;
}

function recipeView(recipe) {
  const shareText = `${recipe.title} from Lisa's Recipe Book`;
  const link = recipeLink(recipe);
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
        <p class="kicker">${esc(recipe.cuisine)} · ${esc(recipe.category)}${recipe.family ? `<span class="badge">Tex's kitchen</span>` : ""}</p>
        <h2 class="page-title" style="font-size:clamp(36px,5vw,58px)">${esc(recipe.title)}</h2>
        <p>${esc(recipe.summary)}</p>
        <div class="meta">
          <span>Serves ${esc(recipe.yieldText)}</span>
          <span>Prep ${clock(recipe.prepMinutes)}</span>
          <span>Cook ${clock(recipe.cookMinutes)}</span>
        </div>
        <div class="actions no-print">
          <button class="btn" data-action="print">Print</button>
          <button class="btn moss" data-action="share" data-title="${esc(shareText)}" data-url="${esc(link)}">Share</button>
          <button class="btn quiet" data-action="copy" data-text="${esc(`${shareText}\n${link}`)}">Copy link</button>
          <a class="btn quiet" href="sms:?&body=${encodeURIComponent(`${shareText} ${link}`)}">Text</a>
          <a class="btn quiet" href="mailto:?subject=${encodeURIComponent(recipe.title)}&body=${encodeURIComponent(`${recipe.summary}\n\n${link}`)}">Email</a>
          ${state.user ? `<a class="btn quiet" href="#/edit/${recipe.id}">Edit</a><button class="btn danger" data-action="delete-recipe" data-id="${recipe.id}">Delete</button>` : `<a class="btn quiet" href="#/account">Sign in to edit</a>`}
        </div>
        <div class="share-box no-print timer">
          <strong id="timer-readout">${timerText()}</strong>
          <input id="timer-min" type="number" min="1" max="240" placeholder="Min" style="width:80px">
          <button class="btn moss" data-action="timer-start">Start</button>
          <button class="btn quiet" data-action="timer-reset">Reset</button>
        </div>
        <h3>Ingredients</h3>
        <ul>${recipe.ingredients.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        <h3>Method</h3>
        <ol>${recipe.steps.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>
        ${recipe.notes ? `<h3>Notes</h3><p>${esc(recipe.notes)}</p>` : ""}
        ${recipe.sourceUrl ? `<p class="no-print"><button class="btn-line" data-action="open-source" data-url="${esc(recipe.sourceUrl)}" data-title="${esc(recipe.sourceTitle || "Source")}">Open “${esc(recipe.sourceTitle || "source")}” in the book</button></p>` : ""}
        ${state.user ? `<form class="no-print" id="media-form">
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
        <div class="field"><label>Table<select name="cuisine"><option value="texas" ${value.cuisine === "texas" ? "selected" : ""}>Texas</option><option value="cajun" ${value.cuisine === "cajun" ? "selected" : ""}>Cajun</option></select></label></div>
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

function notesView() {
  if (!state.user) return accountGate("The notepad keeps your own pages in this book.");
  const selected = state.notes.find((note) => String(note.id) === String(state.noteId)) || state.notes[0];
  return shell(`
    <h2 class="page-title">Notepad</h2>
    <div class="layout">
      <aside class="stack">
        <button class="btn" data-action="new-note">New note</button>
        ${state.notes.map((note) => `<button class="btn quiet" data-action="pick-note" data-id="${note.id}">${esc(note.title)}</button>`).join("") || `<p class="empty">No notes yet.</p>`}
      </aside>
      <form id="note-form" class="panel">
        <input type="hidden" name="id" value="${selected ? esc(selected.id) : ""}">
        <div class="field"><label>Title<input name="title" value="${esc(selected?.title || "")}"></label></div>
        <div class="field"><label>Note<textarea name="body" style="min-height:280px">${esc(selected?.body || "")}</textarea></label></div>
        <div class="actions"><button class="btn moss" type="submit">Save note</button>${selected ? `<button class="btn danger" type="button" data-action="delete-note" data-id="${selected.id}">Delete</button>` : ""}</div>
      </form>
    </div>
  `);
}

function studio() {
  if (!state.user) return accountGate("The studio is where films and saved posts live.");
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
        <div class="field"><label>Title<input name="title" required></label></div>
        <div class="field"><label>YouTube description<textarea name="description" placeholder="What you would paste into YouTube"></textarea></label></div>
        <div class="field"><label>Video file<input name="file" type="file" accept="video/mp4,video/webm"></label></div>
        <video id="live-preview" class="frame" autoplay muted playsinline style="display:${state.recording ? "block" : "none"}"></video>
        <div class="actions">
          <button class="btn moss" type="submit">Save film</button>
          <button class="btn quiet" type="button" data-action="record">${state.recording?.on ? "Stop and use this take" : "Record from this camera"}</button>
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

function libraryCard(item) {
  const id = youtubeId(item.url);
  return `<article class="film">
    <p class="kicker">${esc(item.kind)}</p>
    <h3>${esc(item.title)}</h3>
    ${item.filePath ? `<video src="${esc(asset(item.filePath))}" controls></video>` : ""}
    ${id ? `<iframe class="frame" src="https://www.youtube-nocookie.com/embed/${esc(id)}" allowfullscreen></iframe>` : ""}
    ${item.notes ? `<p>${esc(item.notes)}</p>` : ""}
    ${item.description ? `<p>${esc(item.description)}</p>` : ""}
    <div class="actions">
      ${item.url ? `<button class="btn quiet" data-action="open-source" data-url="${esc(item.url)}" data-title="${esc(item.title)}">Open inside the book</button>` : ""}
      ${item.description ? `<button class="btn quiet" data-action="copy" data-text="${esc(`${item.title}\n\n${item.description}`)}">Copy YouTube text</button>` : ""}
      ${item.kind === "film" ? `<button class="btn quiet" data-action="open-source" data-url="https://www.youtube.com/upload" data-title="YouTube upload">Open YouTube upload</button>` : ""}
      <button class="btn danger" data-action="delete-library" data-id="${item.id}">Remove</button>
    </div>
  </article>`;
}

function profile() {
  if (!state.user) return accountGate("A profile holds your name, portrait, and the book you keep.");
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
      <button class="btn quiet" data-action="sign-out">Sign out</button>
    </section>
  `);
}

function accountGate(copy) {
  return shell(`
    <section class="hero">
      <div class="hero-copy"><h2 class="page-title" style="color:#fffaf4">Your profile</h2><p>${esc(copy)}</p></div>
    </section>
    ${accountForms()}
  `);
}

function accountForms() {
  return `<div class="split">
    <form id="register-form" class="panel">
      <h3>Create the profile</h3>
      <div class="field"><label>Name<input name="name" value="Lisa Miller" required></label></div>
      <div class="field"><label>Email<input name="email" type="email" required></label></div>
      <div class="field"><label>Password<input name="password" type="password" minlength="8" required></label></div>
      <button class="btn" type="submit">Create profile</button>
    </form>
    <form id="login-form" class="panel">
      <h3>Welcome back</h3>
      <div class="field"><label>Email<input name="email" type="email" required></label></div>
      <div class="field"><label>Password<input name="password" type="password" required></label></div>
      <button class="btn moss" type="submit">Sign in</button>
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
  } else if (current.name === "edit" || current.name === "new") {
    document.title = "Write a recipe · Lisa's Recipe Book";
    const recipe = current.name === "edit" ? state.recipes.find((item) => item.id === current.id) : null;
    html = state.user ? editor(recipe) : accountGate("Sign in before writing in the book.");
  } else if (current.name === "notes") {
    document.title = "Notepad · Lisa's Recipe Book";
    html = notesView();
  } else if (current.name === "studio") {
    document.title = "Studio · Lisa's Recipe Book";
    html = studio();
  } else if (current.name === "profile" || current.name === "account") {
    document.title = "Profile · Lisa's Recipe Book";
    html = current.name === "profile" ? profile() : accountGate("Create a profile to keep notes, pictures, and films.");
  } else {
    document.title = "Lisa's Recipe Book";
    html = home();
  }
  root.innerHTML = html;
  const preview = document.getElementById("live-preview");
  if (preview && state.recording?.stream) preview.srcObject = state.recording.stream;
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
  const button = event.target.closest("[data-action], [data-cuisine]");
  if (!button) return;
  if (button.dataset.cuisine) { state.cuisine = button.dataset.cuisine; render(); return; }
  const action = button.dataset.action;
  try {
    if (action === "print") window.print();
    if (action === "copy") { await navigator.clipboard.writeText(button.dataset.text); say("Copied."); }
    if (action === "share") {
      const payload = { title: button.dataset.title, url: button.dataset.url, text: button.dataset.title };
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`); say("Copied, ready to send."); }
    }
    if (action === "timer-start") {
      const input = document.getElementById("timer-min");
      if (!timer.handle && timer.seconds === 0) timer.seconds = Math.max(0, Number(input.value) || 0) * 60;
      if (!timer.seconds) return;
      if (timer.handle) { clearInterval(timer.handle); timer.handle = null; button.textContent = "Start"; return; }
      button.textContent = "Pause";
      timer.handle = setInterval(() => {
        timer.seconds -= 1;
        const readout = document.getElementById("timer-readout");
        if (readout) readout.textContent = timerText();
        if (timer.seconds <= 0) { clearInterval(timer.handle); timer.handle = null; say("The timer is up."); }
      }, 1000);
    }
    if (action === "timer-reset") { clearInterval(timer.handle); timer.handle = null; timer.seconds = 0; render(); }
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
    if (action === "new-note") { state.noteId = ""; state.notes = [{ id: "", title: "New note", body: "" }, ...state.notes.filter((note) => note.id)]; render(); }
    if (action === "pick-note") { state.noteId = button.dataset.id; render(); }
    if (action === "delete-note") {
      await api(`/api/notes/${button.dataset.id}`, { method: "DELETE" });
      state.noteId = "";
      await refreshPrivate();
      render();
    }
    if (action === "delete-library") {
      await api(`/api/library/${button.dataset.id}`, { method: "DELETE" });
      await refreshPrivate();
      render();
    }
    if (action === "sign-out") { localStorage.removeItem("lisa-token"); state.user = null; go("#/"); }
    if (action === "record") await toggleRecord();
  } catch (error) {
    if (error?.name !== "AbortError") say(error.message || "That did not work.");
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "q") return;
  state.q = event.target.value;
  const caret = event.target.selectionStart;
  render();
  const field = document.getElementById("q");
  if (field) { field.focus(); field.setSelectionRange(caret, caret); }
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
      const body = new FormData(form);
      const result = await api("/api/auth/avatar", { method: "POST", body });
      state.user = result.user;
      say("Portrait saved.");
      render();
    }
    if (form.id === "recipe-form") {
      const editing = route().name === "edit";
      const result = await api(editing ? `/api/recipes/${route().id}` : "/api/recipes", { method: editing ? "PATCH" : "POST", json: data });
      replaceRecipe(result.recipe);
      go(`#/recipe/${result.recipe.id}`);
    }
    if (form.id === "media-form") {
      const body = new FormData(form);
      const file = body.get("file");
      const kind = file?.type?.startsWith("video/") ? "video" : "image";
      const role = kind === "image" && !state.recipes.find((item) => item.id === route().id)?.image ? "cover" : "gallery";
      const result = await api(`/api/recipes/${route().id}/media?kind=${kind}&role=${role}`, { method: "POST", body });
      replaceRecipe(result.recipe);
      render();
    }
    if (form.id === "note-form") {
      if (data.id) await api(`/api/notes/${data.id}`, { method: "PATCH", json: data });
      else {
        const created = await api("/api/notes", { method: "POST", json: data });
        state.noteId = created.note.id;
      }
      await refreshPrivate();
      say("Note saved.");
      render();
    }
    if (form.id === "link-form") {
      await api("/api/library", { method: "POST", json: data });
      await refreshPrivate();
      say("Saved for later.");
      render();
    }
    if (form.id === "film-form") {
      const body = new FormData(form);
      if (state.recording?.blob && !body.get("file")?.size) body.set("file", state.recording.blob, "lisa-film.webm");
      body.set("kind", "film");
      await api("/api/library", { method: "POST", body });
      state.recording = null;
      await refreshPrivate();
      say("Film saved in your studio.");
      render();
    }
  } catch (error) {
    say(error.message);
  }
});

function replaceRecipe(recipe) {
  const index = state.recipes.findIndex((item) => item.id === recipe.id);
  if (index >= 0) state.recipes[index] = recipe;
  else state.recipes.unshift(recipe);
  render();
}

async function toggleRecord() {
  if (state.recording?.on && state.recording.recorder) {
    state.recording.recorder.stop();
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const mime = MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  recorder.onstop = () => {
    stream.getTracks().forEach((track) => track.stop());
    state.recording = { blob: new Blob(chunks, { type: recorder.mimeType || "video/webm" }), on: false };
    say("Take ready. Save the film when the title is filled in.");
    render();
  };
  recorder.start();
  state.recording = { stream, recorder, on: true };
  render();
}

window.addEventListener("hashchange", () => { state.reader = null; render(); });

const boot = await api("/api/health").then(() => api("/api/recipes")).catch((error) => ({ error }));
if (boot.error) {
  document.getElementById("app").innerHTML = `<p class="boot">${esc(boot.error)}</p>`;
} else {
  state.recipes = boot.recipes;
  try {
    const me = await api("/api/auth/me");
    state.user = me.user;
    if (state.user) await refreshPrivate();
  } catch { /* a guest can still read */ }
  render();
}
