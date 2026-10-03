import { worldCatalog, worldRecipe } from "../../server/world.js";
import { browse } from "./browse.js";

function json(data, status = 200) {
  return Response.json(data, { status });
}

function lines(value) {
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

function cuisineOf(value) {
  if (value === "cajun" || value === "library") return value;
  return "texas";
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    bio: row.bio,
    avatar: row.avatar_path
  };
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return new Uint8Array(signature);
}

function sameBytes(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

async function signToken(env, userId) {
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
    id: userId,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30
  })));
  const signature = bytesToBase64Url(await hmac(env.AUTH_SECRET, body));
  return `${body}.${signature}`;
}

async function readToken(env, header = "") {
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !token.includes(".") || !env.AUTH_SECRET) return null;
  const [body, signature] = token.split(".");
  const expected = bytesToBase64Url(await hmac(env.AUTH_SECRET, body));
  if (!sameBytes(new TextEncoder().encode(signature), new TextEncoder().encode(expected))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (!payload?.id || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hashPassword(env, password) {
  const digest = bytesToBase64Url(await hmac(env.AUTH_SECRET, `lisa-password:${password}`));
  return `hmac1:${digest}`;
}

async function checkPassword(env, password, stored) {
  if (stored.startsWith("hmac1:")) {
    const next = await hashPassword(env, password);
    return sameBytes(new TextEncoder().encode(next), new TextEncoder().encode(stored));
  }
  if (stored.startsWith("$2")) {
    const bcrypt = await import("bcryptjs");
    return bcrypt.compare(password, stored);
  }
  return false;
}

async function userFrom(env, request) {
  const payload = await readToken(env, request.headers.get("authorization") || "");
  if (!payload) return null;
  return env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.id).first();
}

async function recipeRow(env, row) {
  if (!row) return null;
  const media = await env.DB.prepare(
    "SELECT id, kind, path, caption FROM recipe_media WHERE recipe_id = ? ORDER BY id"
  ).bind(row.id).all();
  return {
    id: row.id,
    title: row.title,
    cuisine: row.cuisine,
    category: row.category,
    summary: row.summary,
    yieldText: row.yield_text,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    notes: row.notes,
    image: row.image,
    imageCredit: row.image_credit,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    family: Boolean(row.family),
    updatedAt: row.updated_at,
    media: media.results || []
  };
}

async function slugify(env, title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "recipe";
  let id = base;
  let n = 2;
  while (await env.DB.prepare("SELECT 1 AS found FROM recipes WHERE id = ?").bind(id).first()) id = `${base}-${n++}`;
  return id;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function storageOff() {
  return json({ error: "Films are not ready to save yet. Pictures can be uploaded." }, 503);
}

async function storePicture(request, env, field) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return { error: json({ error: "That picture could not be read. Try a smaller photo." }, 400) };
  }
  const file = form.get(field);
  if (!file || typeof file === "string") return { error: json({ error: "Choose a picture first." }, 400) };
  const type = file.type || "";
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) {
    return { error: json({ error: "Use a JPEG, PNG, or WebP image." }, 400) };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.byteLength) return { error: json({ error: "That picture was empty." }, 400) };
  if (bytes.byteLength > 1_500_000) return { error: json({ error: "That picture is too large. Try a smaller one." }, 400) };
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : "jpg";
  const path = `/uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.DB.prepare("INSERT INTO files (path, mime, bytes) VALUES (?, ?, ?)").bind(path, type, bytes).run();
  return { path, form };
}

async function removeStored(env, path) {
  if (!path?.startsWith("/uploads/")) return;
  await env.DB.prepare("DELETE FROM files WHERE path = ?").bind(path).run();
}

async function uploadAvatar(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const saved = await storePicture(request, env, "avatar");
  if (saved.error) return saved.error;
  await removeStored(env, user.avatar_path);
  await env.DB.prepare("UPDATE users SET avatar_path = ? WHERE id = ?").bind(saved.path, user.id).run();
  const next = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
  return json({ user: publicUser(next) });
}

async function uploadMedia(request, env, recipeId, url) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const recipe = await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(recipeId).first();
  if (!recipe) return json({ error: "That recipe is not in the book." }, 404);
  if (url.searchParams.get("kind") === "video") return storageOff();
  const saved = await storePicture(request, env, "file");
  if (saved.error) return saved.error;
  if (url.searchParams.get("role") === "cover") {
    await removeStored(env, recipe.image);
    await env.DB.prepare("UPDATE recipes SET image = ?, image_credit = ?, updated_at = ? WHERE id = ?")
      .bind(saved.path, "Added by Lisa", new Date().toISOString(), recipe.id).run();
  } else {
    const caption = String(saved.form.get("caption") || "").slice(0, 160);
    await env.DB.prepare(
      "INSERT INTO recipe_media (recipe_id, kind, path, caption, created_at) VALUES (?, 'image', ?, ?, ?)"
    ).bind(recipe.id, saved.path, caption, new Date().toISOString()).run();
  }
  return json({ recipe: await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(recipe.id).first()) }, 201);
}

export async function handle(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return json({ error: "That page is not in the book." }, 404);
  try {
    return await route(request, env, url, parts.slice(1));
  } catch (error) {
    const status = error.status || 500;
    return json({
      error: status === 500 ? "The book hit a snag. Please try again." : error.message
    }, status);
  }
}

async function route(request, env, url, parts) {
  const method = request.method;
  const [first, second, third, fourth] = parts;

  if (method === "GET" && first === "health") return json({ ok: true, name: "Lisa's Recipe Book" });

  if (first === "auth" && second === "register" && method === "POST") return register(request, env);
  if (first === "auth" && second === "login" && method === "POST") return login(request, env);
  if (first === "auth" && second === "me" && method === "GET") return json({ user: publicUser(await userFrom(env, request)) });
  if (first === "auth" && second === "me" && method === "PATCH") return updateProfile(request, env);
  if (first === "auth" && second === "avatar" && method === "POST") return uploadAvatar(request, env);

  if (first === "recipes" && !second && method === "GET") return listRecipes(url, env);
  if (first === "recipes" && second && !third && method === "GET") return oneRecipe(env, second);
  if (first === "recipes" && !second && method === "POST") return createRecipe(request, env);
  if (first === "recipes" && second && !third && method === "PATCH") return updateRecipe(request, env, second);
  if (first === "recipes" && second && !third && method === "DELETE") return deleteRecipe(request, env, second);
  if (first === "recipes" && third === "media" && method === "POST") return uploadMedia(request, env, second, url);
  if (first === "recipes" && third === "media" && fourth && method === "DELETE") return deleteMedia(request, env, second, fourth);

  if (first === "notes" && !second && method === "GET") return listNotes(request, env);
  if (first === "notes" && !second && method === "POST") return createNote(request, env);
  if (first === "notes" && second && method === "PATCH") return updateNote(request, env, second);
  if (first === "notes" && second && method === "DELETE") return deleteNote(request, env, second);

  if (first === "library" && !second && method === "GET") return listLibrary(request, env);
  if (first === "library" && !second && method === "POST") return createLibrary(request, env);
  if (first === "library" && second && method === "PATCH") return updateLibrary(request, env, second);
  if (first === "library" && second && method === "DELETE") return deleteLibrary(request, env, second);

  if (first === "world" && !second && method === "GET") return worldList(url);
  if (first === "world" && second && !third && method === "GET") return worldOne(second);
  if (first === "world" && third === "keep" && method === "POST") return worldKeep(request, env, second);

  if (first === "browse" && method === "GET") return openBrowse(url);

  return json({ error: "That page is not in the book." }, 404);
}

async function register(request, env) {
  const body = await readJson(request);
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (name.length < 2) return json({ error: "Add the name you want on the book." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "That email does not look right." }, 400);
  if (password.length < 8) return json({ error: "Use a password of at least 8 characters." }, 400);
  try {
    const result = await env.DB.prepare(`
      INSERT INTO users (email, password_hash, name, bio, avatar_path, created_at)
      VALUES (?, ?, ?, '', '', ?)
    `).bind(email, await hashPassword(env, password), name, new Date().toISOString()).run();
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(result.meta.last_row_id).first();
    return json({ token: await signToken(env, user.id), user: publicUser(user) }, 201);
  } catch (error) {
    if (String(error.message || error).includes("UNIQUE")) return json({ error: "That email already has a profile." }, 409);
    throw error;
  }
}

async function login(request, env) {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user || !(await checkPassword(env, password, user.password_hash))) {
    return json({ error: "That email and password do not match." }, 401);
  }
  return json({ token: await signToken(env, user.id), user: publicUser(user) });
}

async function updateProfile(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const body = await readJson(request);
  const name = String(body.name ?? user.name).trim();
  const bio = String(body.bio ?? user.bio).slice(0, 500);
  let avatar = user.avatar_path;
  if (typeof body.avatarUrl === "string" && body.avatarUrl.trim()) {
    const next = body.avatarUrl.trim();
    if (!/^https?:\/\//.test(next)) return json({ error: "An avatar link needs to start with http." }, 400);
    avatar = next;
  }
  if (name.length < 2) return json({ error: "Keep a name on the profile." }, 400);
  await env.DB.prepare("UPDATE users SET name = ?, bio = ?, avatar_path = ? WHERE id = ?").bind(name, bio, avatar, user.id).run();
  const saved = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first();
  return json({ user: publicUser(saved) });
}

async function listRecipes(url, env) {
  const cuisine = String(url.searchParams.get("cuisine") || "");
  const q = String(url.searchParams.get("q") || "").trim();
  const rows = await env.DB.prepare(`
    SELECT * FROM recipes
    WHERE (? = '' OR cuisine = ?)
      AND (? = '' OR title LIKE ? OR summary LIKE ?)
    ORDER BY family DESC, title COLLATE NOCASE
  `).bind(cuisine, cuisine, q, `%${q}%`, `%${q}%`).all();
  const recipes = [];
  for (const row of rows.results || []) recipes.push(await recipeRow(env, row));
  return json({ recipes });
}

async function oneRecipe(env, id) {
  const recipe = await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first());
  if (!recipe) return json({ error: "That recipe is not in the book." }, 404);
  return json({ recipe });
}

async function createRecipe(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const body = await readJson(request);
  const title = String(body.title || "").trim();
  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : lines(body.ingredients);
  const steps = Array.isArray(body.steps) ? body.steps : lines(body.steps);
  if (title.length < 2 || !ingredients.length || !steps.length) {
    return json({ error: "A recipe needs a title, ingredients, and steps." }, 400);
  }
  const now = new Date().toISOString();
  const id = await slugify(env, title);
  await env.DB.prepare(`
    INSERT INTO recipes (
      id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
      ingredients, steps, notes, image, image_credit, source_url, source_title, family,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, 0, ?, ?)
  `).bind(
    id,
    title,
    cuisineOf(body.cuisine),
    String(body.category || "Mains").slice(0, 40),
    String(body.summary || "").slice(0, 600),
    String(body.yieldText || "A family plate").slice(0, 80),
    Number(body.prepMinutes) || 0,
    Number(body.cookMinutes) || 0,
    JSON.stringify(ingredients.map(String)),
    JSON.stringify(steps.map(String)),
    String(body.notes || "").slice(0, 2000),
    String(body.sourceUrl || "").slice(0, 500),
    String(body.sourceTitle || "").slice(0, 160),
    now,
    now
  ).run();
  return json({ recipe: await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first()) }, 201);
}

async function updateRecipe(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const existing = await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "That recipe is not in the book." }, 404);
  const body = await readJson(request);
  const ingredients = body.ingredients != null
    ? (Array.isArray(body.ingredients) ? body.ingredients : lines(body.ingredients))
    : JSON.parse(existing.ingredients);
  const steps = body.steps != null
    ? (Array.isArray(body.steps) ? body.steps : lines(body.steps))
    : JSON.parse(existing.steps);
  const title = String(body.title ?? existing.title).trim();
  if (title.length < 2 || !ingredients.length || !steps.length) {
    return json({ error: "Keep a title, ingredients, and steps." }, 400);
  }
  await env.DB.prepare(`
    UPDATE recipes SET title=?, cuisine=?, category=?, summary=?, yield_text=?, prep_minutes=?,
      cook_minutes=?, ingredients=?, steps=?, notes=?, source_url=?, source_title=?, updated_at=?
    WHERE id=?
  `).bind(
    title,
    cuisineOf(body.cuisine ?? existing.cuisine),
    String(body.category ?? existing.category).slice(0, 40),
    String(body.summary ?? existing.summary).slice(0, 600),
    String(body.yieldText ?? existing.yield_text).slice(0, 80),
    Number(body.prepMinutes ?? existing.prep_minutes) || 0,
    Number(body.cookMinutes ?? existing.cook_minutes) || 0,
    JSON.stringify(ingredients.map(String)),
    JSON.stringify(steps.map(String)),
    String(body.notes ?? existing.notes).slice(0, 2000),
    String(body.sourceUrl ?? existing.source_url).slice(0, 500),
    String(body.sourceTitle ?? existing.source_title).slice(0, 160),
    new Date().toISOString(),
    existing.id
  ).run();
  return json({ recipe: await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(existing.id).first()) });
}

async function deleteRecipe(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const existing = await env.DB.prepare("SELECT id FROM recipes WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "That recipe is not in the book." }, 404);
  await env.DB.prepare("DELETE FROM recipe_media WHERE recipe_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM recipes WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

async function deleteMedia(request, env, recipeId, mediaId) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const media = await env.DB.prepare("SELECT id, path FROM recipe_media WHERE id = ? AND recipe_id = ?").bind(mediaId, recipeId).first();
  if (!media) return json({ error: "That picture is already gone." }, 404);
  await removeStored(env, media.path);
  await env.DB.prepare("DELETE FROM recipe_media WHERE id = ?").bind(media.id).run();
  return json({ recipe: await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(recipeId).first()) });
}

function publicNote(row) {
  let attachments = [];
  try {
    attachments = JSON.parse(row.attachments || "[]");
  } catch { /* an old note has no files */ }
  if (!Array.isArray(attachments)) attachments = [];
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    attachments,
    updatedAt: row.updatedAt || row.updated_at
  };
}

function noteTitle(text, attachments) {
  const line = text.trim().split(/\n/)[0].slice(0, 80);
  if (line) return line;
  if (attachments.some((item) => item.kind === "video")) return "Video";
  if (attachments.some((item) => item.kind === "file")) return "File";
  return "Photo";
}

async function storeUpload(env, file) {
  const type = String(file.type || "").split(";")[0].trim().toLowerCase();
  const kind = type.startsWith("image/") ? "image" : type.startsWith("video/") ? "video" : "file";
  const allowed = kind === "image"
    ? /^image\/(jpeg|png|webp|gif)$/
    : kind === "video"
      ? /^video\/(mp4|webm|quicktime)$/
      : /^(application\/pdf|text\/plain)$/;
  if (!allowed.test(type)) {
    const message = kind === "image"
      ? "Use a JPEG, PNG, or WebP picture."
      : kind === "video"
        ? "Use an MP4 or WebM video."
        : "Use a PDF or a text file.";
    return { error: json({ error: message }, 400) };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.byteLength) return { error: json({ error: "That file was empty." }, 400) };
  const limit = 1_500_000;
  if (bytes.byteLength > limit) {
    const message = kind === "video"
      ? "That video is too big to keep. Try a short clip."
      : "That file is too large.";
    return { error: json({ error: message }, 400) };
  }
  const ext = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "text/plain": "txt"
  }[type] || "bin";
  const path = `/uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  await env.DB.prepare("INSERT INTO files (path, mime, bytes) VALUES (?, ?, ?)").bind(path, type, bytes).run();
  const name = String(file.name || "File").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "File";
  return { meta: { path, mime: type, name, kind } };
}

async function listNotes(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const notes = await env.DB.prepare(
    "SELECT id, title, body, attachments, updated_at AS updatedAt FROM notes WHERE user_id = ? ORDER BY updated_at DESC"
  ).bind(user.id).all();
  return json({ notes: (notes.results || []).map(publicNote) });
}

async function createNote(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const type = request.headers.get("content-type") || "";
  let text = "";
  const attachments = [];
  if (type.includes("multipart/form-data")) {
    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "That note could not be read. Try a smaller file." }, 400);
    }
    text = String(form.get("body") || "").slice(0, 20000);
    const files = form.getAll("file").filter((file) => file && typeof file !== "string" && file.size);
    if (!text.trim() && !files.length) return json({ error: "Write a note, or add a picture." }, 400);
    if (files.length > 6) return json({ error: "Six files is the limit for one note." }, 400);
    for (const file of files) {
      const saved = await storeUpload(env, file);
      if (saved.error) return saved.error;
      attachments.push(saved.meta);
    }
  } else {
    const body = await readJson(request);
    text = String(body.body || "").slice(0, 20000);
    if (!text.trim()) return json({ error: "Write a note first." }, 400);
  }
  const title = noteTitle(text, attachments);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "INSERT INTO notes (user_id, title, body, attachments, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(user.id, title, text, JSON.stringify(attachments), now).run();
  return json({ note: { id: result.meta.last_row_id, title, body: text, attachments, updatedAt: now } }, 201);
}

async function updateNote(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const note = await env.DB.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!note) return json({ error: "That note is not yours." }, 404);
  const body = await readJson(request);
  const title = String(body.title ?? note.title).trim().slice(0, 120) || "Untitled note";
  const text = String(body.body ?? note.body).slice(0, 20000);
  const updatedAt = new Date().toISOString();
  await env.DB.prepare("UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?").bind(title, text, updatedAt, note.id).run();
  return json({ note: { id: note.id, title, body: text, updatedAt } });
}

async function deleteNote(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const note = await env.DB.prepare("SELECT attachments FROM notes WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!note) return json({ error: "That note is already gone." }, 404);
  let attachments = [];
  try { attachments = JSON.parse(note.attachments || "[]"); } catch { /* nothing to remove */ }
  if (Array.isArray(attachments)) {
    for (const file of attachments) await removeStored(env, file?.path);
  }
  await env.DB.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  return json({ ok: true });
}

async function listLibrary(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const items = await env.DB.prepare(`
    SELECT id, kind, title, url, description, notes, file_path AS filePath, created_at AS createdAt
    FROM library_items WHERE user_id = ? ORDER BY created_at DESC
  `).bind(user.id).all();
  return json({ items: items.results || [] });
}

async function createLibrary(request, env) {
  const type = request.headers.get("content-type") || "";
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (type.includes("multipart/form-data")) return saveFilm(env, user, request);
  const body = await readJson(request);
  const kind = body.kind;
  const title = String(body.title || "").trim().slice(0, 160);
  const link = String(body.url || "").trim();
  if (!kind) return json({ error: "Choose YouTube, TikTok, Facebook, or a film of your own." }, 400);
  if (!title) return json({ error: "Give it a title." }, 400);
  if (kind === "film") return storageOff();
  if (!/^https?:\/\//.test(link)) return json({ error: "Paste the full link, starting with http." }, 400);
  const now = new Date().toISOString();
  const description = String(body.description || "").slice(0, 5000);
  const notes = String(body.notes || "").slice(0, 2000);
  const result = await env.DB.prepare(`
    INSERT INTO library_items (user_id, kind, title, url, description, notes, file_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, '', ?)
  `).bind(user.id, kind, title, link, description, notes, now).run();
  return json({
    item: { id: result.meta.last_row_id, kind, title, url: link, description, notes, filePath: "", createdAt: now }
  }, 201);
}

async function saveFilm(env, user, request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "That film could not be read. Try a shorter take." }, 400);
  }
  const title = String(form.get("title") || "").trim().slice(0, 160);
  if (!title) return json({ error: "Give the film a title." }, 400);
  const file = form.get("file");
  if (!file || typeof file === "string" || !file.size) return json({ error: "Record a take or choose a video first." }, 400);
  const saved = await storeUpload(env, file);
  if (saved.error) return saved.error;
  const description = String(form.get("description") || "").slice(0, 5000);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    INSERT INTO library_items (user_id, kind, title, url, description, notes, file_path, created_at)
    VALUES (?, 'film', ?, '', ?, '', ?, ?)
  `).bind(user.id, title, description, saved.meta.path, now).run();
  return json({
    item: { id: result.meta.last_row_id, kind: "film", title, url: "", description, notes: "", filePath: saved.meta.path, createdAt: now }
  }, 201);
}

async function updateLibrary(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const item = await env.DB.prepare("SELECT * FROM library_items WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!item) return json({ error: "That one is not yours." }, 404);
  const body = await readJson(request);
  const title = String(body.title ?? item.title).trim().slice(0, 160);
  if (!title) return json({ error: "Give it a title." }, 400);
  const link = String(body.url ?? item.url).trim();
  if (item.kind !== "film" && !/^https?:\/\//.test(link)) return json({ error: "Paste the full link, starting with http." }, 400);
  const description = String(body.description ?? item.description).slice(0, 5000);
  const notes = String(body.notes ?? item.notes).slice(0, 2000);
  await env.DB.prepare(
    "UPDATE library_items SET title = ?, url = ?, description = ?, notes = ? WHERE id = ?"
  ).bind(title, item.kind === "film" ? item.url : link, description, notes, item.id).run();
  return json({
    item: { id: item.id, kind: item.kind, title, url: item.kind === "film" ? item.url : link, description, notes, filePath: item.file_path, createdAt: item.created_at }
  });
}

async function deleteLibrary(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const item = await env.DB.prepare("SELECT file_path FROM library_items WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!item) return json({ error: "That one is already gone." }, 404);
  await removeStored(env, item.file_path);
  await env.DB.prepare("DELETE FROM library_items WHERE id = ? AND user_id = ?").bind(id, user.id).run();
  return json({ ok: true });
}

async function worldList(url) {
  try {
    return json(await worldCatalog({ q: url.searchParams.get("q") || "", category: url.searchParams.get("category") || "" }));
  } catch (error) {
    return json({ error: error.message || "The recipe library could not be reached." }, error.status || 502);
  }
}

async function worldOne(id) {
  try {
    return json({ recipe: await worldRecipe(id) });
  } catch (error) {
    return json({ error: error.message || "The recipe library could not be reached." }, error.status || 502);
  }
}

async function worldKeep(request, env, mealId) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  try {
    const recipe = await worldRecipe(mealId);
    const existing = await env.DB.prepare("SELECT id FROM recipes WHERE source_url = ?").bind(recipe.sourceUrl).first();
    if (existing) {
      return json({ recipe: await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(existing.id).first()) });
    }
    const now = new Date().toISOString();
    const id = await slugify(env, recipe.title);
    await env.DB.prepare(`
      INSERT INTO recipes (
        id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
        ingredients, steps, notes, image, image_credit, source_url, source_title, family,
        created_at, updated_at
      ) VALUES (?, ?, 'library', ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      id, recipe.title, recipe.category, recipe.summary, recipe.yieldText,
      JSON.stringify(recipe.ingredients), JSON.stringify(recipe.steps), recipe.notes,
      recipe.image, recipe.imageCredit, recipe.sourceUrl, recipe.sourceTitle, now, now
    ).run();
    return json({ recipe: await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first()) }, 201);
  } catch (error) {
    return json({ error: error.message || "That plate could not be kept." }, error.status || 502);
  }
}

async function openBrowse(url) {
  try {
    return json(await browse(String(url.searchParams.get("url") || "")));
  } catch (error) {
    return json({ error: error.status ? error.message : "That page could not be opened." }, error.status || 500);
  }
}
