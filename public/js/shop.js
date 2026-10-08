const CART_KEY = "lisa-shop-cart";

const CATS = [
  ["all", "All"],
  ["meals", "Mom's Meals"],
  ["desserts", "Desserts"],
  ["treats", "Doggie Treats"],
  ["accessories", "Cooking Accessories"],
  ["spices", "Signature Spice Blends"],
  ["errands", "Local Errands"]
];

let shopCats = CATS;

function cats() {
  return shopCats;
}

export function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((line) => line?.id && line.qty > 0) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function money(cents) {
  return `$${(Math.max(0, Math.round(Number(cents) || 0)) / 100).toFixed(2)}`;
}

function lineKey(line) {
  return `${line.id}:${line.variantId || ""}`;
}

function applyLineDetails(state) {
  document.querySelectorAll("[data-line-detail]").forEach((field) => {
    const line = (state.cart || []).find((entry) => lineKey(entry) === field.dataset.lineDetail);
    if (line) line.detail = String(field.value || "").slice(0, 240);
  });
  if (state.cart) saveCart(state.cart);
}

function capture(state) {
  applyLineDetails(state);
  const form = document.getElementById("shop-checkout");
  if (!form) return;
  const data = Object.fromEntries(new FormData(form).entries());
  state.shopDraft = {
    ...(state.shopDraft || {}),
    ...data,
    ageOk: Boolean(form.querySelector("[name=ageOk]")?.checked)
  };
}

function draft(state, name, fallback = "") {
  return state.shopDraft?.[name] ?? fallback;
}

function priceLabel(product, esc) {
  if (product.id === "convenience-errand" || product.id === "sheetz-errand") return "Runner trip from $8.00";
  if (product.variants?.length) {
    const amounts = product.variants.map((entry) => entry.priceCents);
    const low = Math.min(...amounts);
    const high = Math.max(...amounts);
    return low === high ? money(low) : `From ${money(low)}`;
  }
  if (product.saleCents && product.saleCents < product.priceCents) {
    return `<s>${esc(money(product.priceCents))}</s> ${esc(money(product.saleCents))}`;
  }
  return esc(money(product.priceCents));
}

function catLabel(id) {
  return cats().find(([key]) => key === id)?.[1] || "Shop";
}

function shopCard(product, esc, asset) {
  const ribbon = product.ribbon ? `<span class="badge">${esc(product.ribbon)}</span>` : "";
  const picture = product.image
    ? `<img src="${esc(asset(product.image))}" alt="${esc(product.title)}" loading="lazy" decoding="async">`
    : `<div class="ph"></div>`;
  return `<article class="card">
    <a class="card-link" href="#/shop/${esc(product.id)}">
      ${picture}
      <div>
        <div class="kicker">${esc(catLabel(product.category))} ${ribbon}</div>
        <h2>${esc(product.title)}</h2>
        <p>${priceLabel(product, esc)}</p>
      </div>
    </a>
  </article>`;
}

function errandNote(product, esc) {
  return `<div class="field"><label>Special order details<textarea data-note-for="${esc(product.id)}" rows="3" placeholder="Extra salsa, no onions, which prescription, or anything else for this stop."></textarea></label></div>`;
}

const ERRAND_PROMPTS = {
  meds: "Pharmacy name and the medicine",
  smokes: "Brand, and pack or carton",
  beer: "Brand, kind, and how many",
  alcohol: "Wine, liquor, or other alcohol, and the size"
};

function convenienceMenu(product, esc) {
  return `<ul class="shop-menu errand-stops">${product.variants.map((entry) => `<li>
      <div>
        <strong>${esc(entry.label)}</strong>
        <p>${esc(money(entry.priceCents))} runner trip${entry.age ? " · 21+ ID at the door" : ""}</p>
      </div>
      <label class="field">What to pick up<textarea data-line-note rows="3" required placeholder="${esc(ERRAND_PROMPTS[entry.id] || "Write exactly what to pick up")}"></textarea></label>
      <button class="btn moss" type="button" data-action="shop-add" data-id="${esc(product.id)}" data-variant="${esc(entry.id)}">Add</button>
    </li>`).join("")}</ul>`;
}

function productView(product, esc, asset) {
  const ribbon = product.ribbon ? `<span class="badge">${esc(product.ribbon)}</span>` : "";
  const sold = product.stock === "out";
  const errand = product.category === "errands";
  const custom = (product.id === "convenience-errand" || product.id === "sheetz-errand") && product.variants?.length
    ? convenienceMenu(product, esc)
    : "";
  const menu = !custom && errand && product.variants?.length
    ? `<ul class="shop-menu">${product.variants.map((entry) => `<li>
        <div><strong>${esc(entry.label)}</strong><p>${esc(money(entry.priceCents))}</p></div>
        <button class="btn moss" type="button" data-action="shop-add" data-id="${esc(product.id)}" data-variant="${esc(entry.id)}" ${sold ? "disabled" : ""}>${sold ? "Sold out" : "Add"}</button>
      </li>`).join("")}</ul>${errandNote(product, esc)}`
    : "";
  const choices = !menu && product.variants?.length
    ? `<label class="shop-variant">Size<select data-variant-for="${esc(product.id)}">${product.variants.map((entry) => `<option value="${esc(entry.id)}">${esc(entry.label)} · ${esc(money(entry.priceCents))}</option>`).join("")}</select></label>`
    : "";
  const picture = product.image
    ? `<img src="${esc(asset(product.image))}" alt="${esc(product.title)}">`
    : `<div class="ph"></div>`;
  const add = menu ? "" : `<button class="btn moss" type="button" data-action="shop-add" data-id="${esc(product.id)}" ${sold ? "disabled" : ""}>${sold ? "Sold out" : "Add to cart"}</button>`;
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">${esc(product.title)}</span></nav>
    <article class="recipe shop-detail">
      <div class="plate">${picture}</div>
      <div>
        <p class="kicker">${esc(catLabel(product.category))} ${ribbon}</p>
        <h2>${esc(product.title)}</h2>
        <p class="shop-blurb">${esc(product.blurb)}</p>
        ${custom || menu ? "" : `<p class="shop-price">${priceLabel(product, esc)}</p>`}
        ${custom || menu || `${choices}${errand ? errandNote(product, esc) : ""}${add}`}
      </div>
    </article>`;
}

let shopSeq = 0;
async function ensureProducts(ctx, force = false) {
  if (!force && (ctx.state.shopLoaded || ctx.state.shopLoading)) return;
  const seq = ++shopSeq;
  ctx.state.shopLoading = true;
  try {
    const data = await ctx.api("/api/shop/products");
    const config = await ctx.api("/api/config").catch(() => null);
    ctx.state.shopProducts = data.products || [];
    ctx.state.shopError = "";
    if (data.categories?.length) shopCats = data.categories.map((entry) => [entry.id, entry.label]);
    if (config?.brand) ctx.state.brand = config.brand;
    if (config?.payments) ctx.state.payments = config.payments;
    if (config?.locale) ctx.state.locale = config.locale;
  } catch (error) {
    ctx.state.shopProducts = [];
    ctx.state.shopError = error.message || "The shop did not open.";
  }
  if (seq !== shopSeq) return;
  ctx.state.shopLoaded = true;
  ctx.state.shopLoading = false;
  if (ctx.route().name === "shop") ctx.render();
}

export function shopView(ctx) {
  const { state, esc, asset } = ctx;
  if (!state.shopLoaded) ensureProducts(ctx);
  if (ctx.route().id === "studio") return studioView(ctx);
  if (ctx.route().id === "cart") return cartView(ctx);
  const cat = state.shopCategory || "all";
  const products = state.shopProducts || [];
  if (ctx.route().id) {
    const opened = products.find((product) => product.id === ctx.route().id);
    if (!state.shopLoaded) return `<p class="empty">Opening that item…</p>`;
    if (!opened) return `<p class="empty">That item is not in the shop.</p><p><a class="btn" href="#/shop">Back to the shop</a></p>`;
    return productView(opened, esc, asset);
  }
  const shown = cat === "all" ? products : products.filter((product) => product.category === cat);
  const chips = cats().map(([id, label]) => `<button class="chip ${cat === id ? "active" : ""}" type="button" data-action="shop-filter" data-cat="${esc(id)}">${esc(label)}</button>`).join("");
  const body = state.shopError
    ? `<p class="empty">${esc(state.shopError)}</p>`
    : (!state.shopLoaded
      ? `<p class="empty">Opening the shop…</p>`
      : `<div class="grid">${shown.map((product) => shopCard(product, esc, asset)).join("") || `<p class="empty">Nothing in this row yet.</p>`}</div>`);
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Shop</span></nav>
    <div class="shop-head">
      <div>
        <p class="eyebrow">From Mom's kitchen</p>
        <h2 class="page-title">Shop</h2>
        <p>Meals, desserts, dog treats, spices, and a ${esc(state.locale?.chain || "local")} errand. Pay with the methods this family has turned on.</p>
      </div>
      <div class="actions">
        <a class="btn quiet" href="#/shop/cart"><i class="bi bi-cart" aria-hidden="true"></i> Cart${(state.cart || []).reduce((sum, line) => sum + Number(line.qty || 0), 0) ? ` (${(state.cart || []).reduce((sum, line) => sum + Number(line.qty || 0), 0)})` : ""}</a>
        <a class="btn quiet" href="#/shop/studio">Product studio</a>
      </div>
    </div>
    <div class="shop-switch">${chips}</div>
    ${body}`;
}

function variantLines(product) {
  return (product?.variants || []).map((entry) => `${entry.label} | ${(entry.priceCents / 100).toFixed(2)} | ${entry.weightOz || ""}`).join("\n");
}

function studioView(ctx) {
  const { state, esc } = ctx;
  if (!state.shopLoaded) ensureProducts(ctx);
  if (!state.user) {
    return `<h2 class="page-title">Product studio</h2><p>Log in to add or change shop items.</p><p><a class="btn" href="#/account">Log in</a></p>`;
  }
  const editing = state.shopEditing;
  const form = editing ? `<form id="shop-studio" class="panel shop-studio">
      <h3>${editing.id ? "Edit this item" : "New item"}</h3>
      <div class="field"><label>Name<input name="title" required value="${esc(editing.title || "")}"></label></div>
      <div class="field"><label>Description<textarea name="blurb" rows="4">${esc(editing.blurb || "")}</textarea></label></div>
      <div class="split">
        <div class="field"><label>Price<input name="price" inputmode="decimal" required value="${editing.priceCents ? (editing.priceCents / 100).toFixed(2) : ""}"></label></div>
        <div class="field"><label>Sale price<input name="sale" inputmode="decimal" value="${editing.saleCents ? (editing.saleCents / 100).toFixed(2) : ""}" placeholder="Optional"></label></div>
      </div>
      <div class="field"><label>Category<select name="category">${cats().filter(([id]) => id !== "all").map(([id, label]) => `<option value="${id}" ${editing.category === id ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label></div>
      <div class="field"><label>Stock<select name="stock">${["in", "low", "out"].map((id) => `<option value="${id}" ${(editing.stock || "in") === id ? "selected" : ""}>${id === "in" ? "In stock" : id === "low" ? "Running low" : "Sold out"}</option>`).join("")}</select></label></div>
      <div class="field"><label>Sizes, one per line<textarea name="variants" rows="4" placeholder="8 oz | 14.00 | 10">${esc(variantLines(editing))}</textarea></label></div>
      <p class="empty">Write the size, the price, and the weight in ounces. Example: Half dozen | 14.00 | 16</p>
      <div class="split">
        <div class="field"><label>Ribbon<input name="ribbon" maxlength="24" value="${esc(editing.ribbon || "")}" placeholder="HOT BUY"></label></div>
        <div class="field"><label>Weight in ounces<input name="weightOz" inputmode="numeric" value="${esc(editing.weightOz || 16)}"></label></div>
      </div>
      <div class="field"><label>Picture already in the book<input name="image" value="${esc(editing.image || "")}" placeholder="/images/pecan-pie.jpg"></label></div>
      <div class="field"><label>Or upload a picture<input name="photo" type="file" accept="image/*"></label></div>
      ${editing.image ? `<img class="shop-preview" src="${esc(editing.image)}" alt="">` : ""}
      <label class="checkline"><input type="checkbox" name="localOnly" ${editing.localOnly ? "checked" : ""}> Lubbock and Wolfforth only</label>
      <label class="checkline"><input type="checkbox" name="ageRestricted" ${editing.ageRestricted ? "checked" : ""}> 21+ ID at the door</label>
      <div class="actions">
        <button class="btn moss" type="submit">${state.shopSaving ? "Saving…" : "Save item"}</button>
        <button class="btn quiet" type="button" data-action="shop-cancel">Cancel</button>
      </div>
    </form>` : `<p><button class="btn moss" type="button" data-action="shop-new">Add an item</button></p>`;
  const rows = (state.shopProducts || []).map((product) => `<article class="shop-manage">
      <div><strong>${esc(product.title)}</strong><p class="empty">${esc(money(product.saleCents || product.priceCents))} · ${esc(catLabel(product.category))}</p></div>
      <div class="actions">
        <button class="btn quiet" type="button" data-action="shop-edit" data-id="${esc(product.id)}">Edit</button>
        <button class="btn danger" type="button" data-action="shop-delete" data-id="${esc(product.id)}">Remove</button>
      </div>
    </article>`).join("");
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Product studio</span></nav>
    <h2 class="page-title">Product studio</h2>
    <p>Add a meal, a dessert, a treat, a spice, or an errand. The family sees it in the shop as soon as you save it.</p>
    ${state.user?.role === "admin" ? householdForm(state, esc) : ""}
    ${form}
    <div class="shop-manage-list">${rows || `<p class="empty">No items yet.</p>`}</div>`;
}

function cartLines(state, esc, asset) {
  return (state.cart || []).map((line) => `<article class="cart-line">
    <div class="shop-photo mini">${line.image ? `<img src="${esc(asset(line.image))}" alt="">` : `<span class="shop-mark">${esc((state.brand?.shortName || "Kitchen").slice(0, 12))}</span>`}</div>
    <div>
      <strong>${esc(line.title)}</strong>
      ${line.variantLabel ? `<p class="empty">${esc(line.variantLabel)}</p>` : ""}
      <p>${esc(money(line.priceCents))} each</p>
      <div class="qty">
        <button type="button" data-action="cart-dec" data-key="${esc(lineKey(line))}" aria-label="Less">−</button>
        <span>${esc(line.qty)}</span>
        <button type="button" data-action="cart-inc" data-key="${esc(lineKey(line))}" aria-label="More">+</button>
        <button type="button" class="btn quiet" data-action="cart-remove" data-key="${esc(lineKey(line))}">Remove</button>
      </div>
      ${line.category === "errands" ? `<div class="field"><label>Special order details<textarea data-line-detail="${esc(lineKey(line))}" rows="2" placeholder="Anything special for this stop.">${esc(line.detail || "")}</textarea></label></div>` : ""}
    </div>
  </article>`).join("");
}

export function addRecipeIngredientsToCart(state, recipe) {
  const ingList = Array.isArray(recipe.ingredients) ? recipe.ingredients.join("\n• ") : String(recipe.ingredients || "");
  const cart = state.cart || [];
  const line = {
    id: `grocery-${recipe.id}`,
    variantId: "",
    title: `Groceries for: ${recipe.title}`,
    variantLabel: `${recipe.ingredients?.length || 0} items needed`,
    priceCents: 1500, // standard baseline runner trip fee
    qty: 1,
    image: recipe.image || "/images/shop-errand.jpg",
    ageRestricted: false,
    category: "errands",
    detail: `Ingredients to purchase:\n• ${ingList}\n(Recipe: ${recipe.title})`
  };
  const existing = cart.find((item) => item.id === line.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push(line);
  }
  state.cart = cart;
  saveCart(cart);
  return line;
}

function cartView(ctx) {
  const { state, esc, asset } = ctx;
  const count = (state.cart || []).reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const subtotal = (state.cart || []).reduce((sum, line) => sum + line.priceCents * line.qty, 0);
  const order = state.shopOrder;
  const needsAge = (state.cart || []).some((line) => line.ageRestricted);
  const needsRunner = (state.cart || []).some((line) => line.category === "errands");
  const mode = draft(state, "mode", state.shopMode || "local");
  const estimate = state.shopEstimate;
  const providers = (state.payments?.providers || []).filter((provider) => provider.enabled);
  const payMethod = draft(state, "payMethod", state.payments?.defaultProvider || providers[0]?.id || "cashapp");
  const cash = providers.find((provider) => provider.id === "cashapp");
  const square = providers.find((provider) => provider.id === "square");
  const runners = state.locale?.runners?.length ? state.locale.runners : ["Leroy", "Rex"];
  const guest = state.user ? "" : `<p class="empty" style="color:var(--clay);font-weight:500;">You can send this order as a guest. Log in is optional.</p>`;
  const paidWith = order?.payment?.provider === "square"
    ? "Square"
    : order?.payment?.cashTag
      ? `Cash App ($${order.payment.cashTag})`
      : "the selected payment method";
  const cashButton = order?.payment?.provider === "cashapp" && order.cashUrl
    ? `<a class="btn moss" href="${esc(order.cashUrl)}" target="_blank" rel="noopener" style="font-size:17px;padding:14px 20px;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700;">
            <i class="bi bi-currency-dollar"></i> Pay ${esc(money(order.totalCents))} with Cash App ($${esc(order.payment.cashTag)})
          </a>`
    : order?.payment?.provider === "square"
      ? `<p class="empty">Paid with Square${order.payment.status === "paid" ? "" : ""}. Reference ${esc(order.payment.squarePaymentId || order.id)}.</p>`
      : "";
  const payChoices = providers.map((provider) => `<label style="display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--card);cursor:pointer;">
              <input type="radio" name="payMethod" value="${esc(provider.id)}" ${payMethod === provider.id ? "checked" : ""}>
              <span>${provider.id === "cashapp" ? `Cash App ($${esc(provider.cashtag)})` : "Square"}</span>
            </label>`).join("") || `<p class="empty">This family has not turned on Cash App or Square.</p>`;
  const squareBox = square && payMethod === "square"
    ? `<div id="square-card-container" style="margin-top:12px;padding:14px;border:1px solid rgba(0,0,0,0.12);border-radius:12px;background:#fafafa;">
          <p style="margin:0 0 8px;font-weight:600;">Square secure card form</p>
          <div id="square-card"></div>
          <p class="empty">The card number goes to Square. This book never stores it.</p>
        </div>`
    : "";

  const body = order
    ? `<div class="pay-card panel" style="border:2px solid var(--moss);box-shadow:0 12px 36px rgba(216,27,96,0.15);">
        <div style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:#fce4ec;border-radius:999px;color:#ad1457;font-size:12px;font-weight:600;margin-bottom:8px;">
          Order confirmed
        </div>
        <p class="eyebrow" style="color:var(--clay);">Order successfully placed</p>
        <h3 style="font-size:32px;margin:4px 0 10px;color:var(--ink);">#${esc(order.id)}</h3>
        <p style="font-size:17px;">Total: <strong>${esc(money(order.totalCents))}</strong> (${esc(order.label || "Delivery")} is ${esc(money(order.shippingCents))})</p>
        <div style="margin:20px 0;display:flex;flex-direction:column;gap:12px;">
          ${cashButton}
        </div>
        ${order.payment?.provider === "cashapp" ? `<div style="background:var(--paper);border:1px dashed var(--line);border-radius:12px;padding:14px;margin:16px 0;text-align:left;">
          <p style="margin:0 0 6px;font-weight:600;color:var(--ink);">Cash App instructions</p>
          <p style="margin:0;font-size:14px;color:var(--muted);">1. Open Cash App on your phone.<br>2. Send <strong>${esc(money(order.totalCents))}</strong> to <strong>$${esc(order.payment.cashTag)}</strong>.<br>3. Enter <strong>#${esc(order.id)}</strong> in the note field.</p>
        </div>` : `<p>Payment method: ${esc(paidWith)}.</p>`}
        <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px;">
          <button class="btn quiet" type="button" data-action="copy" data-text="#${esc(order.id)}"><i class="bi bi-clipboard"></i> Copy Order #</button>
          <button class="btn quiet" type="button" data-action="shop-done">Back to Shop</button>
        </div>
      </div>`
    : `<div class="cart-lines">${cartLines(state, esc, asset) || `<p class="empty">The cart is empty. <a href="#/shop">Look through the shop</a> or add ingredients from a recipe!</p>`}</div>
      <p class="shop-sub" style="font-size:18px;font-weight:600;margin:18px 0 12px;">Items: ${esc(money(subtotal))}${estimate ? ` · ${esc(estimate.label)} ${esc(money(estimate.shippingCents))} · Total ${esc(money(estimate.totalCents))}` : ""}</p>
      ${count ? `<form id="shop-checkout" class="shop-checkout panel" style="border-radius:18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <h3 style="margin:0;font-size:22px;">Delivery and errand checkout</h3>
        </div>
        ${guest}
        <div class="shop-switch tight" style="margin-bottom:12px;">
          <button class="chip ${mode !== "ship" ? "active" : ""}" type="button" data-action="shop-mode" data-mode="local">Local Delivery / Errand</button>
          <button class="chip ${mode === "ship" ? "active" : ""}" type="button" data-action="shop-mode" data-mode="ship">Ship it</button>
          <input type="hidden" name="mode" value="${esc(mode)}">
        </div>
        <p class="empty">${esc(state.locale?.deliveryNote || "Local delivery follows the family's region. Spices and dry dog treats can ship nationwide.")}</p>
        <div class="field"><label>Your Name<input name="name" required value="${esc(draft(state, "name", state.user?.name || ""))}" autocomplete="name" placeholder="Full name"></label></div>
        <div class="field"><label>Phone Number (for runner text/call)<input name="phone" required value="${esc(draft(state, "phone", ""))}" autocomplete="tel" placeholder="Phone number"></label></div>
        <div class="field"><label>Street Address / Drop-off<input name="address" value="${esc(draft(state, "address", ""))}" autocomplete="street-address" placeholder="Street address"></label></div>
        <div class="split">
          <div class="field"><label>City<input name="city" value="${esc(draft(state, "city", state.locale?.label || ""))}" autocomplete="address-level2"></label></div>
          <div class="field"><label>ZIP Code<input name="zip" inputmode="numeric" required value="${esc(draft(state, "zip", ""))}" autocomplete="postal-code"></label></div>
        </div>
        <div class="field" style="margin-top:10px;">
          <label style="font-weight:600;margin-bottom:6px;display:block;">Payment method</label>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;">
            ${payChoices}
          </div>
        </div>
        ${squareBox}
        ${needsRunner ? `<div class="field" style="margin-top:12px;"><label>Delivery Runner<select name="runner"><option value="">Assign available runner</option>${runners.map((name) => `<option ${draft(state, "runner") === name ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label></div>` : ""}
        ${needsAge ? `<label class="checkline" style="margin-top:8px;"><input type="checkbox" name="ageOk" ${draft(state, "ageOk") ? "checked" : ""}> I am 21 or older. A photo ID will be shown at the door for age-restricted deliveries.</label>` : ""}
        <div class="field" style="margin-top:10px;"><label>Special Delivery and Errand Notes<textarea name="note" rows="2" placeholder="Gate code, porch directions, or drop-off notes.">${esc(draft(state, "note", ""))}</textarea></label></div>
        <div class="actions" style="margin-top:16px;">
          <button class="btn quiet" type="button" data-action="shop-estimate">Estimate Delivery</button>
          <button class="btn moss" type="submit" style="font-size:16px;padding:12px 24px;font-weight:700;">${state.shopSending ? "Placing Order…" : "Place Order"}</button>
        </div>
      </form>` : ""}`;
  const methods = [cash ? "Cash App" : "", square ? "Square" : ""].filter(Boolean).join(" and ") || "the family's payment methods";
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Cart and errands</span></nav>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <h2 class="page-title" style="margin:0;">Shopping and errand cart</h2>
    </div>
    <p>Review items, choose local delivery or shipping, and pay with ${esc(methods)}. The menu follows ${esc(state.locale?.chain || "the local")}.</p>
    ${body}`;
}

function findProduct(state, id) {
  return (state.shopProducts || []).find((product) => product.id === id);
}

function addLine(state, product, variantId, detail = "") {
  const variant = (product.variants || []).find((entry) => entry.id === variantId) || (product.variants?.length ? null : null);
  const chosen = variant || (product.category === "errands" && product.variants?.length ? null : product.variants?.[0] || null);
  if (product.variants?.length && !chosen) return false;
  const price = chosen?.priceCents || product.saleCents || product.priceCents;
  const key = `${product.id}:${chosen?.id || ""}`;
  const cart = state.cart || [];
  const found = cart.find((line) => lineKey(line) === key);
  const note = String(detail || "").trim().slice(0, 240);
  if (found) {
    found.qty += 1;
    if (note) found.detail = note;
  } else cart.push({
    id: product.id,
    variantId: chosen?.id || "",
    title: product.title,
    variantLabel: chosen?.label || "",
    priceCents: price,
    qty: 1,
    image: product.image || "",
    ageRestricted: Boolean(product.ageRestricted || chosen?.age),
    localOnly: Boolean(product.localOnly),
    weightOz: chosen?.weightOz || product.weightOz || 16,
    category: product.category,
    detail: note
  });
  state.cart = cart;
  state.shopEstimate = null;
  saveCart(cart);
}

function changeQty(state, key, delta) {
  state.cart = (state.cart || []).flatMap((line) => {
    if (lineKey(line) !== key) return [line];
    const qty = line.qty + delta;
    return qty > 0 ? [{ ...line, qty }] : [];
  });
  state.shopEstimate = null;
  saveCart(state.cart);
}

export async function shopClick(button, ctx) {
  const action = button.dataset.action || "";
  const shopActions = ["shop-add", "shop-filter", "shop-mode", "cart-open", "cart-close", "cart-inc", "cart-dec", "cart-remove", "shop-estimate", "shop-new", "shop-edit", "shop-cancel", "shop-delete", "shop-done"];
  if (!shopActions.includes(action)) return false;
  const { state, say, render } = ctx;
  capture(state);
  if (action === "shop-filter") {
    state.shopCategory = button.dataset.cat || "all";
    render();
    return true;
  }
  if (action === "shop-mode") {
    state.shopMode = button.dataset.mode === "ship" ? "ship" : "local";
    state.shopDraft = { ...(state.shopDraft || {}), mode: state.shopMode };
    state.shopEstimate = null;
    render();
    return true;
  }
  if (action === "cart-open") {
    if ((location.hash || "") !== "#/shop/cart") location.hash = "#/shop/cart";
    else render();
    return true;
  }
  if (action === "cart-close" || action === "shop-done") {
    state.cartOpen = false;
    if (action === "shop-done") state.shopOrder = null;
    if ((location.hash || "") !== "#/shop") location.hash = "#/shop";
    else render();
    return true;
  }
  if (action === "cart-inc" || action === "cart-dec" || action === "cart-remove") {
    changeQty(state, button.dataset.key, action === "cart-inc" ? 1 : action === "cart-remove" ? -99 : -1);
    render();
    return true;
  }
  if (action === "shop-add") {
    const product = findProduct(state, button.dataset.id);
    if (!product) return true;
    if (product.stock === "out") {
      say("That one is sold out.");
      return true;
    }
    const chosen = button.dataset.variant || document.querySelector(`[data-variant-for="${CSS.escape(product.id)}"]`)?.value || "";
    const detail = button.closest("li")?.querySelector("[data-line-note]")?.value
      || document.querySelector(`[data-note-for="${CSS.escape(product.id)}"]`)?.value
      || "";
    if (product.id === "convenience-errand" && String(detail).trim().length < 3) {
      say("Write what to pick up in the box on that line.");
      return true;
    }
    if (addLine(state, product, chosen, detail) === false) {
      say("Pick an item from the menu first.");
      return true;
    }
    say("Added to the cart.");
    return true;
  }
  if (action === "shop-new") {
    state.shopEditing = { title: "", blurb: "", category: "meals", stock: "in", variants: [], weightOz: 16 };
    render();
    return true;
  }
  if (action === "shop-cancel") {
    state.shopEditing = null;
    render();
    return true;
  }
  if (action === "shop-edit") {
    state.shopEditing = { ...(findProduct(state, button.dataset.id) || null) };
    render();
    return true;
  }
  if (action === "shop-delete") {
    if (!confirm("Remove this item from the shop?")) return true;
    await ctx.api(`/api/shop/products/${encodeURIComponent(button.dataset.id)}`, { method: "DELETE" });
    state.shopLoaded = false;
    state.shopEditing = null;
    await ensureProducts(ctx, true);
    say("Removed from the shop.");
    render();
    return true;
  }
  if (action === "shop-estimate") {
    const form = document.getElementById("shop-checkout");
    const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
    state.shopMode = data.mode || "local";
    const quote = await ctx.api("/api/shop/shipping-estimate", {
      method: "POST",
      json: { items: state.cart, zip: data.zip, mode: data.mode || "local" }
    });
    state.shopEstimate = quote;
    say(quote.label ? `${quote.label}: ${money(quote.shippingCents)}` : "Estimate ready.");
    render();
    return true;
  }
  return false;
}

function householdForm(state, esc) {
  const payments = state.payments || {};
  const cash = (payments.providers || []).find((provider) => provider.id === "cashapp") || {};
  const square = (payments.providers || []).find((provider) => provider.id === "square") || {};
  const region = state.locale?.id || "tx";
  return `<form id="household-setup" class="panel shop-studio">
    <h3>Family setup</h3>
    <p class="empty">These settings belong to this family only. A Square access token is saved encrypted and is never shown again.</p>
    <div class="field"><label>Book name<input name="brandName" value="${esc(state.brand?.name || "")}"></label></div>
    <div class="field"><label>Short name<input name="shortName" value="${esc(state.brand?.shortName || "")}"></label></div>
    <div class="field"><label>Home region<select name="homeRegion">
      <option value="" ${!state.householdHome ? "selected" : ""}>Follow the visitor's location</option>
      <option value="tx" ${region === "tx" ? "selected" : ""}>Texas, Stripes</option>
      <option value="va" ${region === "va" ? "selected" : ""}>Virginia, Sheetz</option>
    </select></label></div>
    <label class="checkline"><input type="checkbox" name="cashEnabled" ${cash.enabled ? "checked" : ""}> Cash App</label>
    <div class="field"><label>Cash App cashtag<input name="cashtag" value="${esc(cash.cashtag || "")}" placeholder="YourCashtag"></label></div>
    <label class="checkline"><input type="checkbox" name="squareEnabled" ${square.enabled ? "checked" : ""}> Square</label>
    <div class="field"><label>Square application id<input name="applicationId" value="${esc(square.applicationId || "")}"></label></div>
    <div class="field"><label>Square location id<input name="locationId" value="${esc(square.locationId || "")}"></label></div>
    <div class="field"><label>Square access token<input name="squareAccessToken" type="password" autocomplete="off" placeholder="${square.tokenSet ? "Saved. Leave blank to keep it." : "Paste a token to save it"}"></label></div>
    <button class="btn moss" type="submit">Save family setup</button>
  </form>`;
}

export async function mountSquare(state) {
  const provider = (state.payments?.providers || []).find((entry) => entry.id === "square" && entry.enabled && entry.applicationId && entry.locationId);
  const box = document.getElementById("square-card");
  if (!provider || !box || box.dataset.ready === "1") return;
  const src = provider.sandbox ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js";
  if (!window.Square) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Square's card form did not load."));
      document.head.appendChild(script);
    });
  }
  const payments = window.Square.payments(provider.applicationId, provider.locationId);
  window.squareCard = await payments.card();
  await window.squareCard.attach("#square-card");
  box.dataset.ready = "1";
}

export async function shopSubmit(form, ctx) {
  if (form.id === "household-setup") {
    const { state, say, render } = ctx;
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      brand: { name: data.brandName, shortName: data.shortName },
      homeRegion: data.homeRegion,
      payments: {
        cashapp: { enabled: Boolean(form.querySelector("[name=cashEnabled]")?.checked), cashtag: data.cashtag },
        square: { enabled: Boolean(form.querySelector("[name=squareEnabled]")?.checked), applicationId: data.applicationId, locationId: data.locationId }
      }
    };
    if (data.squareAccessToken) payload.squareAccessToken = data.squareAccessToken;
    const saved = await ctx.api("/api/household", { method: "PATCH", json: payload });
    state.brand = saved.household?.brand || state.brand;
    state.payments = saved.household?.payments || state.payments;
    state.shopLoaded = false;
    say("Family setup saved.");
    render();
    return true;
  }
  if (form.id === "shop-checkout") {
    const { state, say, render } = ctx;
    applyLineDetails(state);
    const data = Object.fromEntries(new FormData(form).entries());
    data.ageOk = Boolean(form.querySelector("[name=ageOk]")?.checked);
    state.shopDraft = data;
    state.shopMode = data.mode || "local";
    if (data.payMethod === "square" && window.squareCard?.tokenize) {
      const tokenized = await window.squareCard.tokenize();
      if (tokenized.status !== "OK" || !tokenized.token) {
        throw new Error(tokenized.errors?.[0]?.message || "Square could not read that card.");
      }
      data.sourceId = tokenized.token;
    }
    state.shopSending = true;
    render();
    try {
      const result = await ctx.api("/api/shop/checkout", {
        method: "POST",
        json: { ...data, ageOk: data.ageOk, items: state.cart }
      });
      state.shopOrder = result.order;
      state.cart = [];
      state.shopEstimate = null;
      saveCart([]);
      say(`Order #${result.order.id} is in.`);
    } finally {
      state.shopSending = false;
      state.cartOpen = true;
      render();
    }
    return true;
  }
  if (form.id !== "shop-studio") return false;
  const { state, say, render } = ctx;
  const data = Object.fromEntries(new FormData(form).entries());
  data.featured = Boolean(form.querySelector("[name=featured]")?.checked);
  data.localOnly = Boolean(form.querySelector("[name=localOnly]")?.checked);
  data.ageRestricted = Boolean(form.querySelector("[name=ageRestricted]")?.checked);
  const file = form.querySelector("[name=photo]")?.files?.[0];
  state.shopSaving = true;
  render();
  try {
    if (file) {
      const saved = await ctx.uploadFile(file, file.name);
      data.image = saved.path;
    }
    const id = state.shopEditing?.id;
    const result = await ctx.api(id ? `/api/shop/products/${encodeURIComponent(id)}` : "/api/shop/products", {
      method: id ? "PATCH" : "POST",
      json: data
    });
    state.shopEditing = null;
    state.shopLoaded = false;
    await ensureProducts(ctx, true);
    say(result.product ? "Saved in the shop." : "Saved.");
  } finally {
    state.shopSaving = false;
    render();
  }
  return true;
}
