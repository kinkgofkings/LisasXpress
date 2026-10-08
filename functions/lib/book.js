import bcrypt from "bcryptjs";
import { worldCatalog, worldRecipe } from "../../server/world.js";
import { findCover, paintCover } from "../../server/cover.js";
import { browse, watchClip } from "./browse.js";
import {
  addSignal, askHost, d1Desk, deskSnapshot, ensureDesk, getCall, listSignals, listThreads,
  placeCall, readThread, searchBook, sendMessage, setCall
} from "../../server/desk.js";
import { d1Shop, listProducts, placeOrder, quoteShipping, removeProduct, saveProduct } from "../../server/shop.js";
import {
  buildPublicConfig, createHousehold, ensureTenancy, findInvite, householdForUser,
  isAdmin, loadHousehold, presentHousehold, saveHouseholdSettings, sameFamily
} from "../../server/tenancy.js";
import { applyBrandToChannels, detectRegion, quickSignInAllowed, resolveBrand } from "../../shared/white-label.js";

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "cdn-cache-control": "no-store" }
  });
}

function lines(value) {
  return String(value || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

function cuisineOf(value) {
  if (["cajun", "library", "texmex", "garden", "kids", "pets", "gym"].includes(value)) return value;
  return "texas";
}

const LISA_CHANNEL_ID = "UCOQlqCabDLlzQEzlcHfvXzg";

const VIDEO_CHANNELS = [
  {
    id: "lisas-channel",
    name: "Lisa's Kitchen Studio",
    handle: "@LisasKitchenStudio",
    tagline: "Homestyle Southern Traditions, Cajun Dark Roux & Survivor Kitchen",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: true,
    isOfficial: true,
    videos: [
      {
        id: "lisa-frito-pie",
        title: "LOADED WALKING BAG FRITO PIE",
        channel: "Lisa's Kitchen Studio",
        duration: "Quick Tutorial",
        youtube: "https://www.youtube.com/watch?v=_TwRwMX_pz0",
        thumbnail: "https://i4.ytimg.com/vi/_TwRwMX_pz0/hqdefault.jpg",
        category: "cooking",
        recipeId: "loaded-walking-bag-frito-pie",
        description: "Crunchy. Cheesy. Beefy. Legendary. Hot homemade beef chili and velvety RoTel queso ladled straight into snack-size Frito bags and loaded high with fixings."
      }
    ]
  },
  {
    id: "cooking-channel",
    name: "Southern & Cajun Kitchen Classics",
    handle: "@SouthernCajunKitchen",
    tagline: "Authentic Dark Roux, Braised Texas Comfort & Cast Iron Baking",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: false,
    videos: [
      {
        id: "curated-gumbo",
        title: "Cook Up Gumbo as Good as Grandma's",
        channel: "Smokin' & Grillin with AB",
        duration: "21:30",
        youtube: "https://www.youtube.com/watch?v=hNOG_FzUMIE",
        thumbnail: "https://img.youtube.com/vi/hNOG_FzUMIE/hqdefault.jpg",
        category: "cooking",
        recipeId: "chicken-sausage-gumbo",
        description: "Learn how to stir a deep chocolate roux, sweat the holy trinity, and simmer rich Cajun chicken and sausage gumbo to perfection."
      },
      {
        id: "curated-pot-roast",
        title: "Best Tender Chuck Pot Roast & Pan Gravy",
        channel: "Natasha's Kitchen",
        duration: "10:45",
        youtube: "https://www.youtube.com/watch?v=Go8b1Cpjr84",
        thumbnail: "https://img.youtube.com/vi/Go8b1Cpjr84/hqdefault.jpg",
        category: "cooking",
        recipeId: "sunday-pot-roast",
        description: "Fall-apart tender beef chuck roast seared and braised slow in rich red wine and beef broth with sweet carrots and tender potatoes."
      },
      {
        id: "curated-peach-cobbler",
        title: "Easy Southern Homemade Peach Cobbler",
        channel: "Preppy Kitchen",
        duration: "8:50",
        youtube: "https://www.youtube.com/watch?v=A_i71qdBnvw",
        thumbnail: "https://img.youtube.com/vi/A_i71qdBnvw/hqdefault.jpg",
        category: "cooking",
        recipeId: "peach-cobbler",
        description: "Warm, sweet spiced peaches bubbling under a golden, tender homemade biscuit crust. A true Sunday dinner staple."
      }
    ]
  },
  {
    id: "gardening-channel",
    name: "Raised Beds & Backyard Kitchen Garden",
    handle: "@KitchenGardenGuides",
    tagline: "Growing Your Own Herbs, Heirloom Tomatoes & Garden-to-Table Pickling",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: false,
    videos: [
      {
        id: "curated-raised-beds",
        title: "7 Raised Bed Gardening Hacks You'll Wish You Knew Sooner",
        channel: "Next Level Gardening",
        duration: "14:12",
        youtube: "https://www.youtube.com/watch?v=gomWBqoOzzE",
        thumbnail: "https://img.youtube.com/vi/gomWBqoOzzE/hqdefault.jpg",
        category: "gardening",
        description: "Essential raised bed tips: the best soil mixture, watering hacks, spacing vegetables, and growing fragrant kitchen herbs."
      },
      {
        id: "curated-pickling",
        title: "How to Make the Best Ever Homemade Dill Pickles",
        channel: "Better Homes and Gardens",
        duration: "6:24",
        youtube: "https://www.youtube.com/watch?v=I_bR01qzQxs",
        thumbnail: "https://img.youtube.com/vi/I_bR01qzQxs/hqdefault.jpg",
        category: "gardening",
        description: "Step-by-step garden cucumber canning: garlic dill brine, keeping your pickles crunchy, and simple water-bath processing."
      }
    ]
  },
  {
    id: "pets-channel",
    name: "The Pet Connection: Healthy Dog Meals & Treats",
    handle: "@HealthyPupsKitchen",
    tagline: "Veterinarian-Safe Cooked Dog Meals, Bone Broths & Homemade Canine Biscuits",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: false,
    videos: [
      {
        id: "curated-dog-meal",
        title: "Complete & Balanced Homemade Fresh Dog Meals",
        channel: "PetCubes Official",
        duration: "11:05",
        youtube: "https://www.youtube.com/watch?v=iP2vIXn6208",
        thumbnail: "https://img.youtube.com/vi/iP2vIXn6208/hqdefault.jpg",
        category: "pets",
        recipeId: "dog-meal-week",
        description: "Nutritionist-formulated, gentle homemade dog food with lean protein, wholesome vegetables, and natural calcium for daily health."
      },
      {
        id: "curated-dog-treats",
        title: "3 Healthy Homemade Dog Treat Recipes",
        channel: "Bigger Bolder Baking with Gemma Stafford",
        duration: "7:45",
        youtube: "https://www.youtube.com/watch?v=OpCNt3qFYpc",
        thumbnail: "https://img.youtube.com/vi/OpCNt3qFYpc/hqdefault.jpg",
        category: "pets",
        recipeId: "pumpkin-dog-biscuits",
        description: "Wholesome 3-ingredient dog treats made with pure pumpkin and dog-safe peanut butter for crunchy, tail-wagging snacks."
      }
    ]
  },
  {
    id: "survivor-channel",
    name: "Survivor Kitchen & Healing Foods",
    handle: "@SurvivorKitchen",
    tagline: "Anti-Inflammatory Broths, Restorative Comfort & Nourishing Meals",
    url: "https://www.youtube.com/@LisasKitchenStudio",
    ribbon: true,
    videos: [
      {
        id: "curated-healing-broth",
        title: "Ultimate Anti-Inflammatory Bone Broth for Gut & Immunity",
        channel: "The Doctor's Kitchen",
        duration: "12:18",
        youtube: "https://www.youtube.com/watch?v=4iswJTdV-oo",
        thumbnail: "https://img.youtube.com/vi/4iswJTdV-oo/hqdefault.jpg",
        category: "wellness",
        recipeId: "healing-bone-broth",
        description: "Nutrient-dense, slow-simmered bone broth rich in collagen, ginger, turmeric, and healing root aromatics to support recovery and gut health."
      },
      {
        id: "curated-golden-milk",
        title: "Golden Milk Recipe for Rest & Anti-Inflammation",
        channel: "Sasu Flavas",
        duration: "5:32",
        youtube: "https://www.youtube.com/watch?v=6GUhYp0cs9w",
        thumbnail: "https://img.youtube.com/vi/6GUhYp0cs9w/hqdefault.jpg",
        category: "wellness",
        description: "Warm, soothing golden turmeric milk with cinnamon and black pepper for maximum curcumin absorption, restful sleep, and comfort."
      }
    ]
  }
];

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    bio: row.bio,
    avatar: row.avatar_path,
    role: row.role || "member",
    householdId: row.household_id || "home"
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
  if (!secret) throw Object.assign(new Error("Sign-in is not set up on this book yet."), { status: 503 });
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
  const hash = typeof stored === "string" ? stored : "";
  if (!hash) return false;
  if (hash.startsWith("hmac1:")) {
    const next = await hashPassword(env, password);
    return sameBytes(new TextEncoder().encode(next), new TextEncoder().encode(hash));
  }
  if (hash.startsWith("$2")) return bcrypt.compare(password, hash);
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
    youtube: row.youtube || "",
    family: Boolean(row.family),
    authorId: row.author_id || null,
    updatedAt: row.updated_at,
    media: media.results || []
  };
}

async function savedRecipe(env, user, id, status = 200) {
  const recipe = await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first());
  const [decorated] = await decorateRecipes(env, user, [recipe]);
  return json({ recipe: decorated }, status);
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

async function storePicture(request, env, field) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return { error: json({ error: "That picture could not be read." }, 400) };
  }
  const file = form.get(field);
  if (!file || typeof file === "string") return { error: json({ error: "Choose a picture first." }, 400) };
  const type = file.type || "";
  if (!String(type).startsWith("image/")) {
    return { error: json({ error: "Use a picture." }, 400) };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.byteLength) return { error: json({ error: "That picture was empty." }, 400) };
  const path = await storeChunked(env, type, bytes, file.name);
  return { path, form };
}

async function removeStored(env, path) {
  if (!path?.startsWith("/uploads/")) return;
  await env.DB.prepare("DELETE FROM file_parts WHERE path = ?").bind(path).run();
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
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await readJson(request);
    const path = String(body.path || "");
    if (!/^\/uploads\/[\w.-]+$/.test(path)) return json({ error: "That file could not be saved." }, 400);
    const row = await env.DB.prepare("SELECT mime FROM files WHERE path = ?").bind(path).first();
    if (!row) return json({ error: "That file could not be saved." }, 400);
    const kind = String(row.mime).startsWith("video/") ? "video" : "image";
    if (url.searchParams.get("role") === "cover" && kind === "image") {
      await removeStored(env, recipe.image);
      await env.DB.prepare("UPDATE recipes SET image = ?, image_credit = ?, updated_at = ? WHERE id = ?")
        .bind(path, "Added by Lisa", new Date().toISOString(), recipe.id).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO recipe_media (recipe_id, kind, path, caption, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(recipe.id, kind, path, "", new Date().toISOString()).run();
    }
    return savedRecipe(env, user, recipe.id, 201);
  }
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "That file could not be read." }, 400);
  }
  const file = form.get("file");
  if (!file || typeof file === "string" || !file.size) return json({ error: "Choose a file first." }, 400);
  const saved = await storeUpload(env, file);
  if (saved.error) return saved.error;
  const kind = saved.meta.kind === "video" ? "video" : "image";
  if (url.searchParams.get("role") === "cover" && kind === "image") {
    await removeStored(env, recipe.image);
    await env.DB.prepare("UPDATE recipes SET image = ?, image_credit = ?, updated_at = ? WHERE id = ?")
      .bind(saved.meta.path, "Added by Lisa", new Date().toISOString(), recipe.id).run();
  } else {
    const caption = String(form.get("caption") || "").slice(0, 160);
    await env.DB.prepare(
      "INSERT INTO recipe_media (recipe_id, kind, path, caption, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(recipe.id, kind, saved.meta.path, caption, new Date().toISOString()).run();
  }
  return savedRecipe(env, user, recipe.id, 201);
}

let bookReady = null;
function prepareBook(env) {
  if (!bookReady) {
    bookReady = (async () => {
      await env.DB.prepare("ALTER TABLE comments ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'").run().catch(() => {});
      await ensureTenancy(d1Shop(env.DB), env);
    })();
  }
  return bookReady;
}

async function familyContext(request, env, body = {}) {
  const store = d1Shop(env.DB);
  const user = await userFrom(env, request);
  const household = await householdForUser(store, user);
  const url = new URL(request.url);
  const region = detectRegion({
    env,
    household,
    cf: request.cf,
    lat: body.lat ?? url.searchParams.get("lat"),
    lng: body.lng ?? url.searchParams.get("lng"),
    zip: body.zip || url.searchParams.get("zip"),
    requested: body.region || url.searchParams.get("region")
  });
  return { store, user, household, region };
}

function liveDb(env) {
  try {
    if (typeof env.DB?.withSession === "function") return env.DB.withSession("first-primary");
  } catch { /* the plain binding still reads and writes */ }
  return env.DB;
}

export async function handle(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return json({ error: "That page is not in the book." }, 404);
  let session = null;
  const bound = new Proxy(env, {
    get(target, prop, receiver) {
      if (prop === "DB") {
        if (!session) session = liveDb(target);
        return session;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  try {
    await prepareBook(bound);
    return await route(request, bound, url, parts.slice(1));
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

  if (method === "GET" && first === "health") {
    const household = await loadHousehold(d1Shop(env.DB), "home");
    return json({ ok: true, name: resolveBrand(env, household).name });
  }
  if (first === "config" && !second && method === "GET") return publicConfig(request, env);
  if (first === "locale" && !second && (method === "GET" || method === "POST")) return localeConfig(request, env);
  if (first === "household" && !second && method === "GET") return householdConfig(request, env);
  if (first === "household" && !second && method === "PATCH") return updateHousehold(request, env);

  if (first === "auth" && second === "register" && method === "POST") return register(request, env);
  if (first === "auth" && second === "quick-lisa" && method === "POST") return quickOwner(request, env);
  if (first === "auth" && second === "login" && method === "POST") return login(request, env);
  if (first === "auth" && second === "me" && method === "GET") return json({ user: publicUser(await userFrom(env, request)) });
  if (first === "auth" && second === "me" && method === "PATCH") return updateProfile(request, env);
  if (first === "auth" && second === "avatar" && method === "POST") return uploadAvatar(request, env);

  if (first === "recipes" && !second && method === "GET") return listRecipes(request, url, env);
  if (first === "recipes" && second && !third && method === "GET") return oneRecipe(request, env, second);
  if (first === "recipes" && !second && method === "POST") return createRecipe(request, env);
  if (first === "recipes" && second && !third && method === "PATCH") return updateRecipe(request, env, second);
  if (first === "recipes" && second && !third && method === "DELETE") return deleteRecipe(request, env, second);
  if (first === "recipes" && third === "media" && method === "POST") return uploadMedia(request, env, second, url);
  if (first === "recipes" && third === "media" && fourth && method === "DELETE") return deleteMedia(request, env, second, fourth);

  if (first === "notes" && !second && method === "GET") return listNotes(request, env);
  if (first === "notes" && !second && method === "POST") return createNote(request, env);
  if (first === "notes" && second && method === "PATCH") return updateNote(request, env, second);
  if (first === "notes" && second && method === "DELETE") return deleteNote(request, env, second);

  if (first === "people" && !second && method === "GET") return listPeople(request, env);
  if (first === "people" && second && !third && method === "GET") return onePerson(request, env, second);
  if (first === "people" && second && third === "follow" && method === "POST") return toggleFollow(request, env, second);
  if (first === "reactions" && !second && method === "POST") return toggleReaction(request, env);
  if (first === "comments" && !second && method === "POST") return addComment(request, env);
  if (first === "comments" && second && method === "DELETE") return deleteComment(request, env, second);

  if (first === "media" && !second && method === "POST") return startMedia(request, env);
  if (first === "media" && second === "parts" && method === "PUT") return saveMediaPart(request, env, url);

  if (first === "films" && !second && method === "POST") return startFilm(request, env);
  if (first === "films" && second === "parts" && method === "PUT") return saveFilmPart(request, env, url);

  if (first === "library" && !second && method === "GET") return listLibrary(request, env);
  if (first === "library" && !second && method === "POST") return createLibrary(request, env);
  if (first === "library" && second && method === "PATCH") return updateLibrary(request, env, second);
  if (first === "library" && second && method === "DELETE") return deleteLibrary(request, env, second);

  if (first === "world" && !second && method === "GET") return worldList(request, url, env);
  if (first === "world" && second && !third && method === "GET") return worldOne(request, env, second);
  if (first === "world" && third === "keep" && method === "POST") return worldKeep(request, env, second);

  if (first === "channels" && !second && method === "GET") return json({ channels: await brandedChannels(env) });
  if (first === "channels" && second === "sync" && method === "GET") return syncChannels(request, env);
  if (first === "channels" && second === "link-recipe" && method === "POST") return linkChannelRecipe(request, env);

  if (first === "browse" && method === "GET") return openBrowse(url);
  if (first === "watch" && method === "GET") return watchLink(url);

  if (["desk", "messages", "calls", "search", "ask"].includes(first)) return deskRoute(request, env, method, first, second, third, url);
  if (first === "shop") return shopApi(request, env, method, second, third);

  return json({ error: "That page is not in the book." }, 404);
}

function shopResult(result) {
  if (result?.error) return json({ error: result.error }, result.status || 400);
  return json(result);
}

async function shopApi(request, env, method, second, third) {
  const url = new URL(request.url);
  try {
    if (second === "products" && !third && method === "GET") {
      const ctx = await familyContext(request, env);
      return json(await listProducts(ctx.store, url.searchParams.get("category") || "all", ctx.region.id, ctx.household?.id || "home"));
    }
    if (second === "products" && method === "POST" && !third) {
      const ctx = await familyContext(request, env);
      if (!isAdmin(ctx.user)) return json({ error: "Only a family admin can change the shop." }, 403);
      return shopResult(await saveProduct(ctx.store, await readJson(request), null, ctx.household?.id || "home"));
    }
    if (second === "products" && third && method === "PATCH") {
      const ctx = await familyContext(request, env);
      if (!isAdmin(ctx.user)) return json({ error: "Only a family admin can change the shop." }, 403);
      return shopResult(await saveProduct(ctx.store, await readJson(request), third, ctx.household?.id || "home"));
    }
    if (second === "products" && third && method === "DELETE") {
      const ctx = await familyContext(request, env);
      if (!isAdmin(ctx.user)) return json({ error: "Only a family admin can change the shop." }, 403);
      const removed = await removeProduct(ctx.store, third, ctx.household?.id || "home");
      return shopResult(removed);
    }
    if (second === "shipping-estimate" && method === "POST") {
      const body = await readJson(request);
      const ctx = await familyContext(request, env, body);
      return shopResult(await quoteShipping(ctx.store, body, ctx.region));
    }
    if (second === "checkout" && method === "POST") {
      const body = await readJson(request);
      const ctx = await familyContext(request, env, body);
      return shopResult(await placeOrder(ctx.store, body, env, {
        household: ctx.household,
        region: ctx.region,
        householdId: ctx.household?.id || "home",
        brand: resolveBrand(env, ctx.household)
      }));
    }
  } catch (error) {
    return json({ error: "The shop hit a snag. Please try again." }, 500);
  }
  return json({ error: "That page is not in the book." }, 404);
}

async function publicConfig(request, env) {
  const ctx = await familyContext(request, env);
  return json(buildPublicConfig(env, ctx.household, ctx.region, ctx.user));
}

async function localeConfig(request, env) {
  const body = request.method === "POST" ? await readJson(request) : {};
  const ctx = await familyContext(request, env, body);
  return json({ locale: buildPublicConfig(env, ctx.household, ctx.region, ctx.user).locale });
}

async function householdConfig(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (!isAdmin(user)) return json({ error: "Only a family admin can open these settings." }, 403);
  return json({ household: await presentHousehold(d1Shop(env.DB), env, user.household_id || "home", true) });
}

async function updateHousehold(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (!isAdmin(user)) return json({ error: "Only a family admin can change these settings." }, 403);
  const result = await saveHouseholdSettings(d1Shop(env.DB), env, user.household_id || "home", await readJson(request));
  if (result.error) return json({ error: result.error }, result.status || 400);
  return json(result);
}

async function brandedChannels(env) {
  const household = await loadHousehold(d1Shop(env.DB), "home");
  return applyBrandToChannels(VIDEO_CHANNELS, resolveBrand(env, household));
}

async function quickOwner(request, env) {
  const household = await loadHousehold(d1Shop(env.DB), "home");
  if (!quickSignInAllowed(env, household)) return json({ error: "Quick sign-in is turned off." }, 404);
  const brand = resolveBrand(env, household);
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(brand.ownerEmail).first();
  if (!user || (user.household_id || "home") !== "home") return json({ error: "That quick sign-in is not set up." }, 404);
  return json({ token: await signToken(env, user.id), user: publicUser(user) });
}

let deskReady = null;
async function deskRoute(request, env, method, first, second, third, url) {
  if (!deskReady) {
    deskReady = ensureDesk(d1Desk(env.DB)).catch((error) => {
      deskReady = null;
      throw error;
    });
  }
  await deskReady;
  const db = d1Desk(env.DB);
  const user = await userFrom(env, request);
  const need = () => {
    if (!user) throw Object.assign(new Error("Log in first."), { status: 401 });
    return user;
  };
  try {
    if (first === "desk" && method === "GET") return json(await deskSnapshot(db, need().id));
    if (first === "messages" && !second && method === "GET") {
      const withId = url.searchParams.get("with");
      if (withId) return json(await readThread(db, need().id, withId, url.searchParams.get("after")));
      return json(await listThreads(db, need().id));
    }
    if (first === "messages" && !second && method === "POST") {
      const body = await readJson(request);
      return json({ message: await sendMessage(db, need().id, body) });
    }
    if (first === "calls" && !second && method === "POST") {
      const body = await readJson(request);
      return json(await placeCall(db, need().id, body));
    }
    if (first === "calls" && second && third === "signals" && method === "GET") {
      return json(await listSignals(db, need().id, second, url.searchParams.get("after")));
    }
    if (first === "calls" && second && third === "signals" && method === "POST") {
      const body = await readJson(request);
      return json(await addSignal(db, need().id, second, body.payload));
    }
    if (first === "calls" && second && !third && method === "GET") return json(await getCall(db, need().id, second));
    if (first === "calls" && second && !third && method === "POST") {
      const body = await readJson(request);
      return json(await setCall(db, need().id, second, body));
    }
    if (first === "search" && method === "GET") return json(await searchBook(db, user?.id || null, url.searchParams.get("q")));
    if (first === "ask" && method === "POST") {
      const body = await readJson(request);
      return json(await askHost(db, user?.id || null, body.question, env.AI));
    }
    return json({ error: "That page is not in the book." }, 404);
  } catch (error) {
    return json({ error: error.status ? error.message : "That did not work. Please try again." }, error.status || 500);
  }
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
    const store = d1Shop(env.DB);
    const invite = await findInvite(store, body.invite);
    if (String(body.invite || "").trim() && !invite) return json({ error: "That family invite code was not found." }, 404);
    const result = await env.DB.prepare(`
      INSERT INTO users (email, password_hash, name, bio, avatar_path, created_at, household_id, role)
      VALUES (?, ?, ?, '', '', ?, 'home', 'member')
    `).bind(email, await hashPassword(env, password), name, new Date().toISOString()).run();
    const userId = result.meta.last_row_id;
    if (invite) {
      await env.DB.prepare("UPDATE users SET household_id = ?, role = 'member' WHERE id = ?").bind(invite.id, userId).run();
    } else {
      await createHousehold(store, { name: `${name}'s kitchen`, ownerId: userId });
    }
    const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
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
  let ok = false;
  try {
    ok = Boolean(user) && await checkPassword(env, password, user.password_hash);
  } catch {
    throw Object.assign(new Error("Sign-in could not check that password. Try again in a moment."), { status: 503 });
  }
  if (!user || !ok) return json({ error: "That email and password do not match." }, 401);
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

async function listRecipes(request, url, env) {
  const user = await userFrom(env, request);
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
  return json({ recipes: await decorateRecipes(env, user, recipes) });
}

async function oneRecipe(request, env, id) {
  const user = await userFrom(env, request);
  const recipe = await recipeRow(env, await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first());
  if (!recipe) return json({ error: "That recipe is not in the book." }, 404);
  const [decorated] = await decorateRecipes(env, user, [recipe]);
  return json({ recipe: decorated });
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
  let image = String(body.image || "").trim();
  let imageCredit = String(body.imageCredit || "").trim();
  if (!image) {
    image = await findCover(title);
    if (image) imageCredit = "Wikimedia Commons";
  }
  if (!image) {
    const painted = await paintCover(env.AI, title);
    if (painted) {
      image = await storeChunked(env, "image/jpeg", painted, "cover.jpg");
      imageCredit = "Photograph for Lisa's Recipe Book";
    }
  }
  if (!image) return json({ error: "Add a picture of this plate before saving it." }, 400);
  const now = new Date().toISOString();
  const id = await slugify(env, title);
  const youtube = String(body.youtube || "").trim();
  await env.DB.prepare(`
    INSERT INTO recipes (
      id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
      ingredients, steps, notes, image, image_credit, source_url, source_title, youtube, family, author_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
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
    image,
    imageCredit,
    String(body.sourceUrl || "").slice(0, 500),
    String(body.sourceTitle || "").slice(0, 160),
    youtube,
    user.id,
    now,
    now
  ).run();
  return savedRecipe(env, user, id, 201);
}

async function updateRecipe(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const existing = await env.DB.prepare("SELECT * FROM recipes WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "That recipe is not in the book." }, 404);
  if (existing.author_id && String(existing.author_id) !== String(user.id)) {
    return json({ error: "Only the person who added that recipe can change it." }, 403);
  }
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
  const youtube = body.youtube != null ? String(body.youtube).trim() : (existing.youtube || "");
  await env.DB.prepare(`
    UPDATE recipes SET title=?, cuisine=?, category=?, summary=?, yield_text=?, prep_minutes=?,
      cook_minutes=?, ingredients=?, steps=?, notes=?, source_url=?, source_title=?, youtube=?, updated_at=?
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
    youtube,
    new Date().toISOString(),
    existing.id
  ).run();
  return savedRecipe(env, user, existing.id);
}

async function deleteRecipe(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const existing = await env.DB.prepare("SELECT id, author_id FROM recipes WHERE id = ?").bind(id).first();
  if (!existing) return json({ error: "That recipe is not in the book." }, 404);
  if (existing.author_id && String(existing.author_id) !== String(user.id)) {
    return json({ error: "Only the person who added that recipe can delete it." }, 403);
  }
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
  return savedRecipe(env, user, recipeId);
}

function emptySocial() {
  return { likes: 0, stars: 0, liked: false, starred: false, comments: [] };
}

function person(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, bio: row.bio || "", avatar: row.avatar_path || row.avatar || "" };
}

async function socialFor(env, user, type, ids) {
  const map = {};
  const keys = [...new Set(ids.map((id) => String(id)))].filter(Boolean);
  for (const id of keys) map[id] = emptySocial();
  for (let index = 0; index < keys.length; index += 40) {
    await fillSocial(env, user, type, keys.slice(index, index + 40), map);
  }
  return map;
}

async function fillSocial(env, user, type, keys, map) {
  if (!keys.length) return;
  const marks = keys.map(() => "?").join(",");
  const counts = await env.DB.prepare(
    `SELECT target_id AS targetId, kind, COUNT(*) AS n FROM reactions WHERE target_type = ? AND target_id IN (${marks}) GROUP BY target_id, kind`
  ).bind(type, ...keys).all();
  for (const row of counts.results || []) {
    const box = map[String(row.targetId)];
    if (!box) continue;
    if (row.kind === "like") box.likes = Number(row.n) || 0;
    if (row.kind === "star") box.stars = Number(row.n) || 0;
  }
  if (user) {
    const mine = await env.DB.prepare(
      `SELECT target_id AS targetId, kind FROM reactions WHERE user_id = ? AND target_type = ? AND target_id IN (${marks})`
    ).bind(user.id, type, ...keys).all();
    for (const row of mine.results || []) {
      const box = map[String(row.targetId)];
      if (!box) continue;
      if (row.kind === "like") box.liked = true;
      if (row.kind === "star") box.starred = true;
    }
  }
  const comments = await loadComments(env, type, keys, marks);
  for (const row of comments.results || []) {
    let attachments = [];
    try { attachments = JSON.parse(row.attachments || "[]"); } catch { attachments = []; }
    map[String(row.targetId)]?.comments.push({
      id: Number(row.id),
      body: row.body,
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: row.createdAt,
      author: { id: row.userId, name: row.name, avatar: row.avatar }
    });
  }
}

async function loadComments(env, type, keys, marks) {
  const tail = `comments.created_at AS createdAt, comments.target_id AS targetId,
            users.id AS userId, users.name AS name, users.avatar_path AS avatar
     FROM comments JOIN users ON users.id = comments.user_id
     WHERE comments.target_type = ? AND comments.target_id IN (${marks})
     ORDER BY comments.id ASC`;
  try {
    return await env.DB.prepare(
      `SELECT comments.id, comments.body, comments.attachments, ${tail}`
    ).bind(type, ...keys).all();
  } catch {
    return await env.DB.prepare(
      `SELECT comments.id, comments.body, ${tail}`
    ).bind(type, ...keys).all();
  }
}

async function reactionSnapshot(env, user, type, id) {
  const counts = await env.DB.prepare(
    "SELECT kind, COUNT(*) AS n FROM reactions WHERE target_type = ? AND target_id = ? GROUP BY kind"
  ).bind(type, id).all();
  const snap = { likes: 0, stars: 0, liked: false, starred: false };
  for (const row of counts.results || []) {
    if (row.kind === "like") snap.likes = Number(row.n) || 0;
    if (row.kind === "star") snap.stars = Number(row.n) || 0;
  }
  if (user) {
    const mine = await env.DB.prepare(
      "SELECT kind FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ?"
    ).bind(user.id, type, id).all();
    for (const row of mine.results || []) {
      if (row.kind === "like") snap.liked = true;
      if (row.kind === "star") snap.starred = true;
    }
  }
  return snap;
}

function reactionTarget(item) {
  const source = String(item.sourceUrl || item.source_url || "");
  const fromSource = source.match(/themealdb\.com\/meal\/(\d+)/);
  const mealId = fromSource?.[1] || (item.world ? String(item.mealId || item.id || "").replace(/^mealdb-/, "") : "");
  if (mealId && /^\d+$/.test(mealId)) return { type: "world", id: `mealdb-${mealId}` };
  return { type: "recipe", id: String(item.id) };
}

async function decorateRecipes(env, user, recipes) {
  const keys = recipes.map(reactionTarget);
  const [recipeSocial, worldSocial] = await Promise.all([
    socialFor(env, user, "recipe", keys.filter((key) => key.type === "recipe").map((key) => key.id)),
    socialFor(env, user, "world", keys.filter((key) => key.type === "world").map((key) => key.id))
  ]);
  const ids = [...new Set(recipes.map((item) => item.authorId).filter(Boolean))];
  const authors = {};
  if (ids.length) {
    const marks = ids.map(() => "?").join(",");
    const rows = await env.DB.prepare(`SELECT id, name, bio, avatar_path FROM users WHERE id IN (${marks})`).bind(...ids).all();
    for (const row of rows.results || []) authors[row.id] = person(row);
  }
  return recipes.map((item, index) => ({
    ...item,
    author: authors[item.authorId] || null,
    social: (keys[index].type === "world" ? worldSocial : recipeSocial)[keys[index].id] || emptySocial()
  }));
}

async function targetExists(env, type, id, user) {
  if (type === "recipe") return env.DB.prepare("SELECT id FROM recipes WHERE id = ?").bind(id).first();
  if (type === "note") {
    const note = await env.DB.prepare("SELECT id, household_id FROM notes WHERE id = ?").bind(id).first();
    if (!note || (user && (note.household_id || "home") !== (user.household_id || "home"))) return null;
    return note;
  }
  if (type === "film") return env.DB.prepare("SELECT id FROM library_items WHERE id = ? AND kind NOT IN ('tiktok', 'facebook')").bind(id).first();
  if (type === "person") {
    const personRow = await env.DB.prepare("SELECT id, household_id FROM users WHERE id = ?").bind(id).first();
    if (!personRow || (user && !sameFamily(user, personRow))) return null;
    return personRow;
  }
  if (type === "world") {
    const mealId = String(id).replace(/^mealdb-/, "");
    if (!/^\d+$/.test(mealId)) return null;
    try {
      await worldRecipe(mealId);
      return { id: `mealdb-${mealId}` };
    } catch {
      return null;
    }
  }
  return null;
}

async function listPeople(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const people = await env.DB.prepare(
    "SELECT id, name, bio, avatar_path FROM users WHERE COALESCE(household_id, 'home') = ? ORDER BY name COLLATE NOCASE"
  ).bind(user.household_id || "home").all();
  const follows = await env.DB.prepare("SELECT follower_id AS followerId, following_id AS followingId FROM follows").all();
  const rows = follows.results || [];
  const listed = people.results || [];
  const social = await socialFor(env, user, "person", listed.map((row) => row.id));
  return json({
    people: listed.map((row) => ({
      ...person(row),
      following: rows.some((item) => String(item.followerId) === String(user.id) && String(item.followingId) === String(row.id)),
      followers: rows.filter((item) => String(item.followingId) === String(row.id)).length,
      social: social[String(row.id)] || emptySocial()
    }))
  });
}

async function onePerson(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const row = await env.DB.prepare("SELECT id, name, bio, avatar_path, household_id FROM users WHERE id = ?").bind(id).first();
  if (!row || !sameFamily(user, row)) return json({ error: "That person is not in the book." }, 404);
  const follows = await env.DB.prepare("SELECT follower_id AS followerId, following_id AS followingId FROM follows WHERE following_id = ? OR follower_id = ?").bind(id, user.id).all();
  const rows = follows.results || [];
  const social = await socialFor(env, user, "person", [id]);
  return json({
    person: {
      ...person(row),
      following: rows.some((item) => String(item.followerId) === String(user.id) && String(item.followingId) === String(row.id)),
      followers: rows.filter((item) => String(item.followingId) === String(row.id)).length,
      social: social[String(row.id)] || emptySocial()
    }
  });
}

async function toggleFollow(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (String(user.id) === String(id)) return json({ error: "That is your own account." }, 400);
  const other = await env.DB.prepare("SELECT id, household_id FROM users WHERE id = ?").bind(id).first();
  if (!other || !sameFamily(user, other)) return json({ error: "That person is not in the book." }, 404);
  const existing = await env.DB.prepare("SELECT 1 AS found FROM follows WHERE follower_id = ? AND following_id = ?").bind(user.id, id).first();
  if (existing) {
    await env.DB.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").bind(user.id, id).run();
    return json({ following: false });
  }
  await env.DB.prepare("INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)").bind(user.id, id, new Date().toISOString()).run();
  return json({ following: true });
}

async function toggleReaction(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const body = await readJson(request);
  const type = String(body.targetType || "");
  const id = String(body.targetId || "");
  const kind = body.kind === "star" ? "star" : "like";
  if (!["recipe", "note", "film", "world", "person"].includes(type) || !id) return json({ error: "That could not be saved." }, 400);
  if (!await targetExists(env, type, id, user)) return json({ error: "That could not be found." }, 404);
  const existing = await env.DB.prepare(
    "SELECT 1 AS found FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND kind = ?"
  ).bind(user.id, type, id, kind).first();
  try {
    if (existing) {
      await env.DB.prepare(
        "DELETE FROM reactions WHERE user_id = ? AND target_type = ? AND target_id = ? AND kind = ?"
      ).bind(user.id, type, id, kind).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO reactions (user_id, target_type, target_id, kind, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(user.id, type, id, kind, new Date().toISOString()).run();
    }
  } catch (error) {
    if (!String(error?.message || error).includes("UNIQUE")) throw error;
  }
  const snap = await reactionSnapshot(env, user, type, id);
  return json({ on: kind === "star" ? snap.starred : snap.liked, ...snap });
}

async function addComment(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const body = await readJson(request);
  const type = String(body.targetType || "");
  const id = String(body.targetId || "");
  const text = String(body.body || "").trim().slice(0, 1000);
  const attachments = [];
  for (const item of Array.isArray(body.attachments) ? body.attachments : []) {
    const path = String(item?.path || "");
    if (!/^\/uploads\/[\w.-]+$/.test(path)) continue;
    const row = await env.DB.prepare("SELECT mime FROM files WHERE path = ?").bind(path).first();
    if (!row) continue;
    const mime = String(row.mime || "");
    attachments.push({
      path,
      mime,
      name: String(item.name || "File").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "File",
      kind: mime.startsWith("video/") ? "video" : "image"
    });
  }
  if (!["recipe", "note", "film", "world"].includes(type) || !id) return json({ error: "That comment could not be saved." }, 400);
  if (!text && !attachments.length) return json({ error: "Write a comment, or add a picture or video." }, 400);
  if (!await targetExists(env, type, id, user)) return json({ error: "That could not be found." }, 404);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "INSERT INTO comments (user_id, target_type, target_id, body, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(user.id, type, id, text, JSON.stringify(attachments), now).run();
  const inserted = await env.DB.prepare("SELECT last_insert_rowid() AS id").first();
  return json({
    comment: {
      id: Number(inserted?.id) || Number(result.meta?.last_row_id) || 0,
      body: text,
      attachments,
      createdAt: now,
      author: person(user)
    }
  }, 201);
}

async function deleteComment(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const comment = await env.DB.prepare("SELECT id, attachments FROM comments WHERE id = ? AND user_id = ?").bind(id, user.id).first();
  if (!comment) return json({ error: "That comment is not yours." }, 404);
  let attachments = [];
  try { attachments = JSON.parse(comment.attachments || "[]"); } catch { attachments = []; }
  if (Array.isArray(attachments)) {
    for (const file of attachments) await removeStored(env, file?.path);
  }
  await env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();
  return json({ ok: true });
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
    updatedAt: row.updatedAt || row.updated_at,
    author: row.authorId ? { id: row.authorId, name: row.authorName || "Family", avatar: row.authorAvatar || "" } : null
  };
}

const FILM_PART = 800_000;

function videoExt(mime) {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("quicktime")) return "mov";
  return "webm";
}

function fileExt(mime, name) {
  const known = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "application/pdf": "pdf",
    "text/plain": "txt"
  };
  if (known[mime]) return known[mime];
  const ext = String(name || "").split(".").pop()?.toLowerCase().replace(/[^\w]/g, "").slice(0, 5);
  return ext || "bin";
}

function mediaKind(mime) {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

async function storeChunked(env, mime, bytes, name) {
  const path = `/uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExt(mime, name)}`;
  await env.DB.prepare(
    "INSERT INTO files (path, mime, bytes, byte_size, part_size) VALUES (?, ?, ?, ?, ?)"
  ).bind(path, mime, new Uint8Array([0]), bytes.byteLength, FILM_PART).run();
  for (let idx = 0, offset = 0; offset < bytes.byteLength; idx += 1, offset += FILM_PART) {
    const slice = bytes.subarray(offset, Math.min(offset + FILM_PART, bytes.byteLength));
    await env.DB.prepare("INSERT INTO file_parts (path, idx, bytes) VALUES (?, ?, ?)").bind(path, idx, slice).run();
  }
  return path;
}

function cleanMediaType(mime, name) {
  let type = String(mime || "").split(";")[0].trim().toLowerCase();
  const ext = String(name || "").split(".").pop()?.toLowerCase() || "";
  if (!type || type === "application/octet-stream") {
    const guess = {
      mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/mp4",
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic",
      mp3: "audio/mpeg", m4a: "audio/mp4", pdf: "application/pdf", txt: "text/plain"
    }[ext];
    if (guess) type = guess;
  }
  return type || "application/octet-stream";
}

async function startMedia(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const body = await readJson(request);
  const name = String(body.name || "file").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "file";
  const mime = cleanMediaType(body.mime, name);
  const size = Number(body.size);
  if (!Number.isFinite(size) || size < 1) return json({ error: "That file was empty." }, 400);
  if (size > 40_000_000) return json({ error: "That video is too long for the notepad. Try a shorter clip." }, 400);
  const path = `/uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExt(mime, name)}`;
  await env.DB.prepare(
    "INSERT INTO files (path, mime, bytes, byte_size, part_size) VALUES (?, ?, ?, ?, ?)"
  ).bind(path, mime, new Uint8Array([0]), size, FILM_PART).run();
  return json({ path, partSize: FILM_PART, mime, name, kind: mediaKind(mime) }, 201);
}

async function saveMediaPart(request, env, url) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const path = String(url.searchParams.get("path") || "");
  const idx = Number(url.searchParams.get("idx"));
  if (!/^\/uploads\/[\w.-]+$/.test(path) || !Number.isInteger(idx) || idx < 0) {
    return json({ error: "That file could not be saved." }, 400);
  }
  const row = await env.DB.prepare("SELECT path FROM files WHERE path = ?").bind(path).first();
  if (!row) return json({ error: "That file could not be saved." }, 404);
  let bytes;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return json({ error: "That file could not be saved. Try again." }, 400);
  }
  if (!bytes.byteLength || bytes.byteLength > 1_000_000) {
    return json({ error: "That file could not be saved. Try again." }, 400);
  }
  try {
    await env.DB.prepare(`
      INSERT INTO file_parts (path, idx, bytes) VALUES (?, ?, ?)
      ON CONFLICT(path, idx) DO UPDATE SET bytes = excluded.bytes
    `).bind(path, idx, bytes).run();
  } catch {
    return json({ error: "That video did not save. Try a shorter clip." }, 400);
  }
  return json({ ok: true });
}

async function startFilm(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const body = await readJson(request);
  const title = String(body.title || "").trim().slice(0, 160);
  if (!title) return json({ error: "Give the film a title." }, 400);
  const mime = String(body.mime || "").split(";")[0].trim().toLowerCase();
  if (!/^video\/(mp4|webm|quicktime)$/.test(mime)) return json({ error: "Use an MP4 or WebM video." }, 400);
  const size = Number(body.size);
  if (!Number.isFinite(size) || size < 1) return json({ error: "That film was empty." }, 400);
  const path = `/uploads/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${videoExt(mime)}`;
  const description = String(body.description || "").slice(0, 5000);
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO files (path, mime, bytes, byte_size, part_size) VALUES (?, ?, ?, ?, ?)"
  ).bind(path, mime, new Uint8Array([0]), size, FILM_PART).run();
  const result = await env.DB.prepare(`
    INSERT INTO library_items (user_id, kind, title, url, description, notes, file_path, created_at)
    VALUES (?, 'film', ?, '', ?, '', ?, ?)
  `).bind(user.id, title, description, path, now).run();
  return json({ id: result.meta.last_row_id, path, partSize: FILM_PART }, 201);
}

async function saveFilmPart(request, env, url) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const path = String(url.searchParams.get("path") || "");
  const idx = Number(url.searchParams.get("idx"));
  if (!/^\/uploads\/[\w.-]+$/.test(path) || !Number.isInteger(idx) || idx < 0) {
    return json({ error: "That film could not be saved." }, 400);
  }
  const owned = await env.DB.prepare(
    "SELECT id FROM library_items WHERE file_path = ? AND user_id = ? AND kind = 'film'"
  ).bind(path, user.id).first();
  if (!owned) return json({ error: "That film is not yours." }, 404);
  let bytes;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return json({ error: "That film could not be saved. Try again." }, 400);
  }
  if (!bytes.byteLength || bytes.byteLength > 1_000_000) {
    return json({ error: "That film could not be saved. Try again." }, 400);
  }
  await env.DB.prepare(`
    INSERT INTO file_parts (path, idx, bytes) VALUES (?, ?, ?)
    ON CONFLICT(path, idx) DO UPDATE SET bytes = excluded.bytes
  `).bind(path, idx, bytes).run();
  return json({ ok: true });
}

function noteTitle(text, attachments) {
  const line = text.trim().split(/\n/)[0].slice(0, 80);
  if (line) return line;
  if (attachments.some((item) => item.kind === "video")) return "Video";
  if (attachments.some((item) => item.kind === "file")) return "File";
  return "Photo";
}

async function storeUpload(env, file) {
  const name = String(file.name || "File").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "File";
  const type = cleanMediaType(file.type, name);
  const kind = mediaKind(type);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.byteLength) return { error: json({ error: "That file was empty." }, 400) };
  const path = await storeChunked(env, type, bytes, name);
  return { meta: { path, mime: type, name, kind } };
}

async function listNotes(request, env) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const notes = await env.DB.prepare(`
    SELECT notes.id, notes.title, notes.body, notes.attachments, notes.updated_at AS updatedAt,
           notes.user_id AS authorId, users.name AS authorName, users.avatar_path AS authorAvatar
    FROM notes LEFT JOIN users ON users.id = notes.user_id
    WHERE COALESCE(notes.household_id, 'home') = ?
    ORDER BY notes.updated_at DESC
  `).bind(user.household_id || "home").all();
  const rows = (notes.results || []).map(publicNote);
  const social = await socialFor(env, user, "note", rows.map((item) => item.id));
  return json({ notes: rows.map((item) => ({ ...item, social: social[String(item.id)] || emptySocial() })) });
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
      return json({ error: "That note could not be read. Try it again." }, 400);
    }
    text = String(form.get("body") || "").slice(0, 20000);
    const files = form.getAll("file").filter((file) => file && typeof file !== "string" && file.size);
    if (!text.trim() && !files.length) return json({ error: "Write a note, or add a picture." }, 400);
    for (const file of files) {
      const saved = await storeUpload(env, file);
      if (saved.error) return saved.error;
      attachments.push(saved.meta);
    }
  } else {
    const body = await readJson(request);
    text = String(body.body || "").slice(0, 20000);
    const listed = Array.isArray(body.attachments) ? body.attachments : [];
    for (const item of listed) {
      const path = String(item?.path || "");
      if (!/^\/uploads\/[\w.-]+$/.test(path)) continue;
      const row = await env.DB.prepare("SELECT mime FROM files WHERE path = ?").bind(path).first();
      if (!row) continue;
      const mime = String(row.mime || "");
      const kind = mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : "file";
      attachments.push({
        path,
        mime,
        name: String(item.name || "File").replace(/[^\w.\- ]+/g, "").slice(0, 80) || "File",
        kind
      });
    }
    if (!text.trim() && !attachments.length) return json({ error: "Write a note, or add a picture." }, 400);
  }
  const title = noteTitle(text, attachments);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "INSERT INTO notes (user_id, title, body, attachments, updated_at, household_id) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(user.id, title, text, JSON.stringify(attachments), now, user.household_id || "home").run();
  const inserted = await env.DB.prepare("SELECT last_insert_rowid() AS id").first();
  const id = Number(inserted?.id) || Number(result.meta?.last_row_id) || 0;
  return json({
    note: {
      id,
      title,
      body: text,
      attachments,
      updatedAt: now,
      author: person(user),
      social: emptySocial()
    }
  }, 201);
}

async function updateNote(request, env, id) {
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  const noteId = Number(id);
  if (!Number.isInteger(noteId) || noteId < 1) return json({ error: "That note could not be saved." }, 400);
  const note = await env.DB.prepare(
    "SELECT id, title, body, attachments FROM notes WHERE id = ? AND user_id = ?"
  ).bind(noteId, user.id).first();
  if (!note) return json({ error: "That note is not yours." }, 404);
  const body = await readJson(request);
  const text = String(body.body ?? note.body ?? "").slice(0, 20000);
  const title = String(body.title || text.split("\n")[0] || note.title || "").trim().slice(0, 120) || "Note";
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE notes SET title = ?, body = ?, updated_at = ? WHERE id = ? AND user_id = ?"
  ).bind(title, text, updatedAt, noteId, user.id).run();
  let attachments = [];
  try { attachments = JSON.parse(note.attachments || "[]"); } catch { attachments = []; }
  if (!Array.isArray(attachments)) attachments = [];
  return json({
    note: { id: noteId, title, body: text, attachments, updatedAt, author: person(user) }
  });
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
    SELECT library_items.id, kind, title, url, description, library_items.notes, file_path AS filePath, created_at AS createdAt,
           library_items.user_id AS authorId, users.name AS authorName, users.avatar_path AS authorAvatar
    FROM library_items LEFT JOIN users ON users.id = library_items.user_id
    WHERE kind NOT IN ('tiktok', 'facebook')
    ORDER BY created_at DESC
  `).all();
  const rows = (items.results || []).map((item) => ({
    ...item,
    author: item.authorId ? { id: item.authorId, name: item.authorName || "Family", avatar: item.authorAvatar || "" } : null
  }));
  const social = await socialFor(env, user, "film", rows.map((item) => item.id));
  return json({ items: rows.map((item) => ({ ...item, social: social[String(item.id)] || emptySocial() })) });
}

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

async function createLibrary(request, env) {
  const type = request.headers.get("content-type") || "";
  const user = await userFrom(env, request);
  if (!user) return json({ error: "Sign in first." }, 401);
  if (type.includes("multipart/form-data")) return saveFilm(env, user, request);
  const body = await readJson(request);
  const title = String(body.title || "").trim().slice(0, 160);
  const link = String(body.url || "").trim();
  const kind = savedLinkKind(link);
  if (!title) return json({ error: "Give it a title." }, 400);
  if (kind === "social") return json({ error: "TikTok and Facebook stay out of the book. Use YouTube, or a video file you host." }, 400);
  if (kind !== "youtube" && kind !== "hosted") return json({ error: "Paste a YouTube link, or a video file you host that ends in .mp4 or .webm." }, 400);
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
    return json({ error: "That film could not be read. Try saving it again." }, 400);
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
  let kind = item.kind;
  if (item.kind !== "film") {
    kind = savedLinkKind(link);
    if (kind === "social") return json({ error: "TikTok and Facebook stay out of the book. Use YouTube, or a video file you host." }, 400);
    if (kind !== "youtube" && kind !== "hosted") return json({ error: "Paste a YouTube link, or a video file you host that ends in .mp4 or .webm." }, 400);
  }
  const description = String(body.description ?? item.description).slice(0, 5000);
  const notes = String(body.notes ?? item.notes).slice(0, 2000);
  const storedUrl = item.kind === "film" ? item.url : link;
  await env.DB.prepare(
    "UPDATE library_items SET kind = ?, title = ?, url = ?, description = ?, notes = ? WHERE id = ?"
  ).bind(kind, title, storedUrl, description, notes, item.id).run();
  return json({
    item: { id: item.id, kind, title, url: storedUrl, description, notes, filePath: item.file_path, createdAt: item.created_at }
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

async function withWorldSocial(env, user, meals) {
  const social = await socialFor(env, user, "world", meals.map((meal) => `mealdb-${meal.id}`));
  return meals.map((meal) => ({ ...meal, social: social[`mealdb-${meal.id}`] || emptySocial() }));
}

async function worldList(request, url, env) {
  try {
    const user = await userFrom(env, request);
    const catalog = await worldCatalog({ q: url.searchParams.get("q") || "", category: url.searchParams.get("category") || "" });
    catalog.meals = await withWorldSocial(env, user, catalog.meals || []);
    return json(catalog);
  } catch (error) {
    return json({ error: error.message || "The recipe library could not be reached." }, error.status || 502);
  }
}

async function worldOne(request, env, id) {
  try {
    const user = await userFrom(env, request);
    const recipe = await worldRecipe(id);
    const social = await socialFor(env, user, "world", [recipe.id]);
    recipe.social = social[recipe.id] || emptySocial();
    return json({ recipe });
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
      return savedRecipe(env, user, existing.id);
    }
    let image = recipe.image || "";
    let imageCredit = recipe.imageCredit || "";
    if (!image) {
      image = await findCover(recipe.title);
      if (image) imageCredit = "Wikimedia Commons";
    }
    if (!image) {
      const painted = await paintCover(env.AI, recipe.title);
      if (painted) {
        image = await storeChunked(env, "image/jpeg", painted, "cover.jpg");
        imageCredit = "Photograph for Lisa's Recipe Book";
      }
    }
    if (!image) return json({ error: "That plate needs a picture before it can be kept." }, 400);
    const now = new Date().toISOString();
    const id = await slugify(env, recipe.title);
    await env.DB.prepare(`
      INSERT INTO recipes (
        id, title, cuisine, category, summary, yield_text, prep_minutes, cook_minutes,
        ingredients, steps, notes, image, image_credit, source_url, source_title, family, author_id,
        created_at, updated_at
      ) VALUES (?, ?, 'library', ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).bind(
      id, recipe.title, recipe.category, recipe.summary, recipe.yieldText,
      JSON.stringify(recipe.ingredients), JSON.stringify(recipe.steps), recipe.notes,
      image, imageCredit, recipe.sourceUrl, recipe.sourceTitle, user.id, now, now
    ).run();
    return savedRecipe(env, user, id, 201);
  } catch (error) {
    return json({ error: error.message || "That plate could not be kept." }, error.status || 502);
  }
}

async function watchLink(requestUrl) {
  try {
    return json(await watchClip(String(requestUrl.searchParams.get("url") || "")));
  } catch (error) {
    return json({ error: error.message || "That video could not be opened." }, error.status || 502);
  }
}

async function openBrowse(url) {
  try {
    return json(await browse(String(url.searchParams.get("url") || "")));
  } catch (error) {
    return json({ error: error.status ? error.message : "That page could not be opened." }, error.status || 500);
  }
}

async function syncChannels(request, env) {
  try {
    const feedRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${LISA_CHANNEL_ID}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000)
    });
    if (feedRes.ok) {
      const xml = await feedRes.text();
      const entries = xml.split("<entry>").slice(1);
      const lisaChannel = VIDEO_CHANNELS.find(c => c.id === "lisas-channel");
      if (lisaChannel) {
        for (const entry of entries) {
          const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
          const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
          const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
          const thumbMatch = entry.match(/<media:thumbnail url="([^"]+)"/);
          if (videoIdMatch && titleMatch) {
            const vId = videoIdMatch[1];
            const exists = lisaChannel.videos.some(v => (v.youtube || "").includes(vId));
            if (!exists) {
              lisaChannel.videos.unshift({
                id: `lisa-${vId}`,
                title: titleMatch[1].trim(),
                channel: "Lisa's Kitchen Studio",
                duration: "YouTube Video",
                youtube: `https://www.youtube.com/watch?v=${vId}`,
                thumbnail: thumbMatch ? thumbMatch[1] : `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
                category: "cooking",
                description: descMatch ? descMatch[1].trim() : ""
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("YouTube sync notice:", err);
  }
  return json({ channels: VIDEO_CHANNELS });
}

async function linkChannelRecipe(request, env) {
  const body = await readJson(request);
  const link = String(body.url || "").trim();
  const title = String(body.title || "Lisa's Video Tutorial").trim();
  const recId = String(body.recipeId || "").trim();
  const notes = String(body.notes || "").trim();

  let ytId = "";
  try {
    const parsed = new URL(link);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") ytId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      ytId = parsed.searchParams.get("v") || (parsed.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/) || [])[1] || "";
    }
  } catch {}

  const isYt = Boolean(ytId);
  const videoObj = {
    id: `lisa-${ytId || Date.now()}`,
    title,
    channel: "Lisa's Kitchen Studio",
    duration: isYt ? "YouTube Tutorial" : "Uploaded Video",
    youtube: isYt ? link : "",
    url: isYt ? "" : link,
    thumbnail: ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "/images/garden-to-table.jpg",
    category: "cooking",
    recipeId: recId || undefined,
    description: notes || "Featured video from Lisa's Kitchen Studio."
  };

  const lisaChannel = VIDEO_CHANNELS.find(c => c.id === "lisas-channel");
  if (lisaChannel) {
    const exists = lisaChannel.videos.some(v => (v.youtube && (v.youtube.includes(ytId || link))) || (v.url && v.url === link));
    if (!exists) lisaChannel.videos.unshift(videoObj);
  }

  if (recId) {
    try {
      if (isYt) {
        await env.DB.prepare("UPDATE recipes SET youtube = ?, updated_at = ? WHERE id = ?").bind(link, new Date().toISOString(), recId).run();
      } else if (link) {
        await env.DB.prepare("INSERT INTO recipe_media (recipe_id, kind, path, caption, created_at) VALUES (?, 'video', ?, ?, ?)")
          .bind(recId, link, title, new Date().toISOString()).run();
      }
    } catch (e) {
      console.warn("Recipe link update notice:", e);
    }
  }

  return json({ ok: true, video: videoObj, channels: VIDEO_CHANNELS });
}
