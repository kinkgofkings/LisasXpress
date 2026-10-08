const FALLBACK = {
  name: "Lisa's Recipe Book",
  shortName: "Lisa's Xpress",
  heroTitle: "Lisa's Kitchen & Deliveries",
  badge: "Lisa's Survivor Kitchen",
  studioName: "Lisa's Kitchen Studio",
  studioHandle: "@LisasKitchenStudio",
  studioUrl: "https://www.youtube.com/@LisasKitchenStudio",
  studioChannelId: "UCOQlqCabDLlzQEzlcHfvXzg",
  tagline: "",
  domain: "https://lisa.synthetix-labz.cloud/",
  themeColor: "#d81b60",
  quickSignIn: true,
  quickSignInLabel: "Quick Sign In as Lisa (Mom)",
  imageCredit: "Photograph for Lisa's Recipe Book",
  defaultRegion: "tx"
};

let current = { ...FALLBACK };
let payments = { providers: [], defaultProvider: "cashapp" };
let locale = null;

export function brand() {
  return current;
}

export function paymentConfig() {
  return payments;
}

export function localeConfig() {
  return locale;
}

export function applyWhiteLabel(config) {
  if (config?.brand) current = { ...FALLBACK, ...config.brand };
  if (config?.payments) payments = config.payments;
  if (config?.locale) locale = config.locale;
  if (current.themeColor) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", current.themeColor);
  }
  document.title = current.name || document.title;
  const structured = document.querySelector('script[type="application/ld+json"]');
  if (structured) {
    try {
      const data = JSON.parse(structured.textContent);
      data.name = current.name;
      if (current.domain) data.url = current.domain;
      structured.textContent = JSON.stringify(data, null, 2);
    } catch { /* the page script stays as shipped */ }
  }
  return current;
}

export function paintCopy(value) {
  const book = brand();
  const cash = (payments.providers || []).find((provider) => provider.id === "cashapp" && provider.enabled);
  let text = String(value || "");
  const pairs = [
    ["Lisa's Recipe Book", book.name],
    ["Lisa's Kitchen & Deliveries", book.heroTitle],
    ["Lisa's Kitchen Studio", book.studioName],
    ["@LisasKitchenStudio", book.studioHandle],
    ["https://www.youtube.com/@LisasKitchenStudio", book.studioUrl],
    ["Lisa's Xpress", book.shortName],
    ["Lisa's Survivor Kitchen", book.badge],
    ["Photograph for Lisa's Recipe Book", book.imageCredit],
    ["Quick Sign In as Lisa (Mom)", book.quickSignInLabel || "Quick sign in"]
  ];
  for (const [from, to] of pairs) {
    if (from && to && from !== to) text = text.replaceAll(from, to);
  }
  if (cash?.cashtag && cash.cashtag !== "Yellow9859") text = text.replaceAll("$Yellow9859", `$${cash.cashtag}`);
  if (!book.quickSignIn) text = text.replaceAll(book.quickSignInLabel, "");
  return text;
}

export async function loadWhiteLabel(api) {
  const config = await api("/api/config");
  applyWhiteLabel(config);
  return config;
}

export function locateFamily(api) {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = await api("/api/locale", {
          method: "POST",
          json: { lat: pos.coords.latitude, lng: pos.coords.longitude }
        });
        if (data?.locale) locale = data.locale;
        resolve(data);
      } catch {
        resolve(null);
      }
    }, () => resolve(null), { timeout: 5000, maximumAge: 10 * 60 * 1000 });
  });
}
