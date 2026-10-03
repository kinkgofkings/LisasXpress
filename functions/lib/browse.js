function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function blockedHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  const parts = host.split(".").map(Number);
  if (parts.length === 4 && parts.every((part) => part >= 0 && part <= 255)) {
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  return false;
}

export function publicUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw fail("That link is not a web address.", 400);
  }
  if (!["http:", "https:"].includes(url.protocol) || blockedHost(url.hostname)) {
    throw fail("That link stays outside the book.", 400);
  }
  return url;
}

function textFrom(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

export async function browse(raw) {
  let current = publicUrl(raw);
  let response;
  for (let hop = 0; hop < 4; hop += 1) {
    response = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent": "LisasRecipeBook/1.0 (personal cookbook reader)",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw fail("The page redirected nowhere.", 502);
      current = publicUrl(new URL(location, current).href);
      continue;
    }
    break;
  }
  if (!response?.ok) throw fail("That page could not be opened.", 502);
  const type = response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml/i.test(type)) throw fail("That link is not a page the book can show.", 415);
  const html = await response.text();
  if (html.length > 2_000_000) throw fail("That page is too large to open inside the book.", 413);
  const title = textFrom((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "Page")).slice(0, 160) || "Page";
  const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0]
    || html.match(/<main[\s\S]*?<\/main>/i)?.[0]
    || html;
  const text = textFrom(article).slice(0, 20000);
  const page = text
    ? text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`).join("")
    : "<p>This page had no readable text.</p>";
  return { url: current.href, title, html: page };
}
