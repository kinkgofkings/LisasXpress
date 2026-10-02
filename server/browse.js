import { lookup } from "node:dns/promises";
import net from "node:net";
import * as cheerio from "cheerio";

function blockedIp(ip) {
  if (net.isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (net.isIP(ip) === 6) {
    const n = ip.toLowerCase();
    if (n === "::1" || n.startsWith("fc") || n.startsWith("fd") || n.startsWith("fe80")) return true;
  }
  return false;
}

export async function publicUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw Object.assign(new Error("That link is not a web address."), { status: 400 });
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw Object.assign(new Error("Only ordinary web pages open inside the book."), { status: 400 });
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw Object.assign(new Error("That link stays outside the book."), { status: 400 });
  }
  const records = await lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => blockedIp(record.address))) {
    throw Object.assign(new Error("That link cannot be opened inside the book."), { status: 400 });
  }
  return url;
}

function sanitize(html, pageUrl) {
  const $ = cheerio.load(html);
  $("script,noscript,iframe,object,embed,form,link,meta,style,svg,canvas").remove();
  const title = $("title").first().text().replace(/\s+/g, " ").trim().slice(0, 160) || "Page";
  let root = $("#mw-content-text").first();
  if (!root.length) root = $("article").first();
  if (!root.length) root = $("main").first();
  if (!root.length) root = $("body").first();
  root.find(".navbox,.mw-editsection,.reflist,.reference,.infobox,#toc,.shortdescription,.mw-empty-elt").remove();

  root.find("*").each((_, el) => {
    const node = $(el);
    for (const name of Object.keys(el.attribs || {})) {
      if (name.startsWith("on") || name === "style" || name === "srcset") node.removeAttr(name);
    }
    if (el.tagName === "a") {
      const href = node.attr("href") || "";
      try {
        const abs = new URL(href, pageUrl);
        if (!["http:", "https:"].includes(abs.protocol)) node.attr("href", "#");
        else node.attr("href", abs.href);
      } catch {
        node.attr("href", "#");
      }
      node.removeAttr("target");
    }
    if (el.tagName === "img") {
      const src = node.attr("src") || "";
      try {
        const abs = new URL(src, pageUrl);
        if (!["http:", "https:"].includes(abs.protocol)) node.remove();
        else node.attr("src", abs.href);
      } catch {
        node.remove();
      }
    }
  });

  return { title, html: (root.html() || "<p>This page had no readable text.</p>").slice(0, 350000) };
}

export async function browse(raw) {
  let current = await publicUrl(raw);
  let response;
  for (let hop = 0; hop < 4; hop += 1) {
    response = await fetch(current, {
      redirect: "manual",
      headers: {
        "User-Agent": "LisasRecipeBook/1.0 (personal cookbook reader)",
        Accept: "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(12000)
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw Object.assign(new Error("The page redirected nowhere."), { status: 502 });
      current = await publicUrl(new URL(location, current).href);
      continue;
    }
    break;
  }
  if (!response?.ok) throw Object.assign(new Error("That page could not be opened."), { status: 502 });
  const type = response.headers.get("content-type") || "";
  if (!/text\/html|application\/xhtml/i.test(type)) {
    throw Object.assign(new Error("That link is not a page the book can show."), { status: 415 });
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 2_000_000) {
    throw Object.assign(new Error("That page is too large to open inside the book."), { status: 413 });
  }
  return { url: current.href, ...sanitize(bytes.toString("utf8"), current.href) };
}
