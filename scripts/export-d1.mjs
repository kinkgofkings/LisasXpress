import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/book.db");

function hexText(value) {
  return `CAST(X'${Buffer.from(String(value ?? ""), "utf8").toString("hex")}' AS TEXT)`;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.trunc(n)) : "0";
}

function insert(table, columns, values) {
  return `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
}

const lines = ["PRAGMA foreign_keys = OFF;"];

for (const row of db.prepare("SELECT * FROM users").all()) {
  lines.push(insert("users",
    ["id", "email", "password_hash", "name", "bio", "avatar_path", "created_at"],
    [num(row.id), hexText(row.email), hexText(row.password_hash), hexText(row.name), hexText(row.bio), hexText(row.avatar_path), hexText(row.created_at)]
  ));
}

for (const row of db.prepare("SELECT * FROM recipes").all()) {
  lines.push(insert("recipes",
    ["id", "title", "cuisine", "category", "summary", "yield_text", "prep_minutes", "cook_minutes", "ingredients", "steps", "notes", "image", "image_credit", "source_url", "source_title", "family", "created_at", "updated_at"],
    [hexText(row.id), hexText(row.title), hexText(row.cuisine), hexText(row.category), hexText(row.summary), hexText(row.yield_text), num(row.prep_minutes), num(row.cook_minutes), hexText(row.ingredients), hexText(row.steps), hexText(row.notes), hexText(row.image), hexText(row.image_credit), hexText(row.source_url), hexText(row.source_title), num(row.family), hexText(row.created_at), hexText(row.updated_at)]
  ));
}

for (const row of db.prepare("SELECT * FROM recipe_media").all()) {
  lines.push(insert("recipe_media",
    ["id", "recipe_id", "kind", "path", "caption", "created_at"],
    [num(row.id), hexText(row.recipe_id), hexText(row.kind), hexText(row.path), hexText(row.caption), hexText(row.created_at)]
  ));
}

for (const row of db.prepare("SELECT * FROM notes").all()) {
  lines.push(insert("notes",
    ["id", "user_id", "title", "body", "updated_at"],
    [num(row.id), num(row.user_id), hexText(row.title), hexText(row.body), hexText(row.updated_at)]
  ));
}

for (const row of db.prepare("SELECT * FROM library_items").all()) {
  lines.push(insert("library_items",
    ["id", "user_id", "kind", "title", "url", "description", "notes", "file_path", "created_at"],
    [num(row.id), num(row.user_id), hexText(row.kind), hexText(row.title), hexText(row.url), hexText(row.description), hexText(row.notes), hexText(row.file_path), hexText(row.created_at)]
  ));
}

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/d1-seed.sql", lines.join("\n"));
console.log(`wrote ${lines.length - 1} rows`);
