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

// Las mismas preguntas «para rumiar hoy» que la app (mismo orden), para que el aviso traiga la de cada día
const RUMIA = ["¿Qué cambia hoy en ti saber que Dios te amó primero, sin esperar nada a cambio?","¿En qué parte de tu vida te cuesta creer que «nada te faltará»?","¿En qué decisión de hoy estás estribando en tu propia prudencia?","¿Qué carga llevas hoy que Jesús te invita a dejarle?","¿Qué misericordia nueva de Dios puedes reconocer esta mañana?","¿Qué estás intentando hacer hoy «sin Él»?","¿Qué «agua» está alimentando tus raíces estos días?","¿Qué preocupación concreta puedes convertir hoy en oración y gratitud?","¿Dónde te cuesta ver ahora mismo que Dios obra para bien?","¿A qué tienes miedo hoy? Pon su nombre delante de Dios.","¿Qué ocupa el primer lugar en tu agenda de hoy?","¿En qué gesto de hoy podría verse que Cristo vive en ti?","¿Qué debilidad tuya podría ser hoy el lugar donde se vea su gracia?","¿A quién necesitas perdonar como Dios te perdonó a ti?","¿Cómo podría alguien notar hoy que eres discípulo de Jesús?","¿Qué idea de «este siglo» necesitas que Dios renueve en tu mente?","¿Dónde buscas refugio cuando las cosas se complican?","¿En qué te has cansado de esperar? ¿Qué te promete Dios aquí?","¿Qué solicitud o inquietud echarás hoy sobre Él?","¿Qué te impide acercarte confiadamente a Dios hoy?","¿Qué pensamiento de paz quiere Dios sembrar en tu manera de ver el futuro?","¿Qué obra buena, pequeña y concreta, puedes hacer hoy para que otros glorifiquen al Padre?","¿Por qué otros «caminos» te sientes tentado a buscar vida o verdad?","¿Qué «cosa vieja» sigues cargando que Cristo ya hizo pasar?","¿Hay algo que necesitas confesar hoy para vivir en la luz?","¿Intentas ganarte con algo el amor de Dios? ¿Cómo sería descansar en su gracia?","Cristo murió por ti siendo aún pecador. ¿Qué te dice eso de tu valor para Él?","¿Qué paso del camino de hoy necesita la luz de su Palabra?","¿Qué versículo necesitas guardar en el corazón para esta semana?","¿Cómo puedes amar hoy a Dios con tu mente, y no solo con tus sentimientos?","¿Dónde necesitas hoy valentía sabiendo que Dios estará contigo?","¿Qué camino tuyo necesitas encomendar a Jehová en vez de controlarlo?","¿Qué parte de tu corazón le pedirías hoy a Dios que limpie?","Él fue herido por tus rebeliones. ¿Cómo responde tu corazón a ese amor?","¿Cómo cambia tu día saberte hijo o hija de Dios?","¿Qué mentira sobre ti o sobre Dios necesita hoy la verdad que libera?","¿Cómo mira la esperanza de la resurrección lo que te duele hoy?","¿Ante quién podrías ser hoy testigo de Jesús, con palabras o con hechos?","¿Qué tentación conoces bien? ¿Cuál es la «salida» que Dios te da?","¿Para qué necesitas hoy su fuerza y no la tuya?","¿Qué obra buena ha empezado Dios en ti y te cuesta creer que la terminará?","¿Con quién puedes practicar hoy la humildad de estimarle por encima de ti?","¿Qué temor quiere Dios cambiar hoy por fortaleza, amor o dominio propio?","¿Qué significa para ti hoy «buscar» a Dios?","¿En qué situación necesitas pedir sabiduría a Dios?","¿Con quién necesitas ser hoy pronto para oír y tardío para hablar?","¿Qué don ha puesto Dios en ti para servir a otros esta semana?","¿Cómo puede el amor que recibes de Dios notarse en tu forma de amar?","¿Qué puerta de tu vida tienes aún entornada para Jesús?","¿Qué lágrima tuya espera la promesa de que Dios la limpiará?","¿En qué bien te estás cansando de hacer? ¿Qué te anima a seguir?","¿Qué trabajo tuyo en el Señor parece pequeño, pero no es vano?","¿Qué peso podrías dejar para correr con más libertad?","¿Por quién de tu grupo puedes orar hoy por su nombre?","¿A quién podrías levantar hoy si está cayendo?","¿A quién puedes estimular hoy al amor y a las buenas obras?","¿Dónde necesitas hoy ser constante en la oración?","¿Qué fruto del Espíritu echas más en falta en tu día a día?","¿Cómo se ve, en concreto, «andar en Él» en lo que tienes por delante hoy?","¿Qué culpa te sigue acusando aunque en Cristo ya no hay condenación?","¿Qué te da seguridad cuando dudas de tu fe?"];

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
    const [yy, mo, dd] = now.day.split("-").map(Number), dn = Math.floor(Date.UTC(yy, mo - 1, dd) / 864e5);
    const body = "Para rumiar hoy: " + RUMIA[dn % RUMIA.length] + (r.name ? " · " + r.name + ", tu tiempo con Dios te espera." : " · Tu tiempo con Dios te espera.");
    try {
      await webpush.sendNotification(r.sub, JSON.stringify({ title: "Arraigados", body }), { TTL: 3600 });
      r.last = now.day; await store.setJSON(key, r);
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await store.delete(key);
    }
  }
};
export const config = { schedule: "*/15 * * * *" };
