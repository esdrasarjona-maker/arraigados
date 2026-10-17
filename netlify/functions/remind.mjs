// Arraigados: cada 15 minutos envía el recordatorio a quien le toque según su hora local.
import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import { keys } from "./push.mjs";

const VERSOS = [
  "Nuevas son cada mañana sus misericordias (Lamentaciones 3:23)",
  "Lámpara es a mis pies tu palabra (Salmo 119:105)",
  "Permaneced en mí, y yo en vosotros (Juan 15:4)",
  "Venid a mí todos los que estáis trabajados y cargados (Mateo 11:28)",
  "Buscad primeramente el reino de Dios (Mateo 6:33)",
  "Jehová es mi pastor; nada me faltará (Salmo 23:1)",
  "Por nada estéis afanosos (Filipenses 4:6)",
  "Fíate de Jehová de todo tu corazón (Proverbios 3:5)",
  "Todo lo puedo en Cristo que me fortalece (Filipenses 4:13)",
  "En mi corazón he guardado tus dichos (Salmo 119:11)",
  "Los que esperan a Jehová tendrán nuevas fuerzas (Isaías 40:31)",
  "Arraigados y sobreedificados en él (Colosenses 2:7)",
  "Nosotros le amamos a él, porque él nos amó primero (1 Juan 4:19)",
  "Estad quietos, y conoced que yo soy Dios (Salmo 46:10)",
];

function localNow(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  const h = p.hour === "24" ? "00" : p.hour;
  return { day: `${p.year}-${p.month}-${p.day}`, min: (+h) * 60 + (+p.minute) };
}

export default async () => {
  const store = getStore({ name: "arraigados", consistency: "strong" });
  const k = await keys(store);
  webpush.setVapidDetails(process.env.URL || "https://arraigandonos.netlify.app", k.publicKey, k.privateKey);
  const { blobs } = await store.list({ prefix: "push/" });
  const n = Math.floor(Date.now() / 864e5);
  for (const { key } of blobs) {
    const r = await store.get(key, { type: "json" });
    if (!r || !r.sub || r.daily === false) continue;
    const now = localNow(r.tz || "Europe/Madrid");
    const [hh, mm] = r.time.split(":").map(Number), want = hh * 60 + mm;
    let diff = now.min - want; if (diff < 0) diff += 1440;
    if (diff > 20 || r.last === now.day) continue;
    const body = (r.name ? r.name + ", tu" : "Tu") + " maná de hoy te espera. «" + VERSOS[n % VERSOS.length] + "»";
    try {
      await webpush.sendNotification(r.sub, JSON.stringify({ title: "Arraigados", body }), { TTL: 3600 });
      r.last = now.day; await store.setJSON(key, r);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await store.delete(key);
    }
  }
};
export const config = { schedule: "*/15 * * * *" };
