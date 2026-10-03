export async function onRequest(context) {
  const parts = context.params.path;
  const name = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  if (!name || name.includes("..")) return new Response("Not found", { status: 404 });
  const path = `/uploads/${name}`;
  const info = await context.env.DB.prepare("SELECT mime, length(bytes) AS size FROM files WHERE path = ?").bind(path).first();
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
