export async function onRequest(context) {
  const parts = context.params.path;
  const name = Array.isArray(parts) ? parts.join("/") : String(parts || "");
  if (!name || name.includes("..")) return new Response("Not found", { status: 404 });
  const row = await context.env.DB.prepare("SELECT mime, hex(bytes) AS hex FROM files WHERE path = ?").bind(`/uploads/${name}`).first();
  const bytes = hexToBytes(row?.hex);
  if (!bytes?.byteLength) return new Response("Not found", { status: 404 });
  return new Response(bytes, {
    headers: {
      "content-type": row.mime || "image/jpeg",
      "cache-control": "public, max-age=3600"
    }
  });
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
