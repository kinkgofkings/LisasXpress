import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { RECIPES } from "./seed-data.js";

const bookRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
fs.mkdirSync(path.join(bookRoot, "data"), { recursive: true });
export const db = new DatabaseSync(path.join(bookRoot, "data/book.db"));
db.exec("PRAGMA journal_mode = DELETE");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar_path TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    cuisine TEXT NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    yield_text TEXT NOT NULL,
    prep_minutes INTEGER NOT NULL,
    cook_minutes INTEGER NOT NULL,
    ingredients TEXT NOT NULL,
    steps TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    image_credit TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    source_title TEXT NOT NULL DEFAULT '',
    youtube TEXT NOT NULL DEFAULT '',
    family INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipe_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    path TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    attachments TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS library_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    file_path TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    following_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (follower_id, following_id)
  );
  CREATE TABLE IF NOT EXISTS reactions (
    user_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, target_type, target_id, kind)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    body TEXT NOT NULL,
    attachments TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
`);

try {
  db.exec("ALTER TABLE notes ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'");
} catch { /* the column is already there */ }
try {
  db.exec("ALTER TABLE comments ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'");
} catch { /* the column is already there */ }
try {
  db.exec("ALTER TABLE recipes ADD COLUMN youtube TEXT NOT NULL DEFAULT ''");
} catch { /* the column is already there */ }

import { hashPassword } from "./auth.js";

export function seedIfEmpty() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO recipes (
      id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
      ingredients, steps, notes, image, image_credit, source_url, source_title, youtube, family,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  for (const recipe of RECIPES) {
    insert.run(
      recipe.id,
      recipe.title,
      recipe.cuisine,
      recipe.category,
      recipe.summary,
      recipe.yieldText,
      recipe.prepMinutes,
      recipe.cookMinutes,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      recipe.notes || "",
      recipe.image,
      recipe.imageCredit || "",
      recipe.sourceUrl || "",
      recipe.sourceTitle || "",
      recipe.youtube || "",
      recipe.family ? 1 : 0,
      now,
      now
    );
  }

  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (!userCount) {
    const pwHash = hashPassword("recipe123");
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, bio, avatar_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(3, "james@recipebook.family", pwHash, "James Coffman", "Keeping the family recipes, notes, and pictures in this book.", "", now);
  }

  // Ensure Lisa's Mom & Survivor account is always seeded
  const lisaUser = db.prepare("SELECT id FROM users WHERE email = 'lisa@lisasxpress.com' OR name LIKE 'Lisa%'").get();
  if (!lisaUser) {
    const lisaPw = hashPassword("password123");
    db.prepare(`
      INSERT INTO users (email, password_hash, name, bio, avatar_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      "lisa@lisasxpress.com",
      lisaPw,
      "Lisa (Mom & Survivor)",
      "Head Chef, Recipe Creator & Proud Breast Cancer Survivor 💕🎗️",
      "/ribbon.svg",
      now
    );
  }

  // Seed social notes/posts if empty
  const noteCount = db.prepare("SELECT COUNT(*) AS count FROM notes").get().count;
  if (!noteCount) {
    const james = db.prepare("SELECT id FROM users WHERE email = 'james@recipebook.family' OR name = 'James Coffman'").get();
    const seedNotes = [
      {
        userId: james?.id || 3,
        title: "Sunday Gumbo: The Heart of the Bayou",
        body: "Sunday Gumbo tradition. Dark mahogany roux simmered slow with andouille sausage, the holy trinity, and gulf shrimp. Never rush the roux. Stir slow with a wooden spoon and let the aroma tell you when it is ready.",
        attachments: [
          { path: "/images/gumbo.jpg", name: "gumbo.jpg", kind: "image" },
          { path: "/images/seafood-gumbo.jpg", name: "seafood-gumbo.jpg", kind: "image" }
        ]
      },
      {
        userId: james?.id || 3,
        title: "Oak-Smoked Texas Ribeye & Cast Iron Skillet Cornbread",
        body: "Oak-smoked Texas ribeye and cast iron skillet cornbread. Seared high and fast in hot bacon drippings with coarse pepper and flaky salt. Stoneground cornmeal for the cornbread.",
        attachments: [
          { path: "/images/texas-ribeye.jpg", name: "texas-ribeye.jpg", kind: "image" },
          { path: "/images/cornbread.jpg", name: "cornbread.jpg", kind: "image" }
        ]
      },
      {
        userId: james?.id || 3,
        title: "Boudin & Dirty Rice",
        body: "Cajun boudin and dirty rice, seasoned with green onions, chicken livers, and cayenne.",
        attachments: [
          { path: "/images/boudin.jpg", name: "boudin.jpg", kind: "image" },
          { path: "/images/dirty-rice.jpg", name: "dirty-rice.jpg", kind: "image" }
        ]
      }
    ];

    for (const note of seedNotes) {
      const res = db.prepare(`
        INSERT INTO notes (user_id, title, body, attachments, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(note.userId, note.title, note.body, JSON.stringify(note.attachments), now);
    }
  }
  retireDemoFamily();
}

function retireDemoFamily() {
  const james = db.prepare("SELECT id FROM users WHERE email = 'james@recipebook.family'").get()
    || db.prepare("SELECT id FROM users WHERE name = 'James Coffman'").get();
  const birthdayNotes = db.prepare("SELECT id FROM notes WHERE title LIKE '%irthday%' OR body LIKE '%irthday%'").all();
  for (const note of birthdayNotes) {
    db.prepare("DELETE FROM comments WHERE target_type = 'note' AND target_id = ?").run(String(note.id));
    db.prepare("DELETE FROM reactions WHERE target_type = 'note' AND target_id = ?").run(String(note.id));
    db.prepare("DELETE FROM notes WHERE id = ?").run(note.id);
  }
  db.prepare("DELETE FROM comments WHERE body LIKE '%irthday%' OR body LIKE '%Happy Birthday%'").run();
  if (james) {
    db.prepare("UPDATE users SET name = 'James Coffman', bio = 'Keeping the family recipes, notes, and pictures in this book.' WHERE id = ? AND (name = 'James Miller' OR email = 'james@recipebook.family')").run(james.id);
  }
  const fakes = db.prepare("SELECT id FROM users WHERE email IN ('lisa@recipebook.family', 'sarah@recipebook.family')").all();
  for (const fake of fakes) {
    if (james && fake.id !== james.id) {
      db.prepare("UPDATE notes SET user_id = ? WHERE user_id = ?").run(james.id, fake.id);
      db.prepare("UPDATE comments SET user_id = ? WHERE user_id = ?").run(james.id, fake.id);
      db.prepare(`DELETE FROM reactions WHERE user_id = ? AND EXISTS (
        SELECT 1 FROM reactions AS kept
        WHERE kept.user_id = ? AND kept.target_type = reactions.target_type AND kept.target_id = reactions.target_id AND kept.kind = reactions.kind
      )`).run(fake.id, james.id);
      db.prepare("UPDATE reactions SET user_id = ? WHERE user_id = ?").run(james.id, fake.id);
      try { db.prepare("UPDATE library_items SET user_id = ? WHERE user_id = ?").run(james.id, fake.id); } catch { /* older books have no library table yet */ }
    }
    db.prepare("DELETE FROM follows WHERE follower_id = ? OR following_id = ?").run(fake.id, fake.id);
    db.prepare("DELETE FROM users WHERE id = ?").run(fake.id);
  }
}

export function recipeRow(row) {
  if (!row) return null;
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
    youtube: row.youtube || "",
    family: Boolean(row.family),
    updatedAt: row.updated_at,
    media: db.prepare("SELECT id, kind, path, caption FROM recipe_media WHERE recipe_id = ? ORDER BY id").all(row.id)
  };
}
