const SLICE = 100_000;
const MAX_BODY = 2_097_152;

export async function onRequest(context) {
  const parts = context.params.path;
  const name = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  if (!name || name.includes("..")) return missing();
  const path = `/uploads/${name}`;
  const info = await context.env.DB.prepare(
    "SELECT mime, byte_size, part_size, length(bytes) AS size FROM files WHERE path = ?"
  ).bind(path).first();
  if (info?.byte_size > 0) {
    if (String(info.mime || "").startsWith("image/")) return streamFile(context.env.DB, path, Number(info.byte_size), Number(info.part_size) || 800_000, info.mime, true);
    return serveParts(context.request, context.env.DB, path, info);
  }
  if (!info?.size) return missing();
  const body = await readFile(context.env.DB, path, info.size);
  if (!body?.byteLength) return missing();
  const mime = String(info.mime || "application/octet-stream").split(";")[0];
  return new Response(body, {
    headers: {
      "content-type": mime,
      "content-length": String(body.byteLength),
      "accept-ranges": "bytes",
      "cache-control": "private, no-store",
      "cdn-cache-control": "no-store"
    }
  });
}

function missing() {
  return new Response("Not found", {
    status: 404,
    headers: { "cache-control": "no-store", "cdn-cache-control": "no-store" }
  });
}

function serveParts(request, db, path, info) {
  const size = Number(info.byte_size);
  const part = Number(info.part_size) || 800_000;
  const header = request.headers.get("range") || "";
  let start = 0;
  let end = size - 1;
  if (header) {
    const match = /bytes=(\d*)-(\d*)/.exec(header);
    if (!match || (match[1] === "" && match[2] === "")) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    if (match[1] === "") {
      start = Math.max(0, size - Number(match[2]));
    } else {
      start = Number(match[1]);
      end = match[2] === "" ? size - 1 : Number(match[2]);
    }
    if (!Number.isFinite(start) || start >= size || end < start) {
      return new Response(null, {
        status: 416,
        headers: { "content-range": `bytes */${size}`, "cache-control": "no-store" }
      });
    }
    end = Math.min(end, size - 1);
  }
  if (!header) return streamFile(db, path, size, part, info.mime);
  if (end - start + 1 > MAX_BODY) end = start + MAX_BODY - 1;
  const length = end - start + 1;
  return readRange(db, path, start, length, part).then((body) => {
    if (!body || body.byteLength !== length) return missing();
    const last = start + body.byteLength - 1;
    const mime = String(info.mime || "application/octet-stream").split(";")[0];
    const partial = Boolean(header) || last < size - 1;
    const headers = {
      "content-type": mime,
      "content-length": String(body.byteLength),
      "accept-ranges": "bytes",
      "cache-control": "private, no-store",
      "cdn-cache-control": "no-store"
    };
    if (partial) headers["content-range"] = `bytes ${start}-${last}/${size}`;
    return new Response(body, { status: partial ? 206 : 200, headers });
  });
}

const wholeFiles = new Map();

function streamFile(db, path, size, part, mime) {
  let pending = wholeFiles.get(path);
  if (!pending) {
    pending = readRange(db, path, 0, size, part, 400_000).finally(() => {
      setTimeout(() => { if (wholeFiles.get(path) === pending) wholeFiles.delete(path); }, 60_000);
    });
    wholeFiles.set(path, pending);
  }
  const type = String(mime || "application/octet-stream").split(";")[0];
  const picture = type.startsWith("image/");
  return pending.then((body) => {
    if (!body || body.byteLength !== size) return missing();
    const headers = {
      "content-type": type,
      "content-length": String(body.byteLength),
      "accept-ranges": "bytes",
      "cache-control": picture ? "public, max-age=604800" : "private, no-store"
    };
    if (!picture) headers["cdn-cache-control"] = "no-store";
    return new Response(body, { headers });
  });
}

async function readRange(db, path, start, length, part, step = SLICE) {
  const out = new Uint8Array(length);
  const cache = new Map();
  let filled = 0;
  let pos = start;
  while (filled < length) {
    const idx = Math.floor(pos / part);
    const offset = pos - idx * part;
    const take = Math.min(step, part - offset, length - filled);
    const piece = await readSlice(db, path, idx, offset, take, cache);
    if (!piece?.byteLength) return null;
    out.set(piece.subarray(0, Math.min(piece.byteLength, take)), filled);
    const wrote = Math.min(piece.byteLength, take);
    filled += wrote;
    pos += wrote;
    if (wrote < take) return null;
  }
  return out;
}

async function readSlice(db, path, idx, offset, take, cache) {
  let chunk = cache.get(idx);
  if (chunk === undefined) {
    try {
      const rows = await db.prepare("SELECT bytes FROM file_parts WHERE path = ? AND idx = ?").bind(path, idx).raw();
      chunk = asBytes(rows?.[0]?.[0]);
    } catch {
      chunk = null;
    }
    cache.set(idx, chunk || null);
  }
  if (chunk?.byteLength) {
    if (offset >= chunk.byteLength) return null;
    return chunk.subarray(offset, Math.min(chunk.byteLength, offset + take));
  }
  const row = await db.prepare(
    "SELECT hex(substr(bytes, ?, ?)) AS hex FROM file_parts WHERE path = ? AND idx = ?"
  ).bind(offset + 1, take, path, idx).first();
  return hexToBytes(row?.hex);
}

async function readFile(db, path, size) {
  const rows = await db.prepare("SELECT bytes FROM files WHERE path = ?").bind(path).raw();
  const direct = asBytes(rows?.[0]?.[0]);
  if (direct?.byteLength === size) return direct;
  const out = new Uint8Array(size);
  const step = 200000;
  let written = 0;
  for (let offset = 1; offset <= size; offset += step) {
    const row = await db.prepare("SELECT hex(substr(bytes, ?, ?)) AS hex FROM files WHERE path = ?").bind(offset, step, path).first();
    const piece = hexToBytes(row?.hex);
    if (!piece?.byteLength) return null;
    out.set(piece, written);
    written += piece.byteLength;
  }
  return written === size ? out : null;
}

function asBytes(value) {
  if (!value) return null;
  if (value instanceof ArrayBuffer) return value.byteLength ? new Uint8Array(value) : null;
  if (ArrayBuffer.isView(value)) return value.byteLength ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : null;
  return null;
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    const high = hex.charCodeAt(i * 2);
    const low = hex.charCodeAt(i * 2 + 1);
    out[i] = ((high <= 57 ? high - 48 : (high & 31) + 9) << 4) | (low <= 57 ? low - 48 : (low & 31) + 9);
  }
  return out;
}
