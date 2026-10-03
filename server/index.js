import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { db, seedIfEmpty, recipeRow } from "./db.js";
import { browse } from "./browse.js";
import { worldCatalog, worldRecipe } from "./world.js";
import { hashPassword, checkPassword, signToken, readToken, publicUser } from "./auth.js";

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

const imageUpload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: fileFilter("image") });
const videoUpload = multer({ storage, limits: { fileSize: 80 * 1024 * 1024 }, fileFilter: fileFilter("video") });
const noteUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter(_req, file, cb) {
    const ok = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime)|application\/pdf|text\/plain)$/.test(file.mimetype);
    cb(ok ? null : new Error("Use a picture, a short video, a PDF, or a text file."), ok);
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
  if (value === "cajun" || value === "library") return value;
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

app.get("/api/recipes", (req, res) => {
  const cuisine = String(req.query.cuisine || "");
  const q = String(req.query.q || "").trim();
  const rows = db.prepare(`
    SELECT * FROM recipes
    WHERE (? = '' OR cuisine = ?)
      AND (? = '' OR title LIKE ? OR summary LIKE ?)
    ORDER BY family DESC, title COLLATE NOCASE
  `).all(cuisine, cuisine, q, `%${q}%`, `%${q}%`);
  res.json({ recipes: rows.map(recipeRow) });
});

app.get("/api/recipes/:id", (req, res) => {
  const recipe = recipeRow(db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id));
  if (!recipe) return res.status(404).json({ error: "That recipe is not in the book." });
  res.json({ recipe });
});

app.post("/api/recipes", (req, res) => {
  if (!requireUser(req, res)) return;
  const title = String(req.body.title || "").trim();
  const ingredients = Array.isArray(req.body.ingredients) ? req.body.ingredients : lines(req.body.ingredients);
  const steps = Array.isArray(req.body.steps) ? req.body.steps : lines(req.body.steps);
  if (title.length < 2 || !ingredients.length || !steps.length) {
    return res.status(400).json({ error: "A recipe needs a title, ingredients, and steps." });
  }
  const now = new Date().toISOString();
  const id = slugify(title);
  db.prepare(`
    INSERT INTO recipes (
      id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
      ingredients, steps, notes, image, image_credit, source_url, source_title, family,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, ?, 0, ?, ?)
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
  res.json({ notes: notes.map(publicNote) });
});

app.post("/api/notes", (req, res) => {
  noteUpload.array("file", 6)(req, res, (error) => {
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
    FROM library_items WHERE user_id = ? ORDER BY created_at DESC
  `).all(user.id);
  res.json({ items });
});

app.post("/api/library", (req, res) => {
  if ((req.get("content-type") || "").includes("multipart/form-data")) {
    return videoUpload.single("file")(req, res, (err) => saveLibrary(req, res, err, "film"));
  }
  saveLibrary(req, res, null, req.body?.kind);
});

function saveLibrary(req, res, err, kind) {
  if (err) return res.status(400).json({ error: err.message });
  const user = requireUser(req, res);
  if (!user) return;
  if (!kind) return res.status(400).json({ error: "Choose YouTube, TikTok, Facebook, or a film of your own." });
  const title = String(req.body.title || "").trim().slice(0, 160);
  const url = String(req.body.url || "").trim();
  if (!title) return res.status(400).json({ error: "Give it a title." });
  if (kind === "film" && !req.file) return res.status(400).json({ error: "Choose a video file or record one." });
  if (kind !== "film" && !/^https?:\/\//.test(url)) return res.status(400).json({ error: "Paste the full link, starting with http." });
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO library_items (user_id, kind, title, url, description, notes, file_path, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    kind,
    title,
    kind === "film" ? "" : url,
    String(req.body.description || "").slice(0, 5000),
    String(req.body.notes || "").slice(0, 2000),
    req.file ? `/uploads/${req.file.filename}` : "",
    now
  );
  res.status(201).json({
    item: {
      id: result.lastInsertRowid,
      kind,
      title,
      url: kind === "film" ? "" : url,
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
  if (item.kind !== "film" && !/^https?:\/\//.test(link)) return res.status(400).json({ error: "Paste the full link, starting with http." });
  const description = String(req.body.description ?? item.description).slice(0, 5000);
  const notes = String(req.body.notes ?? item.notes).slice(0, 2000);
  const url = item.kind === "film" ? item.url : link;
  db.prepare("UPDATE library_items SET title = ?, url = ?, description = ?, notes = ? WHERE id = ?").run(title, url, description, notes, item.id);
  res.json({ item: { id: item.id, kind: item.kind, title, url, description, notes, filePath: item.file_path, createdAt: item.created_at } });
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
      recipe.image,
      recipe.imageCredit,
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
