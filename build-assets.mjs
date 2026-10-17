// Se ejecuta en Netlify al publicar: descarga las fuentes y la librería QR para servirlas
// desde la propia web (sin enviar datos de los usuarios a Google ni a otros servidores).
import { mkdir, writeFile } from "node:fs/promises";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CSS = "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;1,7..72,400;1,7..72,500&family=Noto+Serif+Hebrew:wght@400;600&display=swap";
await mkdir("fonts", { recursive: true });
try {
  let css = await (await fetch(CSS, { headers: { "user-agent": UA } })).text();
  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) || [])];
  let i = 0;
  for (const u of urls) {
    const name = "f" + (i++) + ".woff2";
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    await writeFile("fonts/" + name, buf);
    css = css.split(u).join(name);
  }
  await writeFile("fonts/fonts.css", css);
  console.log("Fuentes locales:", urls.length);
} catch (e) { console.log("Fuentes: se usarán las del sistema", e.message); await writeFile("fonts/fonts.css", "/* sin fuentes descargadas */"); }
try {
  const js = await (await fetch("https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js")).text();
  if (js.length > 1000) await writeFile("qrcode.min.js", js);
} catch (e) { console.log("QR no descargado", e.message); }
// Fotos de Unsplash para las imágenes de estados (licencia Unsplash: uso libre).
const PHOTOS = ["photo-1506905925346-21bda4d32df4","photo-1490682143684-14369e18dce8","photo-1757911012241-1d4ba690e2fe","photo-1657301220886-b9b08555c783","photo-1600721860729-d90ff446f6fa","photo-1606161175543-279a2a09b1ec","photo-1663827699241-eadfcb6e2686","photo-1464852045489-bccb7d17fe39","photo-1525824236856-8c0a31dfe3be","photo-1757642520331-e31d18996443","photo-1763844598924-2f13f94caa4c","photo-1511860810434-a92f84c6f01e","photo-1507400492013-162706c8c05e"];
await mkdir("photos", { recursive: true });
let okP = 0;
for (const id of PHOTOS) {
  for (const [suf, q] of [["", "w=1080&h=1920&fit=crop&q=78&fm=jpg"], ["-t", "w=240&h=320&fit=crop&q=70&fm=jpg"]]) {
    try {
      const r = await fetch("https://images.unsplash.com/" + id + "?" + q);
      if (!r.ok) throw new Error(r.status);
      await writeFile("photos/" + id + suf + ".jpg", Buffer.from(await r.arrayBuffer()));
      okP++;
    } catch (e) { console.log("Foto no descargada", id, suf, e.message); }
  }
}
console.log("Fotos locales:", okP);
import { buildBible } from "./bible-build.mjs";
await buildBible();
