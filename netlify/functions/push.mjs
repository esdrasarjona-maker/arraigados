// Arraigados: recordatorios diarios (Web Push). Las claves se crean solas la primera vez.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { createHash } from "node:crypto";

const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export async function keys(store) {
  let k = await store.get("vapid", { type: "json" });
  if (!k) { k = webpush.generateVAPIDKeys(); await store.setJSON("vapid", k); }
  return k;
}
const idOf = (ep) => "push/" + createHash("sha256").update(String(ep)).digest("hex").slice(0, 32);
const okTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || "");

export default async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  let b; try { b = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const store = getStore({ name: "arraigados", consistency: "strong" });
  const k = await keys(store);
  if (b.action === "key") return json({ key: k.publicKey });
  const sub = b.sub || {};
  if (!sub.endpoint || String(sub.endpoint).length > 1000) return json({ error: "sub" }, 400);
  const id = idOf(sub.endpoint);
  if (b.action === "subscribe") {
    if (!okTime(b.time)) return json({ error: "time" }, 400);
    let tz = String(b.tz || "Europe/Madrid").slice(0, 60);
    try { new Intl.DateTimeFormat("es", { timeZone: tz }); } catch { tz = "Europe/Madrid"; }
    const prev = await store.get(id, { type: "json" });
    await store.setJSON(id, { sub, time: b.time, tz, name: String(b.name || "").slice(0, 40), last: prev?.last || "" });
    return json({ ok: true });
  }
  if (b.action === "unsubscribe") { await store.delete(id); return json({ ok: true }); }
  if (b.action === "test") {
    webpush.setVapidDetails(process.env.URL || "https://arraigandonos.netlify.app", k.publicKey, k.privateKey);
    try {
      await webpush.sendNotification(sub, JSON.stringify({ title: "Arraigados", body: "¡Así te llegará tu recordatorio cada día! «Lámpara es a mis pies tu palabra» (Salmo 119:105)" }));
      return json({ ok: true });
    } catch (e) { return json({ error: "send", code: e.statusCode || 0 }, 500); }
  }
  return json({ error: "action" }, 400);
};
export const config = { path: "/api/push" };
