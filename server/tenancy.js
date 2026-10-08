import {
  HOME_ID, adminEmails, applySettingsPatch, appSecret, encryptSecret, publicBrand,
  publicLocale, publicPayments, resolveBrand, resolvePayments, storedSettings
} from "../shared/white-label.js";

const HOME_NAME = "Home kitchen";

async function relax(store, sql, ...params) {
  try {
    await store.run(sql, ...params);
  } catch {
    /* the table may not exist yet */
  }
}

async function addColumn(store, table, column, definition) {
  try {
    await store.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    /* the column is already there */
  }
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
}

function parseSettings(raw) {
  try {
    const value = JSON.parse(raw || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

export async function ensureTenancy(store, env = {}) {
  await store.run(`CREATE TABLE IF NOT EXISTS households (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);
  await store.run(`CREATE TABLE IF NOT EXISTS household_settings (
    household_id TEXT PRIMARY KEY,
    settings_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  )`);
  await addColumn(store, "users", "household_id", "TEXT NOT NULL DEFAULT 'home'");
  await addColumn(store, "users", "role", "TEXT NOT NULL DEFAULT 'member'");
  await addColumn(store, "notes", "household_id", "TEXT NOT NULL DEFAULT 'home'");
  await addColumn(store, "shop_orders", "household_id", "TEXT NOT NULL DEFAULT 'home'");
  await addColumn(store, "shop_orders", "payment_provider", "TEXT NOT NULL DEFAULT ''");
  await addColumn(store, "shop_products", "region_id", "TEXT NOT NULL DEFAULT ''");
  const now = new Date().toISOString();
  const home = await store.get("SELECT id FROM households WHERE id = ?", HOME_ID);
  if (!home) {
    await store.run(
      "INSERT INTO households (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)",
      HOME_ID, HOME_NAME, inviteCode(), now
    );
    await store.run(
      "INSERT INTO household_settings (household_id, settings_json, updated_at) VALUES (?, '{}', ?)",
      HOME_ID, now
    );
  }
  await relax(store, "UPDATE users SET household_id = ? WHERE household_id IS NULL OR household_id = ''", HOME_ID);
  await relax(store, "UPDATE notes SET household_id = ? WHERE household_id IS NULL OR household_id = ''", HOME_ID);
  const emails = adminEmails(env);
  for (const email of emails) {
    await store.run(
      "UPDATE users SET role = 'admin' WHERE lower(email) = ? AND (household_id = ? OR household_id IS NULL OR household_id = '')",
      email, HOME_ID
    );
  }
}

export async function loadHousehold(store, id = HOME_ID) {
  const householdId = id || HOME_ID;
  const row = await store.get("SELECT id, name, invite_code, created_at FROM households WHERE id = ?", householdId);
  if (!row) return null;
  const settingsRow = await store.get("SELECT settings_json FROM household_settings WHERE household_id = ?", householdId);
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
    settings: parseSettings(settingsRow?.settings_json)
  };
}

export async function householdForUser(store, user) {
  return loadHousehold(store, user?.household_id || HOME_ID);
}

export function sameFamily(left, right) {
  return String(left?.household_id || HOME_ID) === String(right?.household_id || HOME_ID);
}

export async function createHousehold(store, { name, ownerId }) {
  const id = `hh_${inviteCode().toLowerCase()}`;
  const now = new Date().toISOString();
  const code = inviteCode();
  await store.run(
    "INSERT INTO households (id, name, invite_code, created_at) VALUES (?, ?, ?, ?)",
    id, String(name || "New kitchen").slice(0, 80), code, now
  );
  await store.run(
    "INSERT INTO household_settings (household_id, settings_json, updated_at) VALUES (?, '{}', ?)",
    id, now
  );
  if (ownerId != null) {
    await store.run("UPDATE users SET household_id = ?, role = 'admin' WHERE id = ?", id, ownerId);
  }
  return loadHousehold(store, id);
}

export async function findInvite(store, code) {
  const invite = String(code || "").trim().toUpperCase();
  if (!invite) return null;
  const row = await store.get("SELECT id FROM households WHERE invite_code = ?", invite);
  if (!row) return null;
  return loadHousehold(store, row.id);
}

export async function saveHouseholdSettings(store, env, householdId, patch) {
  const current = await loadHousehold(store, householdId);
  if (!current) return { error: "That family book was not found.", status: 404 };
  const next = applySettingsPatch(current.settings, patch || {});
  if (patch?.clearSquareToken) delete next.payments.square.tokenEnc;
  const rawToken = String(patch?.squareAccessToken || patch?.payments?.square?.accessToken || "").trim();
  if (rawToken) {
    if (rawToken.length < 8 || rawToken.length > 200) {
      return { error: "That Square access token does not look right.", status: 400 };
    }
    const secret = appSecret(env);
    if (!secret) return { error: "Set AUTH_SECRET before saving a Square access token.", status: 400 };
    next.payments.square.tokenEnc = await encryptSecret(secret, rawToken);
  }
  const stored = storedSettings(next);
  if (JSON.stringify(stored).includes(rawToken) && rawToken) {
    return { error: "The Square token could not be stored safely.", status: 500 };
  }
  await store.run(
    "UPDATE household_settings SET settings_json = ?, updated_at = ? WHERE household_id = ?",
    JSON.stringify(stored), new Date().toISOString(), householdId
  );
  return { household: await presentHousehold(store, env, householdId, true) };
}

export async function presentHousehold(store, env, householdId, includeInvite) {
  const household = await loadHousehold(store, householdId);
  if (!household) return null;
  const brand = resolveBrand(env, household);
  const payments = resolvePayments(env, household);
  return {
    id: household.id,
    name: household.name,
    inviteCode: includeInvite ? household.inviteCode : "",
    homeRegion: household.settings.homeRegion || "",
    brand: publicBrand(brand),
    payments: publicPayments(payments),
    squareTokenSet: Boolean(household.settings.payments?.square?.tokenEnc) || payments.providers.some((provider) => provider.id === "square" && provider.tokenSet)
  };
}

export function buildPublicConfig(env, household, region, user = null) {
  const brand = resolveBrand(env, household);
  const payments = resolvePayments(env, household);
  return {
    brand: publicBrand(brand),
    payments: publicPayments(payments),
    locale: publicLocale(region),
    viewer: user ? {
      id: user.id,
      role: user.role || "member",
      householdId: user.household_id || HOME_ID,
      admin: (user.role || "") === "admin"
    } : null
  };
}

export function isAdmin(user) {
  return (user?.role || "") === "admin";
}
