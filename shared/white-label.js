import brandDefaults from "../config/brand.json" with { type: "json" };
import regionCatalog from "../config/regions.json" with { type: "json" };

const REGIONS = regionCatalog;
const HOME_ID = "home";

export function envValue(env, key) {
  const fromEnv = env?.[key];
  if (fromEnv != null && String(fromEnv).trim()) return String(fromEnv).trim();
  if (typeof process !== "undefined" && process.env?.[key]) return String(process.env[key]).trim();
  return "";
}

function cleanTag(value) {
  return String(value || "").replace(/^\$/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
}

function cleanColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function cleanUrl(value, fallback) {
  const url = String(value || "").trim();
  if (!url) return fallback;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

export function isHomeHousehold(household) {
  const id = household?.id || household?.householdId || HOME_ID;
  return id === HOME_ID;
}

function pickBrand(saved, envKey, env, home, fallback) {
  const own = String(saved || "").trim();
  if (own) return own;
  if (home) return envValue(env, envKey) || fallback;
  return fallback;
}

export function resolveBrand(env = {}, household = null) {
  const saved = household?.settings?.brand || {};
  const base = brandDefaults;
  const home = isHomeHousehold(household) || !household;
  const neutral = String(household?.name || "Family Recipe Book").trim().slice(0, 80);
  const name = pickBrand(saved.name, "BRAND_NAME", env, home, home ? base.name : neutral).slice(0, 80) || (home ? base.name : neutral);
  return {
    id: household?.id || base.id,
    name,
    shortName: pickBrand(saved.shortName, "BRAND_SHORT_NAME", env, home, home ? base.shortName : neutral).slice(0, 40),
    heroTitle: pickBrand(saved.heroTitle, "", env, home, home ? base.heroTitle : neutral).slice(0, 80),
    badge: pickBrand(saved.badge, "", env, home, home ? base.badge : "Family kitchen").slice(0, 60),
    studioName: pickBrand(saved.studioName, "BRAND_STUDIO_NAME", env, home, home ? base.studioName : neutral).slice(0, 80),
    studioHandle: pickBrand(saved.studioHandle, "BRAND_STUDIO_HANDLE", env, home, home ? base.studioHandle : "").slice(0, 40),
    studioUrl: cleanUrl(saved.studioUrl || (home ? envValue(env, "BRAND_STUDIO_URL") || base.studioUrl : ""), home ? base.studioUrl : "https://www.youtube.com/"),
    studioChannelId: home ? String(saved.studioChannelId || envValue(env, "BRAND_CHANNEL_ID") || base.studioChannelId).trim().slice(0, 40) : String(saved.studioChannelId || "").trim().slice(0, 40),
    tagline: pickBrand(saved.tagline, "", env, home, home ? base.tagline : "A family cookbook.").slice(0, 240),
    domain: cleanUrl(saved.domain || (home ? envValue(env, "BRAND_DOMAIN") || base.domain : ""), home ? base.domain : "https://example.com/"),
    themeColor: cleanColor(saved.themeColor || (home ? envValue(env, "BRAND_THEME_COLOR") : ""), base.themeColor),
    ownerName: pickBrand(saved.ownerName, "", env, home, home ? base.ownerName : "").slice(0, 80),
    ownerEmail: home ? String(envValue(env, "BRAND_OWNER_EMAIL") || base.ownerEmail).trim().toLowerCase() : "",
    adminEmails: adminEmails(env),
    quickSignIn: quickSignInAllowed(env, household),
    quickSignInLabel: home ? pickBrand(saved.quickSignInLabel, "", env, true, base.quickSignInLabel).slice(0, 80) : "",
    imageCredit: pickBrand(saved.imageCredit, "", env, home, home ? base.imageCredit : "Family photograph").replaceAll("Lisa's Recipe Book", name).slice(0, 120),
    orderPrefix: String((home ? envValue(env, "ORDER_PREFIX") : "") || (home ? base.orderPrefix : "FAM")).replace(/[^A-Za-z0-9]/g, "").slice(0, 6) || "LRB",
    defaultRegion: regionById(household?.settings?.homeRegion || (home ? envValue(env, "DEFAULT_REGION") : "") || (home ? base.defaultRegion : "tx"))?.id || base.defaultRegion
  };
}

export function adminEmails(env = {}) {
  const extra = envValue(env, "BRAND_ADMIN_EMAILS");
  const listed = extra ? extra.split(",") : brandDefaults.adminEmails;
  return [...new Set(listed.map((email) => String(email || "").trim().toLowerCase()).filter(Boolean))];
}

export function quickSignInAllowed(env = {}, household = null) {
  const flag = envValue(env, "QUICK_SIGNIN").toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (household && !isHomeHousehold(household)) return false;
  return brandDefaults.quickSignIn !== false;
}

export function publicBrand(brand) {
  return {
    id: brand.id,
    name: brand.name,
    shortName: brand.shortName,
    heroTitle: brand.heroTitle,
    badge: brand.badge,
    studioName: brand.studioName,
    studioHandle: brand.studioHandle,
    studioUrl: brand.studioUrl,
    studioChannelId: brand.studioChannelId,
    tagline: brand.tagline,
    domain: brand.domain,
    themeColor: brand.themeColor,
    ownerName: brand.ownerName,
    quickSignIn: Boolean(brand.quickSignIn),
    quickSignInLabel: brand.quickSignIn ? brand.quickSignInLabel : "",
    imageCredit: brand.imageCredit,
    defaultRegion: brand.defaultRegion
  };
}

function squareToken(env, household) {
  const saved = household?.settings?.payments?.square?.tokenEnc || "";
  if (saved) return { tokenEnc: saved, source: "household" };
  if (isHomeHousehold(household) || !household) {
    const token = envValue(env, "SQUARE_ACCESS_TOKEN");
    if (token) return { token, source: "env" };
  }
  return { source: "" };
}

export function resolvePayments(env = {}, household = null) {
  const saved = household?.settings?.payments || {};
  const home = isHomeHousehold(household) || !household;
  const defaults = brandDefaults.payments;
  const cashSaved = saved.cashapp || {};
  const squareSaved = saved.square || {};
  const cashtag = cleanTag(cashSaved.cashtag || (home ? envValue(env, "CASH_APP_CASHTAG") || defaults.cashapp.cashtag : ""));
  const cashEnabled = cashSaved.enabled != null ? Boolean(cashSaved.enabled) : (home ? Boolean(defaults.cashapp.enabled) : false);
  const applicationId = String(squareSaved.applicationId || (home ? envValue(env, "SQUARE_APPLICATION_ID") : "")).trim().slice(0, 80);
  const locationId = String(squareSaved.locationId || (home ? envValue(env, "SQUARE_LOCATION_ID") : "")).trim().slice(0, 80);
  const secret = squareToken(env, household);
  const squareEnabled = squareSaved.enabled != null ? Boolean(squareSaved.enabled) : (home ? Boolean(defaults.square.enabled) && Boolean(secret.token || secret.tokenEnc || applicationId) : false);
  const squareReady = Boolean(squareEnabled && applicationId && locationId && (secret.token || secret.tokenEnc));
  const providers = [
    {
      id: "cashapp",
      label: "Cash App",
      enabled: Boolean(cashEnabled && cashtag),
      configured: Boolean(cashtag),
      cashtag
    },
    {
      id: "square",
      label: "Square",
      enabled: Boolean(squareEnabled && (applicationId || secret.token || secret.tokenEnc)),
      configured: squareReady,
      applicationId,
      locationId,
      tokenSet: Boolean(secret.token || secret.tokenEnc),
      sandbox: envValue(env, "SQUARE_ENV").toLowerCase() === "sandbox"
    }
  ];
  const enabled = providers.filter((provider) => provider.enabled);
  return {
    providers,
    defaultProvider: enabled[0]?.id || "",
    secret
  };
}

export function publicPayments(payments) {
  return {
    providers: payments.providers.map((provider) => ({
      id: provider.id,
      label: provider.label,
      enabled: provider.enabled,
      configured: provider.configured,
      cashtag: provider.id === "cashapp" && provider.enabled ? provider.cashtag : "",
      applicationId: provider.id === "square" && provider.enabled ? provider.applicationId : "",
      locationId: provider.id === "square" && provider.enabled ? provider.locationId : "",
      tokenSet: provider.id === "square" ? Boolean(provider.tokenSet) : false,
      sandbox: provider.id === "square" ? Boolean(provider.sandbox) : false
    })),
    defaultProvider: payments.defaultProvider
  };
}

export function cashLink(cashtag, totalCents) {
  const tag = cleanTag(cashtag);
  const amount = (Math.max(0, Math.round(Number(totalCents) || 0)) / 100).toFixed(2);
  if (!tag) return "";
  return `https://cash.app/$${tag}/${amount}`;
}

export function looksLikeCardNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 13 && digits.length <= 19;
}

export function regionById(id) {
  const key = String(id || "").trim().toLowerCase();
  return REGIONS[key] || null;
}

export function regionList() {
  return Object.values(REGIONS);
}

export function regionFromZip(zip) {
  const n = Number(String(zip || "").replace(/\D/g, "").slice(0, 5));
  if (!n) return null;
  for (const region of regionList()) {
    for (const zone of region.zones || []) {
      if (zone.exact && n === Number(zone.exact)) return region;
      if (zone.from && zone.to && n >= Number(zone.from) && n <= Number(zone.to)) return region;
    }
  }
  return null;
}

export function zoneForZip(region, zip) {
  const n = Number(String(zip || "").replace(/\D/g, "").slice(0, 5));
  if (!region || !n) return null;
  for (const zone of region.zones || []) {
    if (zone.exact && n === Number(zone.exact)) return { ...zone, zip: String(n).padStart(5, "0") };
    if (zone.from && zone.to && n >= Number(zone.from) && n <= Number(zone.to)) return { ...zone, zip: String(n).padStart(5, "0") };
  }
  return null;
}

export function regionFromCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const hits = regionList().filter((region) => {
    const box = region.bounds;
    if (!box) return false;
    return latitude >= box.south && latitude <= box.north && longitude >= box.west && longitude <= box.east;
  });
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    return hits.sort((a, b) => {
      const ac = ((a.bounds.north + a.bounds.south) / 2 - latitude) ** 2 + ((a.bounds.east + a.bounds.west) / 2 - longitude) ** 2;
      const bc = ((b.bounds.north + b.bounds.south) / 2 - latitude) ** 2 + ((b.bounds.east + b.bounds.west) / 2 - longitude) ** 2;
      return ac - bc;
    })[0];
  }
  return null;
}

export function regionFromCloudflare(cf = {}) {
  const code = String(cf.regionCode || cf.region || "").trim().toUpperCase();
  if (!code) return null;
  return regionList().find((region) => (region.states || []).includes(code)) || null;
}

export function detectRegion({ env, household, cf, lat, lng, zip, requested } = {}) {
  const brand = resolveBrand(env, household);
  const home = regionById(household?.settings?.homeRegion);
  if (home) return home;
  const gps = regionFromCoords(lat, lng);
  if (gps) return gps;
  const edge = regionFromCloudflare(cf);
  if (edge) return edge;
  const postal = regionFromZip(zip);
  if (postal) return postal;
  const ask = regionById(requested);
  if (ask) return ask;
  return regionById(brand.defaultRegion) || regionList()[0];
}

export function publicLocale(region) {
  if (!region) return null;
  return {
    id: region.id,
    label: region.label,
    chain: region.chain,
    service: region.service,
    errandLabel: region.errandLabel,
    deliveryNote: region.deliveryNote,
    runners: region.runners || [],
    productIds: region.productIds || []
  };
}

export function regionProducts() {
  const rows = [];
  for (const region of regionList()) {
    for (const product of region.products || []) {
      rows.push({ ...product, region: region.id });
    }
    for (const id of region.productIds || []) {
      rows.push({ id, region: region.id });
    }
  }
  return rows;
}

export function fillCopy(text, brand) {
  return String(text || "")
    .replaceAll("{{name}}", brand.name)
    .replaceAll("{{shortName}}", brand.shortName)
    .replaceAll("{{studioName}}", brand.studioName);
}

const BRAND_KEYS = ["name", "shortName", "heroTitle", "badge", "studioName", "studioHandle", "studioUrl", "tagline", "domain", "themeColor", "ownerName", "quickSignInLabel", "imageCredit"];

export function applySettingsPatch(current = {}, patch = {}) {
  const next = {
    brand: { ...(current.brand || {}) },
    payments: {
      cashapp: { ...(current.payments?.cashapp || {}) },
      square: { ...(current.payments?.square || {}) }
    },
    homeRegion: current.homeRegion || ""
  };
  const brandPatch = patch.brand && typeof patch.brand === "object" ? patch.brand : {};
  for (const key of BRAND_KEYS) {
    if (brandPatch[key] == null) continue;
    next.brand[key] = String(brandPatch[key] || "").trim().slice(0, 240);
  }
  if (patch.homeRegion != null) {
    const region = String(patch.homeRegion || "").trim().toLowerCase();
    next.homeRegion = region && regionById(region) ? region : "";
  }
  const payments = patch.payments && typeof patch.payments === "object" ? patch.payments : {};
  if (payments.cashapp) {
    if (payments.cashapp.enabled != null) next.payments.cashapp.enabled = Boolean(payments.cashapp.enabled);
    if (payments.cashapp.cashtag != null) next.payments.cashapp.cashtag = cleanTag(payments.cashapp.cashtag);
  }
  if (payments.square) {
    if (payments.square.enabled != null) next.payments.square.enabled = Boolean(payments.square.enabled);
    if (payments.square.applicationId != null) {
      next.payments.square.applicationId = String(payments.square.applicationId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
    }
    if (payments.square.locationId != null) {
      next.payments.square.locationId = String(payments.square.locationId || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
    }
  }
  if (current.payments?.square?.tokenEnc && !patch.clearSquareToken) {
    next.payments.square.tokenEnc = current.payments.square.tokenEnc;
  }
  return next;
}

export function storedSettings(settings) {
  const copy = JSON.parse(JSON.stringify(settings || {}));
  delete copy.squareAccessToken;
  delete copy.payments?.square?.accessToken;
  delete copy.payments?.square?.token;
  return copy;
}

function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function aesKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(secret || "")));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(secret, plain) {
  const text = String(plain || "");
  if (!text) return "";
  if (!secret) throw new Error("A server secret is required before a Square token can be saved.");
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)));
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv, 0);
  out.set(cipher, iv.length);
  return bytesToBase64(out);
}

export async function decryptSecret(secret, encoded) {
  if (!encoded || !secret) return "";
  const bytes = base64ToBytes(encoded);
  const key = await aesKey(secret);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  return new TextDecoder().decode(plain);
}

export function appSecret(env = {}) {
  return envValue(env, "AUTH_SECRET") || envValue(env, "APP_SECRET");
}

export async function squareAccessToken(env, household) {
  const saved = household?.settings?.payments?.square?.tokenEnc || "";
  if (saved) {
    try {
      return await decryptSecret(appSecret(env), saved);
    } catch {
      return "";
    }
  }
  if (isHomeHousehold(household) || !household) return envValue(env, "SQUARE_ACCESS_TOKEN");
  return "";
}

export async function chargeSquare({ token, sourceId, amountCents, locationId, orderId, sandbox }) {
  if (looksLikeCardNumber(sourceId)) {
    return { ok: false, error: "Card numbers stay with Square. Send a Square payment token, not the card." };
  }
  const source = String(sourceId || "").trim();
  if (!source || source.length < 8 || source.length > 200) {
    return { ok: false, error: "Square did not return a payment token." };
  }
  if (!token) return { ok: false, error: "Square is turned on, but this family has not added a Square access token." };
  if (!locationId) return { ok: false, error: "Add the Square location id before taking cards." };
  const amount = Math.round(Number(amountCents) || 0);
  if (amount < 1) return { ok: false, error: "That order total cannot be charged." };
  const endpoint = sandbox
    ? "https://connect.squareupsandbox.com/v2/payments"
    : "https://connect.squareup.com/v2/payments";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "square-version": "2026-01-22"
    },
    body: JSON.stringify({
      source_id: source,
      idempotency_key: String(orderId || crypto.randomUUID()).slice(0, 45),
      amount_money: { amount, currency: "USD" },
      location_id: locationId,
      note: `Order ${orderId || ""}`.trim()
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body?.errors?.[0]?.detail || "Square could not take that payment.";
    return { ok: false, error: String(detail).slice(0, 180) };
  }
  return { ok: true, paymentId: body?.payment?.id || "" };
}

export function checkoutPlan(payments, providerId, totalCents) {
  const wanted = payments.providers.find((provider) => provider.id === providerId && provider.enabled);
  const provider = wanted || payments.providers.find((entry) => entry.enabled);
  if (!provider) return { error: "This family has not turned on Cash App or Square.", status: 400 };
  if (provider.id === "cashapp") {
    if (!provider.cashtag) return { error: "Add a Cash App cashtag before taking Cash App orders.", status: 400 };
    return {
      provider: "cashapp",
      cashtag: provider.cashtag,
      cashUrl: cashLink(provider.cashtag, totalCents)
    };
  }
  return {
    provider: "square",
    applicationId: provider.applicationId,
    locationId: provider.locationId,
    sandbox: provider.sandbox
  };
}

export function applyBrandToChannels(channels, brand) {
  return (channels || []).map((channel) => {
    const official = channel.id === "lisas-channel" || channel.isOfficial;
    const next = {
      ...channel,
      name: official ? brand.studioName : channel.name,
      handle: official ? brand.studioHandle : channel.handle,
      url: official || String(channel.url || "").includes("LisasKitchenStudio") ? brand.studioUrl : channel.url
    };
    next.videos = (channel.videos || []).map((video) => ({
      ...video,
      channel: video.channel === "Lisa's Kitchen Studio" || official && video.channel === channel.name
        ? brand.studioName
        : video.channel
    }));
    return next;
  });
}

export function orderCode(prefix) {
  const head = String(prefix || "LRB").replace(/[^A-Za-z0-9]/g, "").slice(0, 6) || "LRB";
  return `${head}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export { REGIONS, HOME_ID, brandDefaults };
