export async function onRequest(context) {
  const parts = context.params.path;
  const name = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  if (!name || name.includes("..")) return new Response("Not found", { status: 404 });
  const path = `/uploads/${name}`;
  const info = await context.env.DB.prepare(
    "SELECT mime, byte_size, part_size, length(bytes) AS size FROM files WHERE path = ?"
  ).bind(path).first();
  if (info?.byte_size > 0) return serveParts(context.request, context.env.DB, path, info);
  if (!info?.size) return new Response("Not found", { status: 404 });
  const body = await readFile(context.env.DB, path, info.size);
  if (!body?.byteLength) return new Response("Not found", { status: 404 });
  const mime = String(info.mime || "application/octet-stream").split(";")[0];
  return new Response(body, {
    headers: {
      "content-type": mime,
      "content-length": String(body.byteLength),
      "cache-control": "public, max-age=3600"
    }
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
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    end = Math.min(end, size - 1);
  }
  return readRange(db, path, start, end - start + 1, part).then((body) => {
    if (!body?.byteLength) return new Response("Not found", { status: 404 });
    const last = start + body.byteLength - 1;
    const mime = String(info.mime || "application/octet-stream").split(";")[0];
    const headers = {
      "content-type": mime,
      "content-length": String(body.byteLength),
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600"
    };
    if (header) headers["content-range"] = `bytes ${start}-${last}/${size}`;
    return new Response(body, { status: header ? 206 : 200, headers });
  });
}

async function readRange(db, path, start, length, part) {
  const out = new Uint8Array(length);
  let filled = 0;
  let pos = start;
  while (filled < length) {
    const idx = Math.floor(pos / part);
    const offset = pos - idx * part;
    const rows = await db.prepare("SELECT bytes FROM file_parts WHERE path = ? AND idx = ?").bind(path, idx).raw();
    const chunk = asBytes(rows?.[0]?.[0]);
    if (!chunk || offset >= chunk.byteLength) break;
    const take = Math.min(chunk.byteLength - offset, length - filled);
    out.set(chunk.subarray(offset, offset + take), filled);
    filled += take;
    pos += take;
  }
  return filled === length ? out : out.subarray(0, filled);
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
