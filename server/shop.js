import {
  cashLink as cashPayLink, checkoutPlan, chargeSquare, fillCopy, regionById, regionProducts,
  resolveBrand, resolvePayments, squareAccessToken, zoneForZip
} from "../shared/white-label.js";

export const SHOP_CATEGORIES = [
  ["all", "All"],
  ["meals", "Mom's Meals"],
  ["desserts", "Desserts"],
  ["treats", "Doggie Treats"],
  ["accessories", "Cooking Accessories"],
  ["spices", "Signature Spice Blends"],
  ["errands", "Local Errands (Lubbock / Wolfforth)"]
];

const TABLES = [
  `CREATE TABLE IF NOT EXISTS shop_products (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    blurb TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    sale_cents INTEGER,
    ribbon TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    stock TEXT NOT NULL DEFAULT 'in',
    featured INTEGER NOT NULL DEFAULT 0,
    weight_oz INTEGER NOT NULL DEFAULT 16,
    local_only INTEGER NOT NULL DEFAULT 0,
    age_restricted INTEGER NOT NULL DEFAULT 0,
    variants_json TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS shop_orders (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    zip TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL,
    runner TEXT NOT NULL DEFAULT '',
    items_json TEXT NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    total_cents INTEGER NOT NULL,
    age_ok INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    note TEXT NOT NULL DEFAULT ''
  )`
];

const SEED = [
  item("pulled-pork-plate", "Slow-Smoked Texas Pulled Pork Plate", "Pork smoked low and slow, chopped, and set on the plate with two family sides. Cooked in Mom's kitchen for a Lubbock or Wolfforth porch.", "meals", 1800, null, "HOT BUY", "/images/shop-pulled-pork.jpg", 1, 32, 1, 0, [], 1),
  item("sunday-pot-roast", "Sunday Pot Roast & Root Veggies Bowl", "A chuck roast cooked until it falls apart, with carrots and potatoes from the same pot. A Sunday bowl, delivered warm around town.", "meals", 1600, null, "", "/images/sunday-pot-roast.jpg", 0, 36, 1, 0, [], 2),
  item("buttermilk-chicken-supper", "Southern Fried Buttermilk Chicken Supper", "Chicken soaked in buttermilk, fried crisp, and plated like supper at the house. Local delivery while it is still hot.", "meals", 1700, null, "NEW BATCH", "/images/shop-fried-chicken.jpg", 0, 34, 1, 0, [], 3),
  item("hatch-chile-enchiladas", "Creamy Hatch Chile Chicken Enchiladas", "Rolled chicken enchiladas under a creamy Hatch chile sauce. A pan portion for the table, not a shipping box.", "meals", 1500, 1300, "PRICE DROP", "/images/cheese-enchiladas.jpg", 0, 30, 1, 0, [], 4),
  item("peach-blackberry-cobbler", "Cast-Iron Peach & Blackberry Cobbler", "Fruit bubbling under a cast-iron crust. Sweet, tart, and meant to be eaten the day it leaves the kitchen.", "desserts", 2800, null, "HOT BUY", "/images/peach-cobbler.jpg", 1, 40, 1, 0, [
    variant("half", "Half pan", 1800, 24),
    variant("full", "Full pan", 2800, 40)
  ], 5),
  item("southern-pecan-pie", "Mom's Signature Southern Pecan Pie", "A whole pecan pie with the syrup set and the nuts toasted. Slice it after it rests.", "desserts", 2600, null, "", "/images/pecan-pie.jpg", 0, 36, 1, 0, [], 6),
  item("chocolate-brownie-pan", "Triple Chocolate Fudge Brownie Pan", "A deep pan of fudgy chocolate squares. Rich enough to share, or not.", "desserts", 2400, null, "NEW BATCH", "/images/shop-brownies.jpg", 0, 32, 1, 0, [
    variant("half-dozen", "Half dozen", 1400, 16),
    variant("dozen", "Full dozen", 2400, 32)
  ], 7),
  item("strawberry-shortcake", "Homemade Strawberry Shortcake Slices", "Soft cake, sugared berries, and a cloud of cream. Sold by the slice for the same day.", "desserts", 700, null, "", "/images/shop-shortcake.jpg", 0, 10, 1, 0, [
    variant("two", "Two slices", 1200, 18),
    variant("four", "Four slices", 2200, 32)
  ], 8),
  item("pumpkin-crunchies", "Peanut Butter & Pumpkin Canine Crunchies", "A dog treat of plain peanut butter, pumpkin, and oat. No xylitol, chocolate, onion, or garlic. A treat, not the whole supper.", "treats", 1200, null, "", "/images/pumpkin-dog-biscuits.jpg", 0, 12, 0, 0, [
    variant("small", "Small bag", 1200, 8),
    variant("bulk", "Bulk pack", 2200, 20)
  ], 9),
  item("marrow-biscuits", "Smoked Beef Marrow Biscuits", "Beef biscuits for a dog who likes a smoky chew. No onion, garlic, salt, or xylitol. A treat, not a meal.", "treats", 1400, null, "NEW BATCH", "/images/shop-marrow-biscuits.jpg", 0, 14, 0, 0, [
    variant("small", "Small bag", 1400, 8),
    variant("bulk", "Bulk pack", 2600, 22)
  ], 10),
  item("sweet-potato-chews", "Sweet Potato & Bacon Chews", "Sweet potato with a little plain cooked pork. No onion, garlic, or xylitol. Ask the vet before a dog's food changes.", "treats", 1500, null, "", "/images/sweet-potato-dog-coins.jpg", 0, 12, 0, 0, [
    variant("small", "Small bag", 1500, 8),
    variant("bulk", "Bulk pack", 2800, 20)
  ], 11),
  item("lone-star-bark", "Lone Star Bark Brisket & Steak Rub", "Salt, pepper, and a warm chili heat for brisket and steak. Dry rub in a jar, ready to ship or drop off.", "spices", 1400, null, "HOT BUY", "/images/shop-brisket-rub.jpg", 1, 8, 0, 0, [
    variant("4oz", "4 oz", 1000, 6),
    variant("8oz", "8 oz", 1400, 10),
    variant("16oz", "16 oz", 2200, 18)
  ], 12),
  item("bayou-gold", "Bayou Gold All-Purpose Cajun Seasoning", "A family Cajun shake for rice, greens, and the pot. Dry seasoning that ships well.", "spices", 1200, null, "", "/images/shop-cajun-seasoning.jpg", 0, 8, 0, 0, [
    variant("4oz", "4 oz", 900, 6),
    variant("8oz", "8 oz", 1200, 10)
  ], 13),
  item("hill-country-dust", "Smoky Hill Country Poultry & Pork Dust", "Smoke and a little sweetness for chicken and pork. Keep the jar by the skillet.", "spices", 1200, null, "", "/images/shop-poultry-dust.jpg", 0, 8, 0, 0, [
    variant("4oz", "4 oz", 900, 6),
    variant("8oz", "8 oz", 1200, 10)
  ], 14),
  item("rib-glaze-mix", "Mom's Secret Sweet & Spicy Rib Glaze Mix", "A dry mix you stir into the glaze at home. Sweet, warm, and meant for ribs.", "spices", 1100, 900, "PRICE DROP", "/images/shop-rib-glaze.jpg", 0, 8, 0, 0, [
    variant("jar", "One jar", 900, 8)
  ], 15),
  item("kitchen-apron", "Embroidered {{shortName}} Canvas Apron", "A heavyweight canvas apron with {{studioName}} stitched on the bib. A gift from the same book as the recipes.", "accessories", 3800, null, "NEW BATCH", "/images/shop-apron.jpg", 1, 18, 0, 0, [], 16),
  item("mesquite-board", "Handcrafted Solid Mesquite Cutting Board", "A solid mesquite board for the Texas table. Oil it, and let it live by the stove.", "accessories", 6400, null, "", "/images/shop-mesquite-board.jpg", 0, 48, 0, 0, [], 17),
  item("seasoning-kit", "Cast-Iron Seasoning Care Kit & Scrub", "Oil and a scrub so the skillet stays black and smooth. A small kit that ships anywhere.", "accessories", 2200, null, "", "/images/shop-cast-iron-kit.jpg", 0, 16, 0, 0, [], 18),
  item("laredo-taco-pack", "Laredo Taco Co. Fresh MTO 3-Taco Breakfast Pack", "A made-to-order Stripes run for Lubbock or Wolfforth. Three breakfast tacos and the salsa trio, picked up fresh.", "errands", 1499, null, "HOT BUY", "/images/shop-breakfast-tacos.jpg", 1, 18, 1, 0, [
    variant("pack", "3-taco breakfast pack", 1499, 18)
  ], 19),
  item("stripes-breakfast", "Stripes Breakfast", "Made to order at Laredo Taco Company inside Stripes. Prices are the usual counter price. Write any special details before you add it.", "errands", 199, null, "", "/images/shop-breakfast-tacos.jpg", 0, 8, 1, 0, [
    variant("potato-egg", "Potato and egg taco", 199, 6),
    variant("bean-cheese", "Bean and cheese taco", 199, 6),
    variant("bacon-egg", "Bacon and egg taco", 249, 7),
    variant("sausage-egg", "Sausage and egg taco", 249, 7),
    variant("chorizo-egg", "Chorizo and egg taco", 269, 7),
    variant("barbacoa-egg", "Barbacoa and egg taco", 299, 8),
    variant("guisada-egg", "Carne guisada and egg taco", 299, 8),
    variant("picadillo-egg", "Picadillo and egg taco", 279, 7),
    variant("q-taco", "Famous Q-Taco", 399, 8),
    variant("breakfast-burrito", "Potato, egg, and cheese burrito", 449, 12)
  ], 20),
  item("stripes-lunch", "Stripes Lunch", "Lunch from the Laredo Taco Company counter at Stripes. Tacos, a gordita, a burrito, or a quesadilla, picked up fresh.", "errands", 249, null, "", "/images/shop-stripes-lunch.jpg", 0, 8, 1, 0, [
    variant("beef-fajita", "Beef fajita taco", 329, 8),
    variant("chicken-fajita", "Chicken fajita taco", 329, 8),
    variant("guisada", "Carne guisada taco", 329, 8),
    variant("picadillo", "Picadillo taco", 299, 7),
    variant("crispy-beef", "Crispy beef taco", 249, 7),
    variant("crispy-chicken", "Crispy chicken taco", 249, 7),
    variant("bean-cheese", "Bean and cheese taco", 199, 6),
    variant("gordita", "Beef gordita", 349, 9),
    variant("burrito", "Fajita burrito", 649, 14),
    variant("quesadilla", "Cheese quesadilla", 499, 10)
  ], 21),
  item("stripes-dinner", "Stripes Dinner", "A hot plate from the Stripes counter for supper. Rice, beans, and the meat you pick, brought to a Lubbock or Wolfforth door.", "errands", 749, null, "", "/images/shop-stripes-dinner.jpg", 0, 20, 1, 0, [
    variant("beef-plate", "Beef fajita plate", 999, 22),
    variant("chicken-plate", "Chicken fajita plate", 999, 22),
    variant("guisada-plate", "Carne guisada plate", 899, 20),
    variant("taco-plate", "Three crispy taco plate", 749, 18),
    variant("burrito-plate", "Burrito plate with rice and beans", 849, 20)
  ], 22),
  item("stripes-drinks", "Stripes Drinks", "Fountain drinks, coffee, tea, and water from Stripes. Beer, malt, and wine need a 21+ ID at the door.", "errands", 149, null, "", "/images/shop-stripes-drinks.jpg", 0, 16, 1, 0, [
    variant("fountain-sm", "Small fountain drink", 149, 12),
    variant("fountain-md", "Medium fountain drink", 179, 16),
    variant("fountain-lg", "Large fountain drink", 199, 20),
    variant("coffee", "Coffee", 149, 12),
    variant("tea", "Iced tea", 149, 16),
    variant("water", "Bottled water", 179, 16),
    variant("energy", "Energy drink", 329, 12),
    variant("beer", "Domestic beer (21+ ID at the door)", 249, 12, true),
    variant("import", "Import beer (21+ ID at the door)", 349, 12, true),
    variant("six", "Domestic 6-pack (21+ ID at the door)", 999, 72, true),
    variant("malt", "Malt beverage (21+ ID at the door)", 329, 12, true),
    variant("wine", "Single-serve wine (21+ ID at the door)", 499, 12, true)
  ], 23),
  item("stripes-sweets", "Stripes Sweets", "A churro, a cookie, a cinnamon roll, candy, or an ice cream bar from the Stripes counter.", "errands", 129, null, "", "/images/shop-stripes-sweets.jpg", 0, 4, 1, 0, [
    variant("churro", "Churro", 149, 3),
    variant("cookie", "Chocolate chip cookie", 129, 3),
    variant("roll", "Cinnamon roll", 199, 5),
    variant("candy", "Candy bar", 219, 2),
    variant("ice-cream", "Ice cream bar", 249, 4)
  ], 24),
  item("stripes-snacks", "Stripes Snacks", "Chips, nachos, jerky, roller-grill bites, a hot dog, or nuts from Stripes.", "errands", 189, null, "", "/images/shop-stripes-snacks.jpg", 0, 6, 1, 0, [
    variant("chips", "Bag of chips", 189, 3),
    variant("nachos", "Nachos with cheese", 299, 8),
    variant("jerky", "Beef jerky", 499, 3),
    variant("taquitos", "Two roller-grill taquitos", 249, 6),
    variant("hot-dog", "Hot dog", 199, 6),
    variant("nuts", "Roasted nuts", 249, 4)
  ], 25),
  item("convenience-errand", "Custom Errand", "Leroy or Rex can pick up a prescription, cigarettes, beer, or other alcohol in Lubbock or Wolfforth. The price on each line is the runner's trip, not the store price. Type what to pick up in the box on that line. Cigarettes and alcohol need a 21+ ID at the door.", "errands", 800, null, "", "/images/shop-errand.jpg", 0, 8, 1, 0, [
    variant("meds", "Prescription pickup", 800, 8),
    variant("smokes", "Cigarettes", 1000, 4, true),
    variant("beer", "Beer", 1200, 16, true),
    variant("alcohol", "Wine or other alcohol", 1200, 16, true)
  ], 26)
];

function item(id, title, blurb, category, priceCents, saleCents, ribbon, image, featured, weightOz, localOnly, ageRestricted, variants, sort) {
  return { id, title, blurb, category, priceCents, saleCents, ribbon, image, featured, weightOz, localOnly, ageRestricted, variants, sort };
}

function variant(id, label, priceCents, weightOz, age = false) {
  return { id, label, priceCents, weightOz, age };
}

export function money(cents) {
  const n = Math.max(0, Math.round(Number(cents) || 0));
  return `$${(n / 100).toFixed(2)}`;
}

export function cashLink(totalCents, cashtag) {
  const tag = cashtag || resolvePayments().providers.find((provider) => provider.id === "cashapp")?.cashtag;
  return cashPayLink(tag, totalCents);
}

export function localCity(zip, region = regionById("tx")) {
  return zoneForZip(region, zip)?.city || "";
}

export function estimateFee({ zip, weightOz, mode, localOnly, region }) {
  const active = region || regionById("tx");
  const clean = String(zip || "").replace(/\D/g, "").slice(0, 5);
  const pounds = Math.max(0.5, (Number(weightOz) || 16) / 16);
  const zone = zoneForZip(active, clean);
  if (mode === "local" || localOnly) {
    if (!zone) return { ok: false, error: active?.deliveryNote || "That ZIP is outside local delivery." };
    const extra = Math.max(0, Math.ceil(pounds - 3)) * 150;
    return { ok: true, cents: Number(zone.feeCents || 0) + extra, label: `${zone.city} delivery`, city: zone.city, zip: clean };
  }
  if (!/^\d{5}$/.test(clean)) return { ok: false, error: "Enter a 5-digit ZIP code for the shipping estimate." };
  const n = Number(clean);
  let base = 1200;
  let perLb = 100;
  if (n >= 73301 && n <= 79999) {
    base = 700;
    perLb = 50;
  } else if ((n >= 70000 && n <= 73299) || (n >= 80000 && n <= 88499)) {
    base = 1000;
    perLb = 75;
  }
  return {
    ok: true,
    cents: base + Math.max(0, Math.ceil(pounds - 1)) * perLb,
    label: "Nationwide shipping",
    city: "",
    zip: clean
  };
}

function bound(db, sql, params) {
  const stmt = db.prepare(sql);
  return params.length ? stmt.bind(...params) : stmt;
}

export function d1Shop(DB) {
  return {
    async all(sql, ...params) {
      const out = await bound(DB, sql, params).all();
      return out.results || [];
    },
    async get(sql, ...params) {
      return bound(DB, sql, params).first();
    },
    async run(sql, ...params) {
      await bound(DB, sql, params).run();
    },
    async tables() {
      for (const sql of TABLES) await DB.prepare(sql).run();
    }
  };
}

export function sqliteShop(db) {
  return {
    async all(sql, ...params) {
      return db.prepare(sql).all(...params);
    },
    async get(sql, ...params) {
      return db.prepare(sql).get(...params) || null;
    },
    async run(sql, ...params) {
      db.prepare(sql).run(...params);
    },
    async tables() {
      db.exec(TABLES.join(";\n"));
    }
  };
}

function publicProduct(row) {
  if (!row) return null;
  let variants = [];
  try { variants = JSON.parse(row.variants_json || "[]"); } catch { variants = []; }
  if (!Array.isArray(variants)) variants = [];
  return {
    id: row.id,
    title: row.title,
    blurb: row.blurb,
    category: row.category,
    priceCents: Number(row.price_cents) || 0,
    saleCents: row.sale_cents == null ? null : Number(row.sale_cents),
    ribbon: row.ribbon || "",
    image: row.image || "",
    stock: row.stock || "in",
    featured: Boolean(row.featured),
    weightOz: Number(row.weight_oz) || 16,
    localOnly: Boolean(row.local_only),
    ageRestricted: Boolean(row.age_restricted),
    region: row.region_id || "",
    householdId: row.household_id || "home",
    variants: variants.map((entry) => ({
      id: String(entry.id || ""),
      label: String(entry.label || ""),
      priceCents: Number(entry.priceCents) || 0,
      weightOz: Number(entry.weightOz) || Number(row.weight_oz) || 16,
      age: Boolean(entry.age)
    })).filter((entry) => entry.id && entry.label)
  };
}

const PICTURES = {
  "pulled-pork-plate": "/images/shop-pulled-pork.jpg",
  "sunday-pot-roast": "/images/sunday-pot-roast.jpg",
  "buttermilk-chicken-supper": "/images/shop-fried-chicken.jpg",
  "hatch-chile-enchiladas": "/images/cheese-enchiladas.jpg",
  "peach-blackberry-cobbler": "/images/peach-cobbler.jpg",
  "southern-pecan-pie": "/images/pecan-pie.jpg",
  "pumpkin-crunchies": "/images/pumpkin-dog-biscuits.jpg",
  "sweet-potato-chews": "/images/sweet-potato-dog-coins.jpg",
  "chocolate-brownie-pan": "/images/shop-brownies.jpg",
  "strawberry-shortcake": "/images/shop-shortcake.jpg",
  "marrow-biscuits": "/images/shop-marrow-biscuits.jpg",
  "lone-star-bark": "/images/shop-brisket-rub.jpg",
  "bayou-gold": "/images/shop-cajun-seasoning.jpg",
  "hill-country-dust": "/images/shop-poultry-dust.jpg",
  "rib-glaze-mix": "/images/shop-rib-glaze.jpg",
  "kitchen-apron": "/images/shop-apron.jpg",
  "mesquite-board": "/images/shop-mesquite-board.jpg",
  "seasoning-kit": "/images/shop-cast-iron-kit.jpg",
  "laredo-taco-pack": "/images/shop-breakfast-tacos.jpg",
  "stripes-breakfast": "/images/shop-breakfast-tacos.jpg",
  "stripes-lunch": "/images/shop-stripes-lunch.jpg",
  "stripes-dinner": "/images/shop-stripes-dinner.jpg",
  "stripes-drinks": "/images/shop-stripes-drinks.jpg",
  "stripes-sweets": "/images/shop-stripes-sweets.jpg",
  "stripes-snacks": "/images/shop-stripes-snacks.jpg",
  "convenience-errand": "/images/shop-errand.jpg"
};

const MENU_REFRESH = new Set([
  "laredo-taco-pack",
  "stripes-breakfast",
  "stripes-lunch",
  "stripes-dinner",
  "stripes-drinks",
  "stripes-sweets",
  "stripes-snacks",
  "convenience-errand",
  "sheetz-breakfast",
  "sheetz-lunch",
  "sheetz-drinks",
  "sheetz-snacks",
  "sheetz-errand",
  "kitchen-apron"
]);

async function fillShopPictures(store) {
  for (const [id, image] of Object.entries(PICTURES)) {
    await store.run("UPDATE shop_products SET image = ? WHERE id = ? AND (image IS NULL OR image = '')", image, id);
  }
}

function serviceCatalog() {
  const brand = resolveBrand();
  const located = new Map(regionProducts().filter((product) => product.region).map((product) => [product.id, product.region]));
  const seeded = SEED.map((product) => ({
    ...product,
    region: product.region || located.get(product.id) || "",
    title: fillCopy(product.title, brand),
    blurb: fillCopy(product.blurb, brand)
  }));
  const extras = regionProducts().filter((product) => product.title).map((product) => ({
    ...product,
    title: fillCopy(product.title, brand),
    blurb: fillCopy(product.blurb, brand),
    variants: product.variants || [],
    region: product.region || ""
  }));
  const seen = new Set(seeded.map((product) => product.id));
  return seeded.concat(extras.filter((product) => !seen.has(product.id)));
}

async function insertProduct(store, product, now) {
  await store.run(
    `INSERT INTO shop_products (
      id, title, blurb, category, price_cents, sale_cents, ribbon, image, stock, featured,
      weight_oz, local_only, age_restricted, variants_json, sort_order, active, updated_at, region_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in', ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    product.id, product.title, product.blurb, product.category, product.priceCents, product.saleCents,
    product.ribbon, product.image, product.featured ? 1 : 0, product.weightOz, product.localOnly ? 1 : 0,
    product.ageRestricted ? 1 : 0, JSON.stringify(product.variants || []), product.sort, now, product.region || ""
  );
}

async function ensureMenu(store) {
  const now = new Date().toISOString();
  for (const product of serviceCatalog()) {
    const existing = await store.get("SELECT id FROM shop_products WHERE id = ?", product.id);
    if (!existing) {
      await insertProduct(store, product, now);
      continue;
    }
    if (product.region) {
      await store.run("UPDATE shop_products SET region_id = ? WHERE id = ? AND (region_id IS NULL OR region_id = '')", product.region, product.id);
    }
    if (!MENU_REFRESH.has(product.id)) continue;
    await store.run(
      `UPDATE shop_products SET
        title = ?, blurb = ?, category = ?, price_cents = ?, sale_cents = ?, ribbon = ?, image = ?,
        weight_oz = ?, local_only = ?, age_restricted = ?, variants_json = ?, sort_order = ?, region_id = ?, active = 1, updated_at = ?
       WHERE id = ?`,
      product.title, product.blurb, product.category, product.priceCents, product.saleCents, product.ribbon, product.image,
      product.weightOz, product.localOnly ? 1 : 0, product.ageRestricted ? 1 : 0, JSON.stringify(product.variants || []),
      product.sort, product.region || "", now, product.id
    );
  }
}

export async function readyShop(store) {
  await store.tables();
  for (const sql of [
    "ALTER TABLE shop_products ADD COLUMN region_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE shop_products ADD COLUMN household_id TEXT NOT NULL DEFAULT 'home'",
    "ALTER TABLE shop_orders ADD COLUMN household_id TEXT NOT NULL DEFAULT 'home'",
    "ALTER TABLE shop_orders ADD COLUMN payment_provider TEXT NOT NULL DEFAULT ''"
  ]) {
    try { await store.run(sql); } catch { /* the column is already there */ }
  }
  const row = await store.get("SELECT COUNT(*) AS n FROM shop_products");
  if (Number(row?.n) === 0) {
    const now = new Date().toISOString();
    for (const product of serviceCatalog()) await insertProduct(store, product, now);
  }
  await fillShopPictures(store);
  await ensureMenu(store);
}

export async function listProducts(store, category = "all", regionId = "tx", householdId = "home") {
  await readyShop(store);
  const rows = await store.all("SELECT * FROM shop_products WHERE active = 1 ORDER BY sort_order, title");
  const active = regionById(regionId) || regionById("tx");
  const family = householdId || "home";
  const products = rows.map(publicProduct).filter((product) => {
    const owner = product.householdId || "home";
    if (owner !== "home" && owner !== family) return false;
    if (product.category !== "errands") return true;
    return (product.region || "tx") === active.id;
  });
  const name = String(category || "all");
  return {
    region: active.id,
    chain: active.chain,
    categories: SHOP_CATEGORIES.map(([id, label]) => ({
      id,
      label: id === "errands" ? active.errandLabel : label
    })),
    products: name === "all" ? products : products.filter((product) => product.category === name)
  };
}

function dollarsToCents(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function cleanVariants(value) {
  const rows = Array.isArray(value) ? value : String(value || "").split("\n");
  return rows.map((entry) => {
    if (entry && typeof entry === "object") {
      const label = String(entry.label || "").trim().slice(0, 80);
      return {
        id: String(entry.id || entry.label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24),
        label,
        priceCents: Number(entry.priceCents) || dollarsToCents(entry.price) || 0,
        weightOz: Number(entry.weightOz) || 0,
        age: Boolean(entry.age) || /21\+/.test(label)
      };
    }
    const [label, price, weight] = String(entry || "").split("|").map((part) => part.trim());
    return {
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24),
      label,
      priceCents: dollarsToCents(price) || 0,
      weightOz: Number(weight) || 0,
      age: /21\+/.test(label)
    };
  }).filter((entry) => entry.label && entry.priceCents > 0);
}

export async function saveProduct(store, body, id, householdId = "home") {
  await readyShop(store);
  const family = householdId || "home";
  const title = String(body.title || "").trim().slice(0, 120);
  const blurb = String(body.blurb || body.description || "").trim().slice(0, 2000);
  const category = SHOP_CATEGORIES.some(([key]) => key === body.category) ? body.category : "";
  const priceCents = dollarsToCents(body.priceCents != null && body.price == null ? Number(body.priceCents) / 100 : body.price);
  if (title.length < 2) return { error: "Add the item name.", status: 400 };
  if (!category || category === "all") return { error: "Pick a shop category.", status: 400 };
  if (!priceCents) return { error: "Add a price.", status: 400 };
  const saleRaw = String(body.sale ?? body.salePrice ?? "").trim();
  const saleCents = saleRaw ? dollarsToCents(saleRaw) : null;
  const variants = cleanVariants(body.variants);
  const now = new Date().toISOString();
  const productId = String(id || body.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "item");
  const existing = await store.get("SELECT id, image, household_id FROM shop_products WHERE id = ?", productId);
  if (existing && (existing.household_id || "home") !== family) {
    return { error: "That item belongs to another family.", status: 403 };
  }
  const image = String(body.image || existing?.image || "").trim().slice(0, 300);
  const fields = [
    title, blurb, category, priceCents, saleCents, String(body.ribbon || "").trim().slice(0, 24), image,
    ["in", "low", "out"].includes(body.stock) ? body.stock : "in",
    body.featured ? 1 : 0, Math.max(1, Number(body.weightOz) || 16), body.localOnly ? 1 : 0,
    body.ageRestricted ? 1 : 0, JSON.stringify(variants), now, productId
  ];
  if (existing) {
    await store.run(
      `UPDATE shop_products SET title = ?, blurb = ?, category = ?, price_cents = ?, sale_cents = ?, ribbon = ?, image = ?,
       stock = ?, featured = ?, weight_oz = ?, local_only = ?, age_restricted = ?, variants_json = ?, updated_at = ? WHERE id = ?`,
      ...fields
    );
  } else {
    const sortRow = await store.get("SELECT COALESCE(MAX(sort_order), 0) AS n FROM shop_products");
    await store.run(
      `INSERT INTO shop_products (
        title, blurb, category, price_cents, sale_cents, ribbon, image, stock, featured, weight_oz,
        local_only, age_restricted, variants_json, updated_at, id, sort_order, active, household_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      ...fields.slice(0, -1), productId, Number(sortRow?.n || 0) + 1, family
    );
  }
  const saved = await store.get("SELECT * FROM shop_products WHERE id = ?", productId);
  return { product: publicProduct(saved) };
}

export async function removeProduct(store, id, householdId = "home") {
  await readyShop(store);
  const existing = await store.get("SELECT household_id FROM shop_products WHERE id = ?", id);
  if (existing && (existing.household_id || "home") !== (householdId || "home")) {
    return { error: "That item belongs to another family.", status: 403 };
  }
  await store.run("UPDATE shop_products SET active = 0, updated_at = ? WHERE id = ?", new Date().toISOString(), id);
  return { ok: true };
}

async function priceLines(store, items) {
  const lines = [];
  let localOnly = false;
  let ageRestricted = false;
  let weightOz = 0;
  for (const raw of Array.isArray(items) ? items : []) {
    const qty = Math.max(1, Math.min(24, Number(raw.qty) || 1));
    const product = publicProduct(await store.get("SELECT * FROM shop_products WHERE id = ? AND active = 1", String(raw.id || "")));
    if (!product?.title) return { error: "One of those items is no longer in the shop.", status: 400 };
    if (product.stock === "out") return { error: `${product.title} is sold out.`, status: 400 };
    const variant = product.variants.find((entry) => entry.id === String(raw.variantId || "")) || product.variants[0] || null;
    const price = variant?.priceCents || product.saleCents || product.priceCents;
    const weight = variant?.weightOz || product.weightOz;
    localOnly = localOnly || product.localOnly;
    ageRestricted = ageRestricted || product.ageRestricted || Boolean(variant?.age);
    weightOz += weight * qty;
    lines.push({
      id: product.id,
      title: product.title,
      category: product.category,
      variantId: variant?.id || "",
      variantLabel: variant?.label || "",
      qty,
      priceCents: price,
      lineCents: price * qty,
      age: Boolean(product.ageRestricted || variant?.age),
      detail: String(raw.detail || "").replace(/\s+/g, " ").trim().slice(0, 240)
    });
  }
  if (!lines.length) return { error: "Add something to the basket first.", status: 400 };
  return { lines, localOnly, ageRestricted, weightOz };
}

export async function quoteShipping(store, body, region) {
  await readyShop(store);
  const priced = await priceLines(store, body.items);
  if (priced.error) return priced;
  const active = region || regionById(body.region) || regionById("tx");
  const mode = body.mode === "ship" ? "ship" : "local";
  if (mode === "ship" && priced.localOnly) {
    return { error: `Fresh meals and ${active.chain} errands stay in town. Switch to local delivery.`, status: 400 };
  }
  const fee = estimateFee({ zip: body.zip, weightOz: priced.weightOz, mode, localOnly: priced.localOnly, region: active });
  if (!fee.ok) return { error: fee.error, status: 400 };
  const subtotal = priced.lines.reduce((sum, line) => sum + line.lineCents, 0);
  return {
    subtotalCents: subtotal,
    shippingCents: fee.cents,
    totalCents: subtotal + fee.cents,
    label: fee.label,
    city: fee.city,
    lines: priced.lines
  };
}

function orderCode(prefix) {
  const head = String(prefix || "LRB").replace(/[^A-Za-z0-9]/g, "").slice(0, 6) || "LRB";
  return `${head}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function telegramText(order) {
  const lines = order.lines.map((line) => {
    const name = `- ${line.qty}x ${line.title}${line.variantLabel ? ` (${line.variantLabel})` : ""}`;
    return line.detail ? `${name}\n  Details: ${line.detail}` : name;
  }).join("\n");
  const where = [order.address, [order.city, order.regionCode, order.zip].filter(Boolean).join(" ")].filter(Boolean).join(" / ");
  const runner = order.runner ? `\n- Runner: ${order.runner}` : "";
  const note = order.note ? `\n📝 Order note: ${order.note}` : "";
  const payment = order.payLabel || "Payment pending";
  return [
    `🚨 NEW ORDER RECEIVED! [#${order.id}]`,
    `💰 Total: ${money(order.totalCents)}`,
    `👤 Customer: ${order.name} (${order.phone})`,
    `📍 Address / Delivery Zone: ${where || order.label}`,
    "📦 Items:",
    lines + runner + note,
    `💳 ${payment}`
  ].join("\n");
}

export async function notifyShop(env, order) {
  const token = String(env?.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chat = String(env?.TELEGRAM_SHOP_CHAT_ID || process.env.TELEGRAM_SHOP_CHAT_ID || "").trim();
  if (!token || !chat) return { state: "skipped", reason: !token && !chat ? "missing" : !token ? "missing-token" : "missing-chat" };
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: telegramText(order) })
    });
    if (response.ok) return { state: "sent", reason: "" };
    const body = await response.json().catch(() => ({}));
    const description = String(body.description || "").replaceAll(token, "").slice(0, 160);
    return { state: "skipped", reason: description || `http-${response.status}` };
  } catch {
    return { state: "skipped", reason: "network" };
  }
}

export async function placeOrder(store, body, env, context = {}) {
  await readyShop(store);
  const brand = context.brand || resolveBrand(env);
  const household = context.household || null;
  const payments = context.payments || resolvePayments(env, household);
  const region = context.region || regionById(body.region) || regionById(brand.defaultRegion);
  const name = String(body.name || "").trim().slice(0, 80);
  const phone = String(body.phone || "").trim().slice(0, 30);
  const address = String(body.address || "").trim().slice(0, 160);
  const city = String(body.city || "").trim().slice(0, 60);
  if (name.length < 2) return { error: "Add the name for the order.", status: 400 };
  if (phone.length < 7) return { error: "Add a phone number.", status: 400 };
  const quote = await quoteShipping(store, body, region);
  if (quote.error) return quote;
  const priced = await priceLines(store, body.items);
  if (priced.ageRestricted && !body.ageOk) {
    return { error: "Cigarettes and beer or wine need a 21+ ID at the door. Check the box to confirm.", status: 400 };
  }
  const needsRunner = priced.lines.some((line) => line.category === "errands");
  const runners = region?.runners || [];
  const runner = runners.includes(body.runner) ? body.runner : "";
  if (needsRunner && (body.mode !== "ship") && !runner) {
    return { error: `Pick ${runners.join(" or ") || "a runner"} for the ${region?.chain || "local"} errand.`, status: 400 };
  }
  if ((body.mode === "local" || priced.localOnly) && !address) {
    return { error: "Add the street address for the drop-off.", status: 400 };
  }
  const plan = checkoutPlan(payments, body.payMethod || body.provider, quote.totalCents);
  if (plan.error) return plan;
  let id = orderCode(brand.orderPrefix);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await store.get("SELECT id FROM shop_orders WHERE id = ?", id);
    if (!taken) break;
    id = orderCode(brand.orderPrefix);
  }
  let paymentStatus = "pending";
  let squarePaymentId = "";
  if (plan.provider === "square") {
    const token = await squareAccessToken(env, household);
    const charged = await chargeSquare({
      token,
      sourceId: body.sourceId,
      amountCents: quote.totalCents,
      locationId: plan.locationId,
      orderId: id,
      sandbox: plan.sandbox
    });
    if (!charged.ok) return { error: charged.error, status: 400 };
    paymentStatus = "paid";
    squarePaymentId = charged.paymentId || "";
  }
  const now = new Date().toISOString();
  const payLabel = plan.provider === "cashapp"
    ? `Payment: Pending via Cash App ($${plan.cashtag})`
    : `Payment: ${paymentStatus} via Square`;
  await store.run(
    `INSERT INTO shop_orders (
      id, created_at, customer_name, phone, address, city, zip, mode, runner, items_json,
      subtotal_cents, shipping_cents, total_cents, age_ok, payment_status, note, household_id, payment_provider
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, now, name, phone, address, city || quote.city, String(body.zip || "").replace(/\D/g, "").slice(0, 5),
    body.mode === "ship" ? "ship" : "local", runner, JSON.stringify(quote.lines),
    quote.subtotalCents, quote.shippingCents, quote.totalCents, body.ageOk ? 1 : 0, paymentStatus,
    String(body.note || "").slice(0, 300), context.householdId || household?.id || "home", plan.provider
  );
  const order = {
    id,
    name,
    phone,
    address,
    city: city || quote.city,
    zip: String(body.zip || "").replace(/\D/g, "").slice(0, 5),
    regionCode: (region?.states || [])[0] || "",
    label: quote.label,
    lines: quote.lines,
    totalCents: quote.totalCents,
    runner,
    note: String(body.note || "").trim().slice(0, 300),
    payLabel
  };
  const notice = await notifyShop(env, order);
  return {
    order: {
      id,
      totalCents: quote.totalCents,
      subtotalCents: quote.subtotalCents,
      shippingCents: quote.shippingCents,
      label: quote.label,
      payment: {
        provider: plan.provider,
        status: paymentStatus,
        cashTag: plan.provider === "cashapp" ? plan.cashtag : "",
        cashUrl: plan.provider === "cashapp" ? plan.cashUrl : "",
        squarePaymentId: plan.provider === "square" ? squarePaymentId : ""
      },
      cashTag: plan.provider === "cashapp" ? plan.cashtag : "",
      cashUrl: plan.provider === "cashapp" ? plan.cashUrl : "",
      lines: quote.lines,
      telegram: notice.state || notice,
      telegramReason: notice.reason || ""
    }
  };
}
