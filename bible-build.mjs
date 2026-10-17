// Reina-Valera 1909 (dominio público). Fuente: ebible.org vía github.com/seven1m/open-bibles
// Se descarga al publicar y se guarda en /bible/NN.json (un archivo por libro).
import { mkdir, writeFile } from "node:fs/promises";
const SRC = "https://raw.githubusercontent.com/seven1m/open-bibles/master/spa-rv1909.usfx.xml";
const ent = s => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
// Ortografía actual de las tildes (mismas palabras, sin cambiar el texto): á→a, fué→fue, destituídos→destituidos…
export function modern(s) {
  return s
    .replace(/(^|[^\p{L}])([áéóú])(?=[^\p{L}]|$)/gu, (m, a, v) => a + ({ "á": "a", "é": "e", "ó": "o", "ú": "u" })[v])
    .replace(/(^|[^\p{L}])([ÁÉÓÚ])(?=[^\p{L}]|$)/gu, (m, a, v) => a + ({ "Á": "A", "É": "E", "Ó": "O", "Ú": "U" })[v])
    .replace(/(^|[^\p{L}])(F|f)u([éí])(?=[^\p{L}]|$)/gu, (m, a, f, v) => a + f + "u" + (v === "é" ? "e" : "i"))
    .replace(/(^|[^\p{L}])(D|d|V|v)ió(?=[^\p{L}]|$)/gu, (m, a, d) => a + d + "io")
    .replace(/(^|[^\p{L}])(H|h)uí(?=[^\p{L}]|$)/gu, (m, a, h) => a + h + "ui")
    .replace(/uí(?=\p{L})/gu, "ui");
}
const capFirst = s => s.replace(/^((?:[¡¿«(]?\p{L}{1,3}[,]?\s+){0,2}?[¡¿«(]?)([A-ZÁÉÍÓÚÑ]{2,})(?=[^\p{L}]|$)/u, (m, p, w) => p + (/\p{L}/u.test(p) ? w.toLowerCase() : w[0] + w.slice(1).toLowerCase()));
export function parse(t) {
  const books = [];
  for (const bp of t.split(/<book id="/).slice(1)) {
    const code = bp.slice(0, 3), name = ((bp.match(/<h>([^<]*)<\/h>/) || [])[1] || code).trim();
    const c = [], tt = {};
    bp.split(/<c id="\d+"\s*\/>/).slice(1).forEach((cp, ci) => {
      const vs = [];
      for (const vp of cp.split(/<v id="/).slice(1)) {
        const n = parseInt(vp, 10);
        let b = vp.replace(/^[^>]*>/, "").split(/<ve\s*\/>/)[0];
        b = b.replace(/<f\b[\s\S]*?<\/f>/g, "").replace(/<x\b[\s\S]*?<\/x>/g, "").replace(/<[^>]+>/g, "");
        b = ent(b).replace(/\s+/g, " ").trim();
        if (code === "PSA" && ci === 118) b = b.replace(/^[A-ZÁÉÍÓÚÑ]{2,6}\.?\s+(?=[¡¿]?\p{Lu})/u, "");
        if (n === 1) {
          if (code === "PSA" && !/^[¡¿]?[A-ZÁÉÍÓÚÑ]{2,}/u.test(b)) { const m = b.match(/^(.*?[.:])\s+([¡¿]?[A-ZÁÉÍÓÚÑ]{2,}[\s\S]*)$/u); if (m && m[1].length < 160) { tt[ci + 1] = modern(m[1]); b = m[2]; } }
          b = capFirst(b);
        }
        vs[n - 1] = modern(b);
      }
      c.push(vs.map(v => v || ""));
    });
    books.push({ code, name, c, tt });
  }
  return books;
}
export async function buildBible() {
  try {
    const r = await fetch(SRC);
    if (!r.ok) throw new Error(r.status);
    const B = parse(await r.text());
    if (B.length !== 66) throw new Error("libros: " + B.length);
    await mkdir("bible", { recursive: true });
    let nv = 0;
    for (let i = 0; i < 66; i++) {
      const b = B[i]; nv += b.c.reduce((a, x) => a + x.length, 0);
      await writeFile("bible/" + String(i + 1).padStart(2, "0") + ".json", JSON.stringify({ code: b.code, c: b.c, tt: b.tt }));
    }
    await writeFile("bible/ok.json", JSON.stringify({ v: "RV1909", books: 66, verses: nv }));
    console.log("Biblia RV1909:", nv, "versículos");
  } catch (e) { console.log("Biblia no descargada (la app enlazará a BibleGateway):", e.message); }
}
