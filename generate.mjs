#!/usr/bin/env node
/* ============================================================
   Sinetik — générateur de pages multilingues
   Lit  src/pages/<page>.html  +  src/i18n/<page>.json
   Écrit à la racine : <page>.html (fr), <page>-<lang>.html (autres)
   Lancer :  node generate.mjs
   ============================================================ */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));

const SITE = {
  base: "https://www.sinetik.ch/",
  // Pages à GÉNÉRER et dans quelles langues :
  generate: {
    index: ["fr", "en", "de", "it"],
    "mentions-legales": ["fr", "en", "de", "it"],
    "confidentialite": ["fr", "en", "de", "it"],
    "cgu": ["fr", "en", "de", "it"],
    "cgv": ["fr", "en", "de", "it"],
    "cookies": ["fr", "en", "de", "it"],
  },
  // Toutes les pages EXISTANTES et leurs langues (pour résoudre les liens) :
  pageLangs: {
    index:   ["fr", "en", "de", "it"],
    tracker: ["fr", "en"],
    studio:  ["fr", "en"],
    origin:  ["fr", "en"],
    pure:    ["fr", "en"],
    motion:  ["fr", "en"],
    contact: ["fr"],
    "mentions-legales": ["fr", "en", "de", "it"],
    "confidentialite": ["fr", "en", "de", "it"],
    "cgu": ["fr", "en", "de", "it"],
    "cgv": ["fr", "en", "de", "it"],
    "cookies": ["fr", "en", "de", "it"],
  },
};

// Nom de fichier d'une page dans une langue (fr = sans suffixe)
const fileFor = (page, lang) => (lang === "fr" ? `${page}.html` : `${page}-${lang}.html`);

// Lien vers une page dans la langue voulue, avec repli lang → en → fr
function urlFor(page, lang) {
  const avail = SITE.pageLangs[page];
  if (!avail) return `${page}.html`; // page inconnue : lien brut
  const chosen = [lang, "en", "fr"].find((l) => avail.includes(l)) || avail[0];
  return fileFor(page, chosen);
}

// Balises <link alternate hreflang> + canonical pour une page/langue
function headAlternates(page, lang) {
  const langs = SITE.generate[page] || [lang];
  const lines = [`<link rel="canonical" href="${SITE.base}${fileFor(page, lang)}">`];
  for (const l of langs) lines.push(`<link rel="alternate" hreflang="${l}" href="${SITE.base}${fileFor(page, l)}">`);
  const def = langs.includes("fr") ? "fr" : langs[0];
  lines.push(`<link rel="alternate" hreflang="x-default" href="${SITE.base}${fileFor(page, def)}">`);
  return lines.join("\n");
}

let totalFiles = 0;
const problems = [];

for (const [page, langs] of Object.entries(SITE.generate)) {
  const template = readFileSync(join(ROOT, "src", "pages", `${page}.html`), "utf8");
  const dict = JSON.parse(readFileSync(join(ROOT, "src", "i18n", `${page}.json`), "utf8"));

  // Map des fichiers par langue pour cette page (pour le sélecteur de langue)
  const langUrls = {};
  for (const l of langs) langUrls[l] = fileFor(page, l);

  for (const lang of langs) {
    let out = template;

    // 1) Textes {{t:clé}}
    out = out.replace(/\{\{t:([^}]+)\}\}/g, (_, key) => {
      const entry = dict[key.trim()];
      if (!entry) { problems.push(`[${page}/${lang}] clé i18n absente : ${key.trim()}`); return `«${key.trim()}»`; }
      if (entry[lang] == null) { problems.push(`[${page}/${lang}] traduction manquante : ${key.trim()} → repli FR`); return entry.fr ?? ""; }
      return entry[lang];
    });

    // 2) Liens {{url:page}} (cohérents par langue, avec repli)
    out = out.replace(/\{\{url:([^}]+)\}\}/g, (_, p) => urlFor(p.trim(), lang));

    // 3) Placeholders techniques
    out = out.replace(/\{\{lang\}\}/g, lang);
    out = out.replace(/\{\{langUrls\}\}/g, JSON.stringify(langUrls));
    out = out.replace(/\{\{ogUrl\}\}/g, `${SITE.base}${fileFor(page, lang)}`);
    out = out.replace(/\{\{headAlternates\}\}/g, headAlternates(page, lang));

    // 4) Garde-fou : aucun token ne doit rester
    const leftover = out.match(/\{\{[^}]+\}\}/g);
    if (leftover) problems.push(`[${page}/${lang}] tokens non résolus : ${[...new Set(leftover)].join(", ")}`);

    const dest = join(ROOT, fileFor(page, lang));
    writeFileSync(dest, out, "utf8");
    totalFiles++;
    console.log(`  ✓ ${fileFor(page, lang)}`);
  }
}

console.log(`\n${totalFiles} fichier(s) généré(s).`);
if (problems.length) {
  console.log(`\n⚠️  ${problems.length} point(s) à vérifier :`);
  for (const p of problems) console.log("   - " + p);
  process.exitCode = 1;
} else {
  console.log("✅ Aucun problème détecté (toutes les clés présentes, aucun token résiduel).");
}
