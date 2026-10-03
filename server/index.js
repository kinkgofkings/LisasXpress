import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, seedIfEmpty, recipeRow } from "./db.js";
import { browse, watchClip } from "./browse.js";
import { worldCatalog, worldRecipe } from "./world.js";
import { findCover } from "./cover.js";
import { hashPassword, checkPassword, signToken, readToken, publicUser } from "./auth.js";
import {
  addSignal, askHost, deskSnapshot, ensureDesk, getCall, listSignals, listThreads,
  placeCall, readThread, searchBook, sendMessage, setCall, sqliteDesk
} from "./desk.js";

const deskDb = sqliteDesk(db);
await ensureDesk(deskDb);

const app = express();
const root = path.resolve("public");
const uploadDir = path.join(root, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
seedIfEmpty();

function allowOrigin(origin) {
  if (!origin) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.pages\.dev$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) return true;
  return false;
}

app.use(cors({
  origin(origin, callback) {
    callback(null, allowOrigin(origin));
  }
}));
app.use(express.json({ limit: "1mb" }));

function userFrom(req) {
  const payload = readToken(req.get("authorization") || "");
  if (!payload) return null;
  return db.prepare("SELECT * FROM users WHERE id = ?").get(payload.id) || null;
}

function requireUser(req, res) {
  const user = userFrom(req);
  if (!user) {
    res.status(401).json({ error: "Sign in first." });
    return null;
  }
  return user;
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase().slice(0, 8);
    const safe = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov", ".pdf", ".txt"].includes(ext) ? ext : "";
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${safe}`);
  }
});

function fileFilter(kind) {
  return (_req, file, cb) => {
    const ok = kind === "video"
      ? /^video\/(mp4|webm|quicktime)$/.test(file.mimetype)
      : /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error(kind === "video" ? "Use an MP4 or WebM video." : "Use a JPEG, PNG, or WebP image."), ok);
  };
}

const imageUpload = multer({ storage, fileFilter: fileFilter("image") });
const videoUpload = multer({ storage, fileFilter: fileFilter("video") });
const noteUpload = multer({
  storage,
  fileFilter(_req, file, cb) {
    cb(null, true);
  }
});

function removeUpload(filePath) {
  if (!filePath?.startsWith("/uploads/")) return;
  const full = path.join(root, filePath);
  if (full.startsWith(uploadDir)) fs.rmSync(full, { force: true });
}

function publicNote(row) {
  let attachments = [];
  try { attachments = JSON.parse(row.attachments || "[]"); } catch { /* an old note has no files */ }
  if (!Array.isArray(attachments)) attachments = [];
  return { id: row.id, title: row.title, body: row.body, attachments, updatedAt: row.updatedAt };
}

function slugify(title) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "recipe";
  let id = base;
  let n = 2;
  while (db.prepare("SELECT 1 FROM recipes WHERE id = ?").get(id)) id = `${base}-${n++}`;
  return id;
}

function lines(value) {
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

function cuisineOf(value) {
  if (["cajun", "library", "texmex", "garden", "kids", "pets"].includes(value)) return value;
  return "texas";
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Lisa's Recipe Book" });
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (name.length < 2) return res.status(400).json({ error: "Add the name you want on the book." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "That email does not look right." });
  if (password.length < 8) return res.status(400).json({ error: "Use a password of at least 8 characters." });
  try {
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, name, bio, avatar_path, created_at)
      VALUES (?, ?, ?, '', '', ?)
    `).run(email, hashPassword(password), name, new Date().toISOString());
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
  } catch {
    res.status(409).json({ error: "That email already has a profile." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !checkPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "That email and password do not match." });
  }
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: publicUser(userFrom(req)) });
});

app.patch("/api/auth/me", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const name = String(req.body.name ?? user.name).trim();
  const bio = String(req.body.bio ?? user.bio).slice(0, 500);
  let avatar = user.avatar_path;
  if (typeof req.body.avatarUrl === "string") {
    const next = req.body.avatarUrl.trim();
    if (next && !/^https?:\/\//.test(next)) return res.status(400).json({ error: "An avatar link needs to start with http." });
    if (avatar.startsWith("/uploads/") && next !== avatar) removeUpload(avatar);
    avatar = next;
  }
  if (name.length < 2) return res.status(400).json({ error: "Keep a name on the profile." });
  db.prepare("UPDATE users SET name = ?, bio = ?, avatar_path = ? WHERE id = ?").run(name, bio, avatar, user.id);
  res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
});

app.post("/api/auth/avatar", imageUpload.single("avatar"), (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  if (!req.file) return res.status(400).json({ error: "Choose a picture first." });
  if (user.avatar_path.startsWith("/uploads/")) removeUpload(user.avatar_path);
  const avatar = `/uploads/${req.file.filename}`;
  db.prepare("UPDATE users SET avatar_path = ? WHERE id = ?").run(avatar, user.id);
  res.json({ user: publicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(user.id)) });
});

function emptySocial() {
  return { likes: 0, stars: 0, liked: false, starred: false, comments: [] };
}

function attachSocial(user, type, rows, idOf) {
  const ids = [...new Set(rows.map((row) => String(idOf(row))).filter(Boolean))];
  const map = {};
  for (const id of ids) map[id] = emptySocial();
  if (ids.length) {
    const marks = ids.map(() => "?").join(",");
    const counts = db.prepare(
      `SELECT target_id AS targetId, kind, COUNT(*) AS n FROM reactions WHERE target_type = ? AND target_id IN (${marks}) GROUP BY target_id, kind`
    ).all(type, ...ids);
    for (const row of counts) {
      const box = map[String(row.targetId)];
      if (!box) continue;
      if (row.kind === "like") box.likes = Number(row.n) || 0;
      if (row.kind === "star") box.stars = Number(row.n) || 0;
    }
    if (user) {
      const mine = db.prepare(
        `SELECT target_id AS targetId, kind FROM reactions WHERE user_id = ? AND target_type = ? AND target_id IN (${marks})`
      ).all(user.id, type, ...ids);
      for (const row of mine) {
        const box = map[String(row.targetId)];
        if (!box) continue;
        if (row.kind === "like") box.liked = true;
        if (row.kind === "star") box.starred = true;
      }
    }
    const comments = db.prepare(`
      SELECT comments.id, comments.body, comments.created_at AS createdAt, comments.target_id AS targetId,
             users.id AS userId, users.name AS name, users.avatar_path AS avatar
      FROM comments JOIN users ON users.id = comments.user_id
      WHERE comments.target_type = ? AND comments.target_id IN (${marks})
      ORDER BY comments.id ASC
    `).all(type, ...ids);
    for (const row of comments) {
      map[String(row.targetId)]?.comments.push({
        id: row.id,
        body: row.body,
        createdAt: row.createdAt,
        author: { id: row.userId, name: row.name, avatar: row.avatar || "" }
      });
    }
  }
  return rows.map((row) => ({ ...row, social: map[String(idOf(row))] || emptySocial() }));
}

app.get("/api/recipes", (req, res) => {
  const cuisine = String(req.query.cuisine || "");
  const q = String(req.query.q || "").trim();
  const rows = db.prepare(`
    SELECT * FROM recipes
    WHERE (? = '' OR cuisine = ?)
      AND (? = '' OR title LIKE ? OR summary LIKE ?)
    ORDER BY family DESC, title COLLATE NOCASE
  `).all(cuisine, cuisine, q, `%${q}%`, `%${q}%`);
  res.json({ recipes: attachSocial(userFrom(req), "recipe", rows.map(recipeRow), (item) => item.id) });
});

app.get("/api/recipes/:id", (req, res) => {
  const recipe = recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id));
  if (!recipe) return res.status(404).json({ error: "That recipe is not in the book." });
  res.json({ recipe });
});

app.post("/api/recipes", async (req, res) => {
  if (!requireUser(req, res)) return;
  const title = String(req.body.title || "").trim();
  const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : lines(req.body.ingredients);
  const steps = Array.isArray(req.body.steps) ? req.body.steps : lines(req.body.steps);
  if (title.length < 2 || !ingredients.length || !steps.length) {
    return res.status(400).json({ error: "A recipe needs a title, ingredients, and steps." });
  }
  let image = String(req.body.image || "").trim();
  let imageCredit = String(req.body.imageCredit || "").trim();
  if (!image) {
    image = await findCover(title);
    if (image) imageCredit = "Wikimedia Commons";
  }
  if (!image) return res.status(400).json({ error: "Add a picture of this plate before saving it." });
  const now = new Date().toISOString();
  const id = slugify(title);
  db.prepare(`
    INSERT INTO recipes (
      id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
      ingredients, steps, notes, image, image_credit, source_url, source_title, family,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    id,
    title,
    cuisineOf(req.body.cuisine),
    String(req.body.category || "Mains").slice(0, 40),
    String(req.body.summary || "").slice(0, 600),
    String(req.body.yieldText || "A family plate").slice(0, 80),
    Number(req.body.prepMinutes) || 0,
    Number(req.body.cookMinutes) || 0,
    JSON.stringify(ingredients.map(String)),
    JSON.stringify(steps.map(String)),
    String(req.body.notes || "").slice(0, 2000),
    image,
    imageCredit,
    String(req.body.sourceUrl || "").slice(0, 500),
    String(req.body.sourceTitle || "").slice(0, 160),
    now,
    now
  );
  res.status(201).json({ recipe: recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(id)) });
});

app.patch("/api/recipes/:id", (req, res) => {
  if (!requireUser(req, res)) return;
  const existing = db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "That recipe is not in the book." });
  const ingredients = req.body.ingredients != null
    ? (Array.isArray(req.body.ingredients) ? req.body.ingredients : lines(req.body.ingredients))
    : JSON.parse(existing.ingredients);
  const steps = req.body.steps != null
    ? (Array.isArray(req.body.steps) ? req.body.steps : lines(req.body.steps))
    : JSON.parse(existing.steps);
  const title = String(req.body.title ?? existing.title).trim();
  if (title.length < 2 || !ingredients.length || !steps.length) {
    return res.status(400).json({ error: "Keep a title, ingredients, and steps." });
  }
  db.prepare(`
    UPDATE recipes SET title=?, cuisine=?, category=?, summary=?, yield_text=?, prep_minutes=?,
      cook_minutes=?, ingredients=?, steps=?, notes=?, source_url=?, source_title=?, updated_at=?
    WHERE id=?
  `).run(
    title,
    cuisineOf(req.body.cuisine ?? existing.cuisine),
    String(req.body.category ?? existing.category).slice(0, 40),
    String(req.body.summary ?? existing.summary).slice(0, 600),
    String(req.body.yieldText ?? existing.yield_text).slice(0, 80),
    Number(req.body.prepMinutes ?? existing.prep_minutes) || 0,
    Number(req.body.cookMinutes ?? existing.cook_minutes) || 0,
    JSON.stringify(ingredients.map(String)),
    JSON.stringify(steps.map(String)),
    String(req.body.notes ?? existing.notes).slice(0, 2000),
    String(req.body.sourceUrl ?? existing.source_url).slice(0, 500),
    String(req.body.sourceTitle ?? existing.source_title).slice(0, 160),
    new Date().toISOString(),
    existing.id
  );
  res.json({ recipe: recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(existing.id)) });
});

app.delete("/api/recipes/:id", (req, res) => {
  if (!requireUser(req, res)) return;
  const existing = db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "That recipe is not in the book." });
  removeUpload(existing.image);
  for (const media of db.prepare("SELECT path FROM recipe_media WHERE recipe_id = ?").all(existing.id)) removeUpload(media.path);
  db.prepare("DELETE FROM recipe_media WHERE recipe_id = ?").run(existing.id);
  db.prepare("DELETE FROM recipes WHERE id = ?").run(existing.id);
  res.json({ ok: true });
});

app.post("/api/recipes/:id/media", (req, res) => {
  const kind = req.query.kind === "video" ? "video" : "image";
  const upload = kind === "video" ? videoUpload : imageUpload;
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!requireUser(req, res)) return;
    const recipe = db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id);
    if (!recipe) return res.status(404).json({ error: "That recipe is not in the book." });
    if (!req.file) return res.status(400).json({ error: "Choose a file first." });
    const stored = `/uploads/${req.file.filename}`;
    if (kind === "image" && req.query.role === "cover") {
      if (recipe.image.startsWith("/uploads/")) removeUpload(recipe.image);
      db.prepare("UPDATE recipes SET image = ?, image_credit = ?, updated_at = ? WHERE id = ?")
        .run(stored, "Added by Lisa", new Date().toISOString(), recipe.id);
    } else {
      db.prepare("INSERT INTO recipe_media (recipe_id, kind, path, caption, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(recipe.id, kind, stored, String(req.body.caption || "").slice(0, 160), new Date().toISOString());
    }
    res.status(201).json({ recipe: recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(recipe.id)) });
  });
});

app.delete("/api/recipes/:id/media/:mediaId", (req, res) => {
  if (!requireUser(req, res)) return;
  const media = db.prepare("SELECT * FROM recipe_media WHERE id = ? AND recipe_id = ?").get(req.params.mediaId, req.params.id);
  if (!media) return res.status(404).json({ error: "That picture is already gone." });
  removeUpload(media.path);
  db.prepare("DELETE FROM recipe_media WHERE id = ?").run(media.id);
  res.json({ recipe: recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id)) });
});

app.get("/api/notes", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const notes = db.prepare("SELECT id, title, body, attachments, updated_at AS updatedAt FROM notes WHERE user_id = ? ORDER BY updated_at DESC").all(user.id);
  const rows = notes.map((row) => ({
    ...publicNote(row),
    author: { id: user.id, name: user.name, avatar: user.avatar_path || "" }
  }));
  res.json({ notes: attachSocial(user, "note", rows, (item) => item.id) });
});

app.post("/api/notes", (req, res) => {
  if ((req.get("content-type") || "").includes("application/json")) {
    const user = requireUser(req, res);
    if (!user) return;
    const text = String(req.body.body || "").slice(0, 20000);
    const listed = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    const attachments = listed.flatMap((item) => {
      const filePath = String(item?.path || "");
      if (!/^\/uploads\/[\w.-]+$/.test(filePath)) return [];
      const full = path.join(uploadDir, path.basename(filePath));
      if (!fs.existsSync(full)) return [];
      const mime = String(item.mime || "");
      const kind = mime.startsWith("video/") || item.kind === "video" ? "video" : mime.startsWith("image/") || item.kind === "image" ? "image" : "file";
      return [{
        path: filePath,
        mime,
        name: String(item.name || "File").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "File",
        kind
      }];
    });
    if (!text.trim() && !attachments.length) return res.status(400).json({ error: "Write a note, or add a picture." });
    const line = text.trim().split(/\n/)[0].slice(0, 80);
    const title = line || (attachments[0]?.kind === "video" ? "Video" : attachments[0]?.kind === "file" ? "File" : "Photo");
    const now = new Date().toISOString();
    const result = db.prepare("INSERT INTO notes (user_id, title, body, attachments, updated_at) VALUES (?, ?, ?, ?, ?)").run(user.id, title, text, JSON.stringify(attachments), now);
    return res.status(201).json({ note: { id: Number(result.lastInsertRowid), title, body: text, attachments, updatedAt: now } });
  }
  noteUpload.any()(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message || "That file could not be saved." });
    const user = requireUser(req, res);
    if (!user) return;
    const text = String(req.body.body || "").slice(0, 20000);
    const attachments = (req.files || []).map((file) => ({
      path: `/uploads/${file.filename}`,
      mime: file.mimetype,
      name: String(file.originalname || "File").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "File",
      kind: file.mimetype.startsWith("image/") ? "image" : file.mimetype.startsWith("video/") ? "video" : "file"
    }));
    if (!text.trim() && !attachments.length) return res.status(400).json({ error: "Write a note, or add a picture." });
    const line = text.trim().split(/\n/)[0].slice(0, 80);
    const title = line || (attachments[0]?.kind === "video" ? "Video" : attachments[0]?.kind === "file" ? "File" : "Photo");
    const now = new Date().toISOString();
    const result = db.prepare("INSERT INTO notes (user_id, title, body, attachments, updated_at) VALUES (?, ?, ?, ?, ?)").run(user.id, title, text, JSON.stringify(attachments), now);
    res.status(201).json({ note: { id: result.lastInsertRowid, title, body: text, attachments, updatedAt: now } });
  });
});

app.patch("/api/notes/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const note = db.prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?").get(req.params.id, user.id);
  if (!note) return res.status(404).json({ error: "That note is not yours." });
  const title = String(req.body.title ?? note.title).trim().slice(0, 120) || "Untitled note";
  const body = String(req.body.body ?? note.body).slice(0, 20000);
  const updatedAt = new Date().toISOString();
  db.prepare("UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ?").run(title, body, updatedAt, note.id);
  res.json({ note: { id: note.id, title, body, updatedAt } });
});

app.delete("/api/notes/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const note = db.prepare("SELECT attachments FROM notes WHERE id = ? AND user_id = ?").get(req.params.id, user.id);
  if (note?.attachments) {
    let files = [];
    try { files = JSON.parse(note.attachments); } catch { /* nothing to remove */ }
    if (Array.isArray(files)) files.forEach((file) => removeUpload(file?.path));
  }
  db.prepare("DELETE FROM notes WHERE id = ? AND user_id = ?").run(req.params.id, user.id);
  res.json({ ok: true });
});

app.get("/api/library", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const items = db.prepare(`
    SELECT id, kind, title, url, description, notes, file_path AS filePath, created_at AS createdAt
    FROM library_items WHERE user_id = ? AND kind NOT IN ('tiktok', 'facebook') ORDER BY created_at DESC
  `).all(user.id);
  res.json({ items: attachSocial(user, "film", items, (item) => item.id) });
});

app.post("/api/library", (req, res) => {
  if ((req.get("content-type") || "").includes("multipart/form-data")) {
    return videoUpload.single("file")(req, res, (err) => saveLibrary(req, res, err, "film"));
  }
  saveLibrary(req, res, null, req.body?.kind);
});

const FILM_PART = 800_000;

app.post("/api/media", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const name = String(req.body.name || "file").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "file";
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6) || ".bin";
  const stored = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const filePath = `/uploads/${stored}`;
  fs.writeFileSync(path.join(uploadDir, stored), Buffer.alloc(0));
  const suffix = String(name).split(".").pop()?.toLowerCase() || "";
  let mime = String(req.body.mime || "").split(";")[0].trim().toLowerCase();
  if (!mime || mime === "application/octet-stream") {
    mime = { mp4: "video/mp4", m4v: "video/mp4", webm: "video/webm", mov: "video/quicktime", qt: "video/quicktime", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" }[suffix] || "application/octet-stream";
  }
  const kind = mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : "file";
  res.status(201).json({ path: filePath, partSize: FILM_PART, mime, name, kind });
});

app.put("/api/media/parts", express.raw({ type: "*/*", limit: "2mb" }), (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const filePath = String(req.query.path || "");
  const idx = Number(req.query.idx);
  if (!/^\/uploads\/[\w.-]+$/.test(filePath) || !Number.isInteger(idx) || idx < 0) {
    return res.status(400).json({ error: "That file could not be saved." });
  }
  const full = path.join(uploadDir, path.basename(filePath));
  if (!full.startsWith(`${uploadDir}${path.sep}`) || !fs.existsSync(full)) {
    return res.status(404).json({ error: "That file could not be saved." });
  }
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!body.length) return res.status(400).json({ error: "That file could not be saved. Try again." });
  const fd = fs.openSync(full, "r+");
  try {
    fs.writeSync(fd, body, 0, body.length, idx * FILM_PART);
  } finally {
    fs.closeSync(fd);
  }
  res.json({ ok: true });
});

app.post("/api/films", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const title = String(req.body.title || "").trim().slice(0, 160);
  if (!title) return res.status(400).json({ error: "Give the film a title." });
  const mime = String(req.body.mime || "").split(";")[0].trim().toLowerCase();
  if (!/^video\/(mp4|webm|quicktime)$/.test(mime)) return res.status(400).json({ error: "Use an MP4 or WebM video." });
  const size = Number(req.body.size);
  if (!Number.isFinite(size) || size < 1) return res.status(400).json({ error: "That film was empty." });
  const ext = mime.includes("mp4") ? ".mp4" : mime.includes("quicktime") ? ".mov" : ".webm";
  const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  const filePath = `/uploads/${name}`;
  fs.writeFileSync(path.join(uploadDir, name), Buffer.alloc(0));
  const description = String(req.body.description || "").slice(0, 5000);
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO library_items (user_id, kind, title, url, description, notes, file_path, created_at)
    VALUES (?, 'film', ?, '', ?, '', ?, ?)
  `).run(user.id, title, description, filePath, now);
  res.status(201).json({ id: Number(result.lastInsertRowid), path: filePath, partSize: FILM_PART });
});

app.put("/api/films/parts", express.raw({ type: "*/*", limit: "2mb" }), (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const filePath = String(req.query.path || "");
  const idx = Number(req.query.idx);
  if (!/^\/uploads\/[\w.-]+$/.test(filePath) || !Number.isInteger(idx) || idx < 0) {
    return res.status(400).json({ error: "That film could not be saved." });
  }
  const owned = db.prepare("SELECT id FROM library_items WHERE file_path = ? AND user_id = ? AND kind = 'film'").get(filePath, user.id);
  if (!owned) return res.status(404).json({ error: "That film is not yours." });
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!body.length || body.length > 1_000_000) return res.status(400).json({ error: "That film could not be saved. Try again." });
  const full = path.join(uploadDir, path.basename(filePath));
  if (!full.startsWith(`${uploadDir}${path.sep}`)) return res.status(400).json({ error: "That film could not be saved." });
  const fd = fs.openSync(full, "r+");
  try {
    fs.writeSync(fd, body, 0, body.length, idx * FILM_PART);
  } finally {
    fs.closeSync(fd);
  }
  res.json({ ok: true });
});

function savedLinkKind(raw) {
  let url;
  try { url = new URL(String(raw || "").trim()); } catch { return ""; }
  if (!["http:", "https:"].includes(url.protocol)) return "";
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host.endsWith("tiktok.com") || host.endsWith("facebook.com") || host === "fb.watch" || host.endsWith("fb.com") || host.endsWith("instagram.com")) return "social";
  if (host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) return "youtube";
  if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(url.pathname)) return "hosted";
  return "";
}

function saveLibrary(req, res, err, kind) {
  if (err) return res.status(400).json({ error: err.message });
  const user = requireUser(req, res);
  if (!user) return;
  const title = String(req.body.title || "").trim().slice(0, 160);
  const url = String(req.body.url || "").trim();
  const linkKind = kind === "film" ? "film" : savedLinkKind(url);
  if (!title) return res.status(400).json({ error: "Give it a title." });
  if (linkKind === "film" && !req.file) return res.status(400).json({ error: "Choose a video file or record one." });
  if (linkKind === "social") return res.status(400).json({ error: "TikTok and Facebook stay out of the book. Use YouTube, or a video file you host." });
  if (linkKind !== "film" && linkKind !== "youtube" && linkKind !== "hosted") {
    return res.status(400).json({ error: "Paste a YouTube link, or a video file you host that ends in .mp4 or .webm." });
  }
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO library_items (user_id, kind, title, url, description, notes, file_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    linkKind,
    title,
    linkKind === "film" ? "" : url,
    String(req.body.description || "").slice(0, 5000),
    String(req.body.notes || "").slice(0, 2000),
    req.file ? `/uploads/${req.file.filename}` : "",
    now
  );
  res.status(201).json({
    item: {
      id: result.lastInsertRowid,
      kind: linkKind,
      title,
      url: linkKind === "film" ? "" : url,
      description: String(req.body.description || ""),
      notes: String(req.body.notes || ""),
      filePath: req.file ? `/uploads/${req.file.filename}` : "",
      createdAt: now
    }
  });
}

app.patch("/api/library/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const item = db.prepare("SELECT * FROM library_items WHERE id = ? AND user_id = ?").get(req.params.id, user.id);
  if (!item) return res.status(404).json({ error: "That one is not yours." });
  const title = String(req.body.title ?? item.title).trim().slice(0, 160);
  if (!title) return res.status(400).json({ error: "Give it a title." });
  const link = String(req.body.url ?? item.url).trim();
  let nextKind = item.kind;
  if (item.kind !== "film") {
    nextKind = savedLinkKind(link);
    if (nextKind === "social") return res.status(400).json({ error: "TikTok and Facebook stay out of the book. Use YouTube, or a video file you host." });
    if (nextKind !== "youtube" && nextKind !== "hosted") return res.status(400).json({ error: "Paste a YouTube link, or a video file you host that ends in .mp4 or .webm." });
  }
  const description = String(req.body.description ?? item.description).slice(0, 5000);
  const notes = String(req.body.notes ?? item.notes).slice(0, 2000);
  const url = item.kind === "film" ? item.url : link;
  db.prepare("UPDATE library_items SET kind = ?, title = ?, url = ?, description = ?, notes = ? WHERE id = ?").run(nextKind, title, url, description, notes, item.id);
  res.json({ item: { id: item.id, kind: nextKind, title, url, description, notes, filePath: item.file_path, createdAt: item.created_at } });
});

app.delete("/api/library/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const item = db.prepare("SELECT * FROM library_items WHERE id = ? AND user_id = ?").get(req.params.id, user.id);
  if (item) removeUpload(item.file_path);
  db.prepare("DELETE FROM library_items WHERE id = ? AND user_id = ?").run(req.params.id, user.id);
  res.json({ ok: true });
});

app.get("/api/world", async (req, res) => {
  try {
    res.json(await worldCatalog({ q: req.query.q, category: req.query.category }));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "The recipe library could not be reached." });
  }
});

app.get("/api/world/:id", async (req, res) => {
  try {
    res.json({ recipe: await worldRecipe(req.params.id) });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "The recipe library could not be reached." });
  }
});

app.post("/api/world/:id/keep", async (req, res) => {
  if (!requireUser(req, res)) return;
  try {
    const recipe = await worldRecipe(req.params.id);
    const existing = db.prepare("SELECT id FROM recipes WHERE source_url = ?").get(recipe.sourceUrl);
    if (existing) {
      return res.json({ recipe: recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(existing.id)) });
    }
    let image = recipe.image || "";
    let imageCredit = recipe.imageCredit || "";
    if (!image) {
      image = await findCover(recipe.title);
      if (image) imageCredit = "Wikimedia Commons";
    }
    if (!image) return res.status(400).json({ error: "That plate needs a picture before it can be kept." });
    const now = new Date().toISOString();
    const id = slugify(recipe.title);
    db.prepare(`
      INSERT INTO recipes (
        id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
        ingredients, steps, notes, image, image_credit, source_url, source_title, family,
        created_at, updated_at
      ) VALUES (?, ?, 'library', ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      recipe.title,
      recipe.category,
      recipe.summary,
      recipe.yieldText,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      recipe.notes,
      image,
      imageCredit,
      recipe.sourceUrl,
      recipe.sourceTitle,
      now,
      now
    );
    res.status(201).json({ recipe: recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(id)) });
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "That plate could not be kept." });
  }
});

app.get("/api/watch", async (req, res) => {
  try {
    res.json(await watchClip(String(req.query.url || "")));
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || "That video could not be opened." });
  }
});

function deskUser(req, res) {
  const user = userFrom(req);
  if (!user) {
    res.status(401).json({ error: "Log in first." });
    return null;
  }
  return user;
}

function deskSend(res, work) {
  return work.then((data) => res.json(data)).catch((error) => {
    res.status(error.status || 500).json({ error: error.status ? error.message : "That did not work. Please try again." });
  });
}

app.get("/api/desk", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  deskSend(res, deskSnapshot(deskDb, user.id));
});

app.get("/api/messages", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  if (req.query.with) deskSend(res, readThread(deskDb, user.id, req.query.with, req.query.after));
  else deskSend(res, listThreads(deskDb, user.id));
});

app.post("/api/messages", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  deskSend(res, sendMessage(deskDb, user.id, req.body || {}).then((message) => ({ message })));
});

app.post("/api/calls", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  deskSend(res, placeCall(deskDb, user.id, req.body || {}));
});

app.get("/api/calls/:id/signals", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  deskSend(res, listSignals(deskDb, user.id, req.params.id, req.query.after));
});

app.post("/api/calls/:id/signals", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  deskSend(res, addSignal(deskDb, user.id, req.params.id, req.body?.payload));
});

app.get("/api/calls/:id", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  deskSend(res, getCall(deskDb, user.id, req.params.id));
});

app.post("/api/calls/:id", (req, res) => {
  const user = deskUser(req, res);
  if (!user) return;
  deskSend(res, setCall(deskDb, user.id, req.params.id, req.body || {}));
});

app.get("/api/search", (req, res) => {
  const user = userFrom(req);
  deskSend(res, searchBook(deskDb, user?.id || null, req.query.q));
});

app.post("/api/ask", (req, res) => {
  const user = userFrom(req);
  deskSend(res, askHost(deskDb, user?.id || null, req.body?.question, null));
});

app.post("/api/reactions", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const type = String(req.body.targetType || "");
  const id = String(req.body.targetId || "");
  const kind = req.body.kind === "star" ? "star" : "like";
  if (!["recipe", "note", "film", "world"].includes(type) || !id) {
    return res.status(400).json({ error: "That could not be saved." });
  }
  const existing = db.prepare(
    "SELECT 1 AS found FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND kind = ?"
  ).get(user.id, type, id, kind);
  if (existing) {
    db.prepare("DELETE FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND kind = ?").run(user.id, type, id, kind);
  } else {
    db.prepare(
      "INSERT INTO reactions (user_id, target_type, target_id, kind, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(user.id, type, id, kind, new Date().toISOString());
  }
  const counts = db.prepare(
    "SELECT kind, COUNT(*) AS n FROM reactions WHERE target_type = ? AND target_id = ? GROUP BY kind"
  ).all(type, id);
  const snap = { likes: 0, stars: 0, liked: false, starred: false };
  for (const row of counts) {
    if (row.kind === "like") snap.likes = Number(row.n) || 0;
    if (row.kind === "star") snap.stars = Number(row.n) || 0;
  }
  const mine = db.prepare("SELECT kind FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ?").all(user.id, type, id);
  for (const row of mine) {
    if (row.kind === "like") snap.liked = true;
    if (row.kind === "star") snap.starred = true;
  }
  res.json({ on: kind === "star" ? snap.starred : snap.liked, ...snap });
});

app.post("/api/comments", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const type = String(req.body.targetType || "");
  const id = String(req.body.targetId || "");
  const text = String(req.body.body || "").trim().slice(0, 1000);
  if (!["recipe", "note", "film", "world"].includes(type) || !id) {
    return res.status(400).json({ error: "That comment could not be saved." });
  }
  if (!text) return res.status(400).json({ error: "Write a comment first." });
  const now = new Date().toISOString();
  const result = db.prepare(
    "INSERT INTO comments (user_id, target_type, target_id, body, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(user.id, type, id, text, now);
  res.status(201).json({
    comment: {
      id: Number(result.lastInsertRowid),
      body: text,
      createdAt: now,
      author: { id: user.id, name: user.name, avatar: user.avatar_path || "" }
    }
  });
});

app.delete("/api/comments/:id", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const comment = db.prepare("SELECT id FROM comments WHERE id = ? AND user_id = ?").get(req.params.id, user.id);
  if (!comment) return res.status(404).json({ error: "That comment is not yours." });
  db.prepare("DELETE FROM comments WHERE id = ?").run(comment.id);
  res.json({ ok: true });
});

app.get("/api/browse", async (req, res) => {
  try {
    res.json(await browse(String(req.query.url || "")));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : "That page could not be opened." });
  }
});

app.use(express.static(root));
app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(root, "index.html")));

app.use((err, _req, res, _next) => {
  if (err) return res.status(400).json({ error: err.message || "That file could not be saved." });
  res.status(500).json({ error: "The book hit a snag. Please try again." });
});

const port = Number(process.env.PORT) || 4173;
app.listen(port, "0.0.0.0", () => {
  console.log(`Lisa's Recipe Book is listening on ${port}`);
});
