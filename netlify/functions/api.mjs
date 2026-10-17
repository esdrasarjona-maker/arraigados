// Arraigados: servidor de grupos (Netlify Functions + Netlify Blobs).
// No hace falta configurar ninguna base de datos: Netlify guarda los datos automáticamente.
import { getStore } from "@netlify/blobs";
import { notifyUser } from "./push.mjs";

const clip = (s, n) => String(s ?? "").slice(0, n);
const okCode = (c) => /^[A-Z2-9]{6}$/.test(c || "");
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });

function view(g, uid) {
  return { name: g.name, members: g.members || {}, pets: g.pets || {}, animos: (g.animos || {})[uid] || [] };
}

function mutate(g, a, b, out = []) {
  g.members ||= {}; g.pets ||= {}; g.animos ||= {};
  const uid = clip(b.uid, 40);
  if (a === "sync" && uid) {
    const m = b.member || {}, t = m.today || {};
    g.members[uid] = {
      name: clip(m.name, 40), stage: +m.stage || 0, streak: +m.streak || 0, total: +m.total || 0,
      L: +m.L || 0, V: +m.V || 0, p: +m.p || 0, read: clip(m.read, 60), day: clip(m.day, 10),
      today: { r: !!t.r, p: !!t.p, m: !!t.m }, w: Math.min(7, +m.w || 0), wk: clip(m.wk, 10), mentor: clip(m.mentor, 40), at: Date.now(),
    };
  }
  if (a === "leave" && uid) delete g.members[uid];
  if (a === "pet") {
    const id = clip(b.id, 40), p = b.pet || {};
    if (id && Object.keys(g.pets).length < 300)
      g.pets[id] = { t: clip(p.t, 200), name: clip(p.name, 40), by: clip(p.by, 40), at: Date.now(), answered: false, oran: [] };
  }
  if (a === "pray") {
    const p = g.pets[clip(b.id, 40)];
    if (p && uid) { const s = new Set(p.oran || []); if (s.has(uid)) s.delete(uid); else { s.add(uid); if (p.by && p.by !== uid) out.push([p.by, { title: "🙏 Están orando por ti", body: (g.members[uid]?.name || "Alguien de tu grupo") + " está orando por: «" + p.t.slice(0, 80) + "»" }]); } p.oran = [...s]; }
  }
  if (a === "answer") {
    const p = g.pets[clip(b.id, 40)];
    if (p) { p.answered = true; p.at = Date.now(); }
  }
  if (a === "animo") {
    const to = clip(b.to, 40), x = b.a || {};
    if (to) { g.animos[to] = [{ fromName: clip(x.fromName, 40), vid: clip(x.vid, 20), kind: clip(x.kind, 20), at: Date.now() }, ...(g.animos[to] || [])].slice(0, 20); out.push([to, { title: clip(x.fromName, 40) || "Alguien de tu grupo", body: clip(x.text, 160) || "Te ha enviado un mensaje de ánimo." }]); }
  }
  // Limpieza: peticiones respondidas hace más de 60 días
  const old = Date.now() - 60 * 864e5;
  for (const [k, p] of Object.entries(g.pets)) if (p.answered && p.at < old) delete g.pets[k];
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  let b;
  try { b = await req.json(); } catch { return json({ error: "bad" }, 400); }
  const a = b.action;
  if (a === "ping") return json({ ok: true });
  const code = clip(b.code, 6).toUpperCase();
  if (!okCode(code)) return json({ error: "code" }, 400);
  const store = getStore({ name: "arraigados", consistency: "strong" });
  const key = "g/" + code;

  if (a === "get") {
    const g = await store.get(key, { type: "json" });
    return json(g ? view(g, clip(b.uid, 40)) : { name: null });
  }
  if (a === "create") {
    const ex = await store.get(key, { type: "json" });
    if (ex) return json({ error: "exists" }, 409);
    const g = { name: clip(b.name, 40) || "Mi grupo", at: Date.now(), members: {}, pets: {}, animos: {} };
    await store.setJSON(key, g);
    return json(view(g, clip(b.uid, 40)));
  }
  for (let i = 0; i < 6; i++) {
    const r = await store.getWithMetadata(key, { type: "json" });
    if (!r || !r.data) return json({ error: "nogroup" }, 404);
    const g = r.data, out = [];
    mutate(g, a, b, out);
    let res;
    try { res = await store.setJSON(key, g, r.etag ? { onlyIfMatch: r.etag } : undefined); }
    catch { res = await store.setJSON(key, g); }
    if (!res || res.modified !== false) { await Promise.all(out.map(([to, p]) => notifyUser(store, to, p))); return json(view(g, clip(b.uid, 40))); }
    await new Promise((ok) => setTimeout(ok, 80 + Math.random() * 200));
  }
  return json({ error: "busy" }, 503);
};

export const config = { path: "/api" };
