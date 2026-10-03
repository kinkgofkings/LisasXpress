import { worldCatalog } from "./world.js";

const ACTIVE_MS = 45_000;
const RING_MS = 45_000;
const TABLES = [
  `CREATE TABLE IF NOT EXISTS presence (
    user_id INTEGER PRIMARY KEY,
    last_seen TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    seen INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS messages_recipient ON messages (recipient_id, seen, id)`,
  `CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caller_id INTEGER NOT NULL,
    callee_id INTEGER NOT NULL,
    mode TEXT NOT NULL,
    state TEXT NOT NULL,
    offer TEXT NOT NULL DEFAULT '',
    answer TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS call_signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    call_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`
];

const STOP = new Set("a an the and or for with how do i to of my what is in on make me some your from about can you please show find recipe recipes cook cooking".split(" "));

export function sqliteDesk(database) {
  return {
    async all(sql, params = []) {
      return database.prepare(sql).all(...params);
    },
    async get(sql, params = []) {
      return database.prepare(sql).get(...params) || null;
    },
    async run(sql, params = []) {
      const info = database.prepare(sql).run(...params);
      return { lastId: Number(info.lastInsertRowid || 0), changes: info.changes || 0 };
    }
  };
}

export function d1Desk(database) {
  return {
    async all(sql, params = []) {
      const result = await database.prepare(sql).bind(...params).all();
      return result.results || [];
    },
    async get(sql, params = []) {
      return database.prepare(sql).bind(...params).first();
    },
    async run(sql, params = []) {
      const result = await database.prepare(sql).bind(...params).run();
      return { lastId: Number(result.meta?.last_row_id || 0), changes: result.meta?.changes || 0 };
    }
  };
}

export function deskFail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function ensureDesk(db) {
  for (const sql of TABLES) await db.run(sql);
}

function nowIso() {
  return new Date().toISOString();
}

function personOf(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    bio: row.bio || "",
    avatar: row.avatar_path || row.avatar || ""
  };
}

function likeTerm(value) {
  return `%${String(value || "").replace(/[\\%_]/g, "").slice(0, 80)}%`;
}

function focus(question) {
  const words = String(question || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !STOP.has(word));
  return words.slice(0, 4).join(" ") || String(question || "").trim().slice(0, 80);
}

async function touch(db, userId) {
  const seen = nowIso();
  await db.run(
    `INSERT INTO presence (user_id, last_seen) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET last_seen = excluded.last_seen`,
    [userId, seen]
  );
  const cutoff = new Date(Date.now() - RING_MS).toISOString();
  await db.run("UPDATE calls SET state = 'missed', updated_at = ? WHERE state = 'ringing' AND updated_at < ?", [seen, cutoff]);
}

async function activeIds(db) {
  const cutoff = new Date(Date.now() - ACTIVE_MS).toISOString();
  const rows = await db.all("SELECT user_id AS id FROM presence WHERE last_seen >= ?", [cutoff]);
  return new Set(rows.map((row) => String(row.id)));
}

async function otherUser(db, id) {
  const row = await db.get("SELECT id, name, bio, avatar_path FROM users WHERE id = ?", [id]);
  if (!row) throw deskFail("That person is not in the book.", 404);
  return personOf(row);
}

function messageOf(row, userId) {
  return {
    id: row.id,
    from: row.sender_id,
    to: row.recipient_id,
    body: row.body,
    createdAt: row.created_at,
    mine: String(row.sender_id) === String(userId),
    seen: Boolean(row.seen)
  };
}

export async function listThreads(db, userId) {
  await touch(db, userId);
  const people = await db.all("SELECT id, name, bio, avatar_path FROM users WHERE id != ? ORDER BY name COLLATE NOCASE", [userId]);
  const messages = await db.all(
    `SELECT id, sender_id, recipient_id, body, created_at, seen FROM messages
     WHERE sender_id = ? OR recipient_id = ? ORDER BY id DESC LIMIT 300`,
    [userId, userId]
  );
  const unreadRows = await db.all(
    "SELECT sender_id AS id, COUNT(*) AS total FROM messages WHERE recipient_id = ? AND seen = 0 GROUP BY sender_id",
    [userId]
  );
  const unread = new Map(unreadRows.map((row) => [String(row.id), Number(row.total) || 0]));
  const latest = new Map();
  for (const row of messages) {
    const other = String(row.sender_id) === String(userId) ? String(row.recipient_id) : String(row.sender_id);
    if (!latest.has(other)) latest.set(other, row);
  }
  const online = await activeIds(db);
  const threads = people.map((row) => {
    const last = latest.get(String(row.id));
    return {
      person: { ...personOf(row), active: online.has(String(row.id)) },
      unread: unread.get(String(row.id)) || 0,
      last: last ? { body: last.body, createdAt: last.created_at, mine: String(last.sender_id) === String(userId) } : null
    };
  }).sort((a, b) => {
    if (a.person.active !== b.person.active) return a.person.active ? -1 : 1;
    const at = a.last?.createdAt || "";
    const bt = b.last?.createdAt || "";
    return bt.localeCompare(at);
  });
  return {
    threads,
    unread: threads.reduce((sum, thread) => sum + thread.unread, 0),
    active: threads.filter((thread) => thread.person.active).map((thread) => thread.person)
  };
}

export async function readThread(db, userId, withId, after = 0) {
  if (String(withId) === String(userId)) throw deskFail("That is your own account.");
  const person = await otherUser(db, withId);
  await touch(db, userId);
  await db.run(
    "UPDATE messages SET seen = 1 WHERE recipient_id = ? AND sender_id = ? AND seen = 0",
    [userId, withId]
  );
  const rows = await db.all(
    `SELECT id, sender_id, recipient_id, body, created_at, seen FROM messages
     WHERE id > ? AND ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
     ORDER BY id LIMIT 200`,
    [Number(after) || 0, userId, withId, withId, userId]
  );
  const online = await activeIds(db);
  return { person: { ...person, active: online.has(String(person.id)) }, messages: rows.map((row) => messageOf(row, userId)) };
}

export async function sendMessage(db, userId, { to, body }) {
  const text = String(body || "").trim();
  if (!text) throw deskFail("Write a message first.");
  if (text.length > 1000) throw deskFail("That message is too long. Keep it under 1000 characters.");
  if (String(to) === String(userId)) throw deskFail("That is your own account.");
  await otherUser(db, to);
  await touch(db, userId);
  const created = nowIso();
  const saved = await db.run(
    "INSERT INTO messages (sender_id, recipient_id, body, created_at, seen) VALUES (?, ?, ?, ?, 0)",
    [userId, to, text, created]
  );
  return messageOf({
    id: saved.lastId,
    sender_id: userId,
    recipient_id: to,
    body: text,
    created_at: created,
    seen: 0
  }, userId);
}

async function mustCall(db, userId, callId) {
  const call = await db.get("SELECT * FROM calls WHERE id = ?", [callId]);
  if (!call) throw deskFail("That call is not in the book.", 404);
  if (String(call.caller_id) !== String(userId) && String(call.callee_id) !== String(userId)) {
    throw deskFail("That call is between two other people.", 403);
  }
  return call;
}

function callOf(row, userId, person) {
  const role = String(row.caller_id) === String(userId) ? "caller" : "callee";
  return {
    id: row.id,
    role,
    mode: row.mode,
    state: row.state,
    offer: role === "callee" ? row.offer : "",
    answer: role === "caller" ? row.answer : "",
    person,
    createdAt: row.created_at
  };
}

export async function placeCall(db, userId, { to, mode, offer }) {
  if (!["audio", "video"].includes(mode)) throw deskFail("Choose a phone call or a video call.");
  const sdp = String(offer || "");
  if (sdp.length < 20 || sdp.length > 20000) throw deskFail("The call did not start. Try again.");
  if (String(to) === String(userId)) throw deskFail("That is your own account.");
  const person = await otherUser(db, to);
  const busy = await db.get(
    `SELECT id FROM calls WHERE state IN ('ringing', 'live') AND (caller_id = ? OR callee_id = ? OR caller_id = ? OR callee_id = ?)`,
    [userId, userId, to, to]
  );
  if (busy) throw deskFail("Someone is already on a call. Try again in a moment.");
  await touch(db, userId);
  const created = nowIso();
  const saved = await db.run(
    `INSERT INTO calls (caller_id, callee_id, mode, state, offer, answer, created_at, updated_at)
     VALUES (?, ?, ?, 'ringing', ?, '', ?, ?)`,
    [userId, to, mode, sdp, created, created]
  );
  return { call: { id: saved.lastId, role: "caller", mode, state: "ringing", person, answer: "" } };
}

export async function setCall(db, userId, callId, { action, answer }) {
  const call = await mustCall(db, userId, callId);
  const stamp = nowIso();
  if (action === "accept") {
    if (String(call.callee_id) !== String(userId)) throw deskFail("Only the person being called can answer.");
    if (call.state !== "ringing") throw deskFail("That call is no longer ringing.");
    const sdp = String(answer || "");
    if (sdp.length < 20 || sdp.length > 20000) throw deskFail("The call did not connect. Try again.");
    await db.run("UPDATE calls SET state = 'live', answer = ?, updated_at = ? WHERE id = ?", [sdp, stamp, callId]);
  } else if (action === "decline") {
    if (String(call.callee_id) !== String(userId)) throw deskFail("Only the person being called can decline.");
    await db.run("UPDATE calls SET state = 'declined', updated_at = ? WHERE id = ? AND state = 'ringing'", [stamp, callId]);
    await db.run("DELETE FROM call_signals WHERE call_id = ?", [callId]);
  } else if (action === "end") {
    const next = call.state === "ringing" ? "ended" : "ended";
    await db.run("UPDATE calls SET state = ?, updated_at = ? WHERE id = ? AND state IN ('ringing', 'live')", [next, stamp, callId]);
    await db.run("DELETE FROM call_signals WHERE call_id = ?", [callId]);
  } else {
    throw deskFail("That call action is not known.");
  }
  return loadCall(db, userId, callId);
}

async function loadCall(db, userId, callId) {
  const call = await mustCall(db, userId, callId);
  const otherId = String(call.caller_id) === String(userId) ? call.callee_id : call.caller_id;
  const person = await otherUser(db, otherId);
  return { call: callOf(call, userId, person) };
}

export async function getCall(db, userId, callId) {
  await touch(db, userId);
  return loadCall(db, userId, callId);
}

export async function addSignal(db, userId, callId, payload) {
  const call = await mustCall(db, userId, callId);
  if (!["ringing", "live"].includes(call.state)) throw deskFail("That call has ended.");
  const text = JSON.stringify(payload || {});
  if (text.length > 8000) throw deskFail("That call detail was too large.");
  const count = await db.get("SELECT COUNT(*) AS total FROM call_signals WHERE call_id = ?", [callId]);
  if (Number(count?.total || 0) > 80) return { ok: true };
  await db.run(
    "INSERT INTO call_signals (call_id, sender_id, payload, created_at) VALUES (?, ?, ?, ?)",
    [callId, userId, text, nowIso()]
  );
  return { ok: true };
}

export async function listSignals(db, userId, callId, after = 0) {
  await mustCall(db, userId, callId);
  const rows = await db.all(
    `SELECT id, payload FROM call_signals
     WHERE call_id = ? AND sender_id != ? AND id > ? ORDER BY id LIMIT 40`,
    [callId, userId, Number(after) || 0]
  );
  return {
    signals: rows.map((row) => {
      let payload = null;
      try { payload = JSON.parse(row.payload); } catch { payload = null; }
      return { id: row.id, payload };
    }).filter((row) => row.payload)
  };
}

export async function deskSnapshot(db, userId) {
  await touch(db, userId);
  const unreadRow = await db.get("SELECT COUNT(*) AS total FROM messages WHERE recipient_id = ? AND seen = 0", [userId]);
  const incomingRow = await db.get(
    `SELECT * FROM calls WHERE callee_id = ? AND state = 'ringing' ORDER BY id DESC LIMIT 1`,
    [userId]
  );
  let incoming = null;
  if (incomingRow) {
    const person = await otherUser(db, incomingRow.caller_id);
    incoming = callOf(incomingRow, userId, person);
  }
  const openRow = await db.get(
    `SELECT * FROM calls WHERE state IN ('ringing', 'live') AND (caller_id = ? OR callee_id = ?) ORDER BY id DESC LIMIT 1`,
    [userId, userId]
  );
  let open = null;
  if (openRow) {
    const otherId = String(openRow.caller_id) === String(userId) ? openRow.callee_id : openRow.caller_id;
    const person = await otherUser(db, otherId);
    open = callOf(openRow, userId, person);
  }
  const online = await activeIds(db);
  const people = await db.all("SELECT id, name, bio, avatar_path FROM users WHERE id != ?", [userId]);
  return {
    unread: Number(unreadRow?.total || 0),
    incoming,
    open,
    active: people.filter((row) => online.has(String(row.id))).map(personOf)
  };
}

async function firstHits(terms, run) {
  for (const term of terms) {
    const rows = await run(likeTerm(term));
    if (rows.length) return rows;
  }
  return [];
}

async function recipeHits(db, term) {
  const needle = likeTerm(term);
  if (needle === "%%") return [];
  return db.all(
    `SELECT id, title, summary, cuisine, category FROM recipes
     WHERE title LIKE ? OR summary LIKE ? OR ingredients LIKE ? OR notes LIKE ? OR steps LIKE ?
     ORDER BY title COLLATE NOCASE LIMIT 8`,
    [needle, needle, needle, needle, needle]
  );
}

async function searchRecipes(db, question) {
  const phrase = focus(question);
  let rows = phrase ? await recipeHits(db, phrase) : [];
  if (!rows.length) {
    const words = phrase.split(/\s+/).filter((word) => word.length > 2);
    const seen = new Set();
    for (const word of words) {
      for (const row of await recipeHits(db, word)) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        rows.push(row);
        if (rows.length >= 8) break;
      }
      if (rows.length >= 8) break;
    }
  }
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    cuisine: row.cuisine,
    category: row.category,
    href: `#/recipe/${row.id}`
  }));
}

function spoken(question, recipes, meals) {
  if (!recipes.length && !meals.length) {
    return `I looked through this book and the open library for “${question.trim().slice(0, 80)}” and did not find a matching plate. Try a shorter word, such as cobbler, stew, or brisket.`;
  }
  const names = recipes.slice(0, 4).map((item) => item.title);
  const library = meals.slice(0, 4).map((item) => item.title);
  const parts = [];
  if (names.length) parts.push(`In this book, start with ${names.join(", ")}.`);
  if (library.length) parts.push(`The open library also has ${library.join(", ")}.`);
  parts.push("Open a plate below for the real ingredients and steps.");
  return parts.join(" ");
}

async function libraryMeals(question) {
  try {
    const world = await worldCatalog({ q: focus(question) });
    return {
      meals: (world.meals || []).slice(0, 6).map((meal) => ({
        id: String(meal.id),
        title: meal.title,
        category: meal.category || "",
        area: meal.area || "",
        image: meal.image || "",
        href: `#/world/${meal.id}`
      })),
      notice: world.notice || ""
    };
  } catch {
    return { meals: [], notice: "" };
  }
}

async function hostVoice(ai, question, recipes, meals) {
  if (!ai?.run) return "";
  const notes = [
    ...recipes.map((item) => `${item.title}: ${item.summary}`),
    ...meals.map((item) => `${item.title} from the open library`)
  ].join("\n");
  try {
    const out = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: "You are the host at Lisa's family table. Answer in two or three plain sentences. Use only the plates listed. Do not invent ingredients, times, or medical advice. If the list does not answer the question, say so and name the closest plates. Dog meals are kitchen recipes, not a veterinarian's diet. Baby notes are not medical advice."
        },
        { role: "user", content: `Question: ${question}\n\nPlates:\n${notes || "None found."}` }
      ]
    });
    return String(out?.response || "").trim().slice(0, 800);
  } catch {
    return "";
  }
}

export async function searchBook(db, userId, question) {
  const q = String(question || "").trim();
  if (!q) throw deskFail("Type something to look for.");
  if (userId) await touch(db, userId);
  const recipes = await searchRecipes(db, q);
  const world = recipes.length >= 3 ? { meals: [], notice: "" } : await libraryMeals(q);
  const result = { query: q, recipes, meals: world.meals, notice: world.notice, notes: [], films: [], messages: [] };
  if (!userId) return result;
  const terms = focus(q).split(/\s+/).filter(Boolean);
  const needles = [focus(q), ...terms].filter((term, index, list) => term && list.indexOf(term) === index);
  const notes = await firstHits(needles, (needle) => db.all(
    `SELECT notes.id, notes.body, notes.updated_at, users.name AS name
     FROM notes JOIN users ON users.id = notes.user_id
     WHERE notes.title LIKE ? OR notes.body LIKE ? ORDER BY notes.updated_at DESC LIMIT 6`,
    [needle, needle]
  ));
  const films = await firstHits(needles, (needle) => db.all(
    `SELECT library_items.id, library_items.title, library_items.kind, library_items.url, users.name AS name
     FROM library_items JOIN users ON users.id = library_items.user_id
     WHERE library_items.kind NOT IN ('tiktok', 'facebook')
       AND (library_items.title LIKE ? OR library_items.notes LIKE ? OR library_items.description LIKE ?)
     ORDER BY library_items.id DESC LIMIT 6`,
    [needle, needle, needle]
  ));
  const messages = await firstHits(needles, (needle) => db.all(
    `SELECT messages.id, messages.body, messages.created_at, messages.sender_id, messages.recipient_id, users.name AS name
     FROM messages JOIN users ON users.id = messages.sender_id
     WHERE (messages.sender_id = ? OR messages.recipient_id = ?) AND messages.body LIKE ?
     ORDER BY messages.id DESC LIMIT 6`,
    [userId, userId, needle]
  ));
  result.notes = notes.map((row) => ({ id: row.id, body: row.body, name: row.name, href: "#/notes" }));
  result.films = films.map((row) => ({
    id: row.id,
    title: row.title,
    name: row.name,
    href: row.url && /^https?:\/\//.test(row.url) ? row.url : "#/studio"
  }));
  result.messages = messages.map((row) => ({
    id: row.id,
    body: row.body,
    name: row.name,
    href: `#/messages/${String(row.sender_id) === String(userId) ? row.recipient_id : row.sender_id}`
  }));
  return result;
}

export async function askHost(db, userId, question, ai) {
  const q = String(question || "").trim();
  if (!q) throw deskFail("Ask a question first.");
  if (q.length > 300) throw deskFail("Ask a shorter question.");
  const found = await searchBook(db, userId, q);
  const voice = await hostVoice(ai, q, found.recipes, found.meals);
  return {
    answer: voice || spoken(q, found.recipes, found.meals),
    recipes: found.recipes.slice(0, 4),
    meals: found.meals.slice(0, 4),
    notice: found.notice || ""
  };
}
