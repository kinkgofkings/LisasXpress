import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { hashPassword, signToken, readToken } from "../server/auth.js";
import { placeOrder, sqliteShop } from "../server/shop.js";
import { createHousehold, ensureTenancy, loadHousehold, presentHousehold, saveHouseholdSettings } from "../server/tenancy.js";
import {
  buildPublicConfig
} from "../server/tenancy.js";
import {
  cashLink, chargeSquare, decryptSecret, detectRegion, encryptSecret, looksLikeCardNumber,
  publicPayments, resolveBrand, resolvePayments
} from "../shared/white-label.js";

test("brand and payment config come from the environment, not a scattered cashtag", () => {
  const brand = resolveBrand({ BRAND_NAME: "Harbor Table", CASH_APP_CASHTAG: "HarborPay" });
  assert.equal(brand.name, "Harbor Table");
  const payments = resolvePayments({ CASH_APP_CASHTAG: "HarborPay", SQUARE_ACCESS_TOKEN: "sq0atp-secret" });
  assert.equal(payments.providers.find((provider) => provider.id === "cashapp").cashtag, "HarborPay");
  const pub = publicPayments(payments);
  assert.equal(JSON.stringify(pub).includes("sq0atp-secret"), false);
  assert.equal(pub.providers.find((provider) => provider.id === "square").tokenSet, true);
});

test("location picks Sheetz in Virginia and Stripes in Texas", () => {
  const virginia = detectRegion({ lat: 37.54, lng: -77.43, env: {} });
  const texas = detectRegion({ lat: 33.58, lng: -101.86, env: {} });
  const edge = detectRegion({ cf: { regionCode: "VA" }, env: {} });
  assert.equal(virginia.chain, "Sheetz");
  assert.equal(texas.chain, "Stripes");
  assert.equal(edge.id, "va");
  assert.equal(cashLink("HarborPay", 2599), "https://cash.app/$HarborPay/25.99");
});

test("a family home region overrides a visitor standing in another state", () => {
  const region = detectRegion({
    lat: 33.58,
    lng: -101.86,
    household: { id: "hh_va", settings: { homeRegion: "va" } },
    env: {}
  });
  assert.equal(region.chain, "Sheetz");
});

test("square tokens encrypt, and raw card numbers are refused", async () => {
  assert.equal(looksLikeCardNumber("4111111111111111"), true);
  const cipher = await encryptSecret("test-secret", "sq0atp-family-token");
  assert.equal(cipher.includes("sq0atp-family-token"), false);
  assert.equal(await decryptSecret("test-secret", cipher), "sq0atp-family-token");
  const refused = await chargeSquare({ token: "x", sourceId: "4111111111111111", amountCents: 100, locationId: "L1", orderId: "A" });
  assert.equal(refused.ok, false);
});

test("two families keep separate payment settings and private orders", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cookbook-"));
  const db = new DatabaseSync(path.join(dir, "book.db"));
  db.exec(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    avatar_path TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`);
  const store = sqliteShop(db);
  const env = { AUTH_SECRET: "family-secret", APP_SECRET: "family-secret" };
  await ensureTenancy(store, env);
  const now = new Date().toISOString();
  db.prepare("INSERT INTO users (email, password_hash, name, bio, avatar_path, created_at, household_id, role) VALUES (?, ?, ?, '', '', ?, 'home', 'admin')")
    .run("lisa@lisasxpress.com", hashPassword("password123"), "Lisa", now);
  const other = db.prepare("INSERT INTO users (email, password_hash, name, bio, avatar_path, created_at, household_id, role) VALUES (?, ?, ?, '', '', ?, 'home', 'member')")
    .run("ada@example.com", hashPassword("password123"), "Ada", now);
  const household = await createHousehold(store, { name: "Ada's kitchen", ownerId: other.lastInsertRowid });
  await saveHouseholdSettings(store, env, household.id, {
    payments: { cashapp: { enabled: true, cashtag: "AdaTable" }, square: { enabled: false } },
    squareAccessToken: "sq0atp-ada-only"
  });
  await saveHouseholdSettings(store, env, "home", {
    payments: { cashapp: { enabled: true, cashtag: "Yellow9859" }, square: { enabled: false } }
  });
  const home = await loadHousehold(store, "home");
  const ada = await loadHousehold(store, household.id);
  const homeView = buildPublicConfig(env, home, detectRegion({ household: home, env }), { id: 1, role: "admin", household_id: "home" });
  const adaView = buildPublicConfig(env, ada, detectRegion({ household: ada, env }), { id: 2, role: "admin", household_id: household.id });
  assert.equal(homeView.payments.providers.find((provider) => provider.id === "cashapp").cashtag, "Yellow9859");
  assert.equal(adaView.payments.providers.find((provider) => provider.id === "cashapp").cashtag, "AdaTable");
  assert.equal(JSON.stringify(adaView).includes("sq0atp-ada-only"), false);
  assert.equal(JSON.stringify(homeView).includes("sq0atp-ada-only"), false);
  const shown = await presentHousehold(store, env, household.id, true);
  assert.equal(JSON.stringify(shown).includes("sq0atp-ada-only"), false);
  assert.equal(shown.squareTokenSet, true);
  const order = await placeOrder(store, {
    name: "Ada",
    phone: "555-0100",
    address: "1 Main",
    city: "Richmond",
    zip: "23220",
    mode: "ship",
    payMethod: "cashapp",
    items: [{ id: "bayou-gold", qty: 1 }]
  }, env, { household: ada, householdId: ada.id, region: detectRegion({ household: ada, env }) });
  assert.equal(order.order.cashTag, "AdaTable");
  assert.equal(order.order.payment.cashUrl.includes("AdaTable"), true);
  const token = signToken(other.lastInsertRowid);
  assert.equal(readToken(`Bearer ${token}`).id, other.lastInsertRowid);
});
