const CART_KEY = "lisa-shop-cart";

const CATS = [
  ["all", "All"],
  ["meals", "Mom's Meals"],
  ["desserts", "Desserts"],
  ["treats", "Doggie Treats"],
  ["accessories", "Cooking Accessories"],
  ["spices", "Signature Spice Blends"],
  ["errands", "Local Errands (Lubbock / Wolfforth)"]
];

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
  if (product.id === "convenience-errand") return "Runner trip from $8.00";
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
  return CATS.find(([key]) => key === id)?.[1] || "Shop";
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
  const custom = product.id === "convenience-errand" && product.variants?.length
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
    ctx.state.shopProducts = data.products || [];
    ctx.state.shopError = "";
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
  const chips = CATS.map(([id, label]) => `<button class="chip ${cat === id ? "active" : ""}" type="button" data-action="shop-filter" data-cat="${esc(id)}">${esc(label)}</button>`).join("");
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
        <p>Meals, desserts, dog treats, spices, and a Lubbock or Wolfforth errand. Pay with Cash App when you send the order.</p>
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
      <div class="field"><label>Category<select name="category">${CATS.filter(([id]) => id !== "all").map(([id, label]) => `<option value="${id}" ${editing.category === id ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label></div>
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
      <div><strong>${esc(product.title)}</strong><p class="empty">${esc(money(product.saleCents || product.priceCents))} · ${esc(CATS.find(([id]) => id === product.category)?.[1] || product.category)}</p></div>
      <div class="actions">
        <button class="btn quiet" type="button" data-action="shop-edit" data-id="${esc(product.id)}">Edit</button>
        <button class="btn danger" type="button" data-action="shop-delete" data-id="${esc(product.id)}">Remove</button>
      </div>
    </article>`).join("");
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Product studio</span></nav>
    <h2 class="page-title">Product studio</h2>
    <p>Add a meal, a dessert, a treat, a spice, or an errand. The family sees it in the shop as soon as you save it.</p>
    ${form}
    <div class="shop-manage-list">${rows || `<p class="empty">No items yet.</p>`}</div>`;
}

function cartLines(state, esc, asset) {
  return (state.cart || []).map((line) => `<article class="cart-line">
    <div class="shop-photo mini">${line.image ? `<img src="${esc(asset(line.image))}" alt="">` : `<span class="shop-mark">Lisa's</span>`}</div>
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

function cartView(ctx) {
  const { state, esc, asset } = ctx;
  const count = (state.cart || []).reduce((sum, line) => sum + Number(line.qty || 0), 0);
  const subtotal = (state.cart || []).reduce((sum, line) => sum + line.priceCents * line.qty, 0);
  const order = state.shopOrder;
  const needsAge = (state.cart || []).some((line) => line.ageRestricted);
  const needsRunner = (state.cart || []).some((line) => line.category === "errands");
  const mode = draft(state, "mode", state.shopMode || "local");
  const estimate = state.shopEstimate;
  const guest = state.user ? "" : `<p>You can send this order as a guest. Log in is optional.</p>`;
  const body = order
    ? `<div class="pay-card panel">
        <p class="eyebrow">Order received</p>
        <h3>#${esc(order.id)}</h3>
        <p>Total ${esc(money(order.totalCents))}. ${esc(order.label || "Delivery")} is ${esc(money(order.shippingCents))}.</p>
        <a class="btn moss" href="${esc(order.cashUrl)}" target="_blank" rel="noopener">Pay ${esc(money(order.totalCents))} with Cash App</a>
        <p>Cashtag <strong>$Yellow9859</strong>. Put <strong>#${esc(order.id)}</strong> in the Cash App note.</p>
        <button class="btn quiet" type="button" data-action="copy" data-text="#${esc(order.id)}">Copy the order number</button>
        <p class="empty">If the button does not open, open Cash App yourself, pay $Yellow9859 the amount above, and type the order number in the note.</p>
        ${order.telegram === "skipped" ? `<p class="empty">The order is saved. Telegram will get a copy once the bot is connected.</p>` : `<p class="empty">Mom's phone got the order.</p>`}
        <button class="btn quiet" type="button" data-action="shop-done">Back to the shop</button>
      </div>`
    : `<div class="cart-lines">${cartLines(state, esc, asset) || `<p class="empty">The cart is empty. <a href="#/shop">Look through the shop</a>.</p>`}</div>
      <p class="shop-sub">Items ${esc(money(subtotal))}${estimate ? ` · ${esc(estimate.label)} ${esc(money(estimate.shippingCents))} · Total ${esc(money(estimate.totalCents))}` : ""}</p>
      ${count ? `<form id="shop-checkout" class="shop-checkout panel">
        <h3>Delivery</h3>
        ${guest}
        <div class="shop-switch tight">
          <button class="chip ${mode !== "ship" ? "active" : ""}" type="button" data-action="shop-mode" data-mode="local">Local delivery</button>
          <button class="chip ${mode === "ship" ? "active" : ""}" type="button" data-action="shop-mode" data-mode="ship">Ship it</button>
          <input type="hidden" name="mode" value="${esc(mode)}">
        </div>
        <p class="empty">Local runs cover Lubbock 79401–79499 and Wolfforth 79382. Dry rubs, spices, dog treats, and accessories can ship. Fresh meals and Stripes runs stay in town.</p>
        <div class="field"><label>Name<input name="name" required value="${esc(draft(state, "name", state.user?.name || ""))}" autocomplete="name"></label></div>
        <div class="field"><label>Phone<input name="phone" required value="${esc(draft(state, "phone", ""))}" autocomplete="tel"></label></div>
        <div class="field"><label>Street<input name="address" value="${esc(draft(state, "address", ""))}" autocomplete="street-address"></label></div>
        <div class="split">
          <div class="field"><label>City<input name="city" value="${esc(draft(state, "city", ""))}" autocomplete="address-level2"></label></div>
          <div class="field"><label>ZIP<input name="zip" inputmode="numeric" required value="${esc(draft(state, "zip", ""))}" autocomplete="postal-code"></label></div>
        </div>
        ${needsRunner ? `<div class="field"><label>Runner<select name="runner"><option value="">Pick a runner</option><option ${draft(state, "runner") === "Leroy" ? "selected" : ""}>Leroy</option><option ${draft(state, "runner") === "Rex" ? "selected" : ""}>Rex</option></select></label></div>` : ""}
        ${needsAge ? `<label class="checkline"><input type="checkbox" name="ageOk" ${draft(state, "ageOk") ? "checked" : ""}> I am 21 or older. A photo ID will be shown at the door for cigarettes or alcohol.</label>` : ""}
        <div class="field"><label>Note for the whole order<textarea name="note" rows="2" placeholder="Gate code, porch, or anything else for the drop-off.">${esc(draft(state, "note", ""))}</textarea></label></div>
        <div class="actions">
          <button class="btn quiet" type="button" data-action="shop-estimate">Estimate delivery</button>
          <button class="btn moss" type="submit">${state.shopSending ? "Sending…" : "Send order"}</button>
        </div>
      </form>` : ""}`;
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">Shop</a><span class="crumb-gap" aria-hidden="true">/</span><span aria-current="page">Cart</span></nav>
    <h2 class="page-title">Cart</h2>
    <p>Change quantities, take something off, and add the delivery address. ${state.user ? "You are signed in." : "Guest checkout is open."}</p>
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

export async function shopSubmit(form, ctx) {
  if (form.id === "shop-checkout") {
    const { state, say, render } = ctx;
    applyLineDetails(state);
    const data = Object.fromEntries(new FormData(form).entries());
    data.ageOk = Boolean(form.querySelector("[name=ageOk]")?.checked);
    state.shopDraft = data;
    state.shopMode = data.mode || "local";
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
