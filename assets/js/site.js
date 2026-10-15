/* ============================================================
   Sinetik — moteur du site (v3)
   1. CONFIG   : les seules valeurs à modifier au quotidien
   2. Gabarits : en-tête et pied de page, une seule source
   3. Thème    : bascule clair / sombre, mémorisée
   4. Langue   : bascule FR / EN
   5. Boutique : pointures + liens de paiement Stripe
   ============================================================ */

/* ══ 1. CONFIG ═══════════════════════════════════════════════ */
const SINETIK = {

  email: "contact@sinetik.ch",        // ← ton adresse réelle
  city:  "Lausanne",
  defaultLang: "fr",
  defaultTheme: "dark",               // "dark" ou "light"

  /* Prix encore provisoires ? true → badge orange à côté de chaque montant */
  pricesArePlaceholders: true,

  prices: {
    studioStarter : "CHF 49",
    studioClub    : "CHF 189",
    studioElite   : null,             // null → « sur devis »
    trackerUnit   : "CHF 290",
    trackerTeam   : "CHF 4'900",
    trackerAcademy: null,
    ondaPrice     : "CHF 189",
    motionBilan   : "CHF 150",
    motionHybride : "CHF 390",
    motionDistance: "CHF 190"
  },

  /* ── BOUTIQUE : un lien de paiement Stripe par pointure ──
     dashboard.stripe.com → Produits → « Onda FG-01 – EU 42 »
     → Lien de paiement → colle l'URL ici.
     null = pointure épuisée (affichée barrée).                */
  ondaSizes: {
    "36": null, "37": null, "38": null, "39": null,
    "40": null, "41": null, "42": null, "43": null,
    "44": null, "45": null, "46": null, "47": null
  }
};

/* ══ 2. Gabarits communs ═════════════════════════════════════ */
const PAGES = [
  { file:"tracker.html", key:"nav.tracker" },
  { file:"studio.html",  key:"nav.studio"  },
  { file:"origin.html",  key:"nav.motion"  },
  { file:"pure.html",    key:"nav.pure"    }
];

/* ── Multilingue : langues disponibles par page (miroir de generate.mjs) ──
   Sert à construire des liens cohérents par langue (menu, logo, CTA).      */
const PAGE_LANGS = {
  index:["fr","en","de","it"], tracker:["fr","en"], studio:["fr","en"],
  origin:["fr","en"], pure:["fr","en"], motion:["fr","en"], contact:["fr"]
};
const fileForLang = (page, lang) => (lang === "fr" ? `${page}.html` : `${page}-${lang}.html`);
function urlForLang(page, lang){
  const av = PAGE_LANGS[page];
  if(!av) return `${page}.html`;
  const l = [lang, "en", "fr"].find(x => av.includes(x)) || av[0];
  return fileForLang(page, l);
}
const pageBase = file => (file.replace(/\.html$/, "").replace(/-(en|de|it)$/, "")) || "index";
const currentLang = () => document.documentElement.getAttribute("data-page-lang") || SINETIK.defaultLang;
/* Les langues proposées pour CETTE page : data-lang-urls (généré) sinon data-alt-lang (legacy 2 langues). */
function pageLangUrls(){
  const raw = document.documentElement.getAttribute("data-lang-urls");
  if(raw){ try{ return JSON.parse(raw); }catch(e){} }
  const cur = currentLang();
  const out = { [cur]: location.pathname.split("/").pop() || "index.html" };
  const alt = document.documentElement.getAttribute("data-alt-lang");
  if(alt){
    const al = /-en\.html$/.test(alt) ? "en" : /-de\.html$/.test(alt) ? "de" : /-it\.html$/.test(alt) ? "it" : "fr";
    out[al] = alt;
  }
  return out;
}

const MARK = `<svg width="30" height="30" viewBox="0 0 100 100" fill="none" aria-hidden="true">
  <path d="M 18 78 Q 50 12 82 78" stroke="currentColor" stroke-width="9" stroke-linecap="round" fill="none"/>
  <circle cx="50" cy="22" r="7" fill="#0A6CFF"/>
</svg>`;

const wordmark = () =>
  `<a class="wm" href="index.html" aria-label="Sinetik">${MARK}<span class="wm-txt">Sınetık<i>:</i></span></a>`;

const SUN = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>`;
const MOON = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z"/></svg>`;

function buildHeader(){
  const here = location.pathname.split("/").pop() || "index.html";
  const lang = currentLang();
  const links = PAGES.map(p => {
    const url = urlForLang(pageBase(p.file), lang);
    return `<a href="${url}" data-i18n="${p.key}" class="${url === here ? "is-active" : ""}"></a>`;
  }).join("");
  const contactUrl = urlForLang("contact", lang);
  const homeUrl = urlForLang("index", lang);
  const langUrls = pageLangUrls();
  const langButtons = Object.keys(langUrls).map(l =>
    `<button data-lang="${l}" data-url="${langUrls[l]}"${l === lang ? ' aria-pressed="true"' : ""}>${l.toUpperCase()}</button>`
  ).join("");
  return `
  <nav class="nav">
    <div class="nav-in">
      <a class="wm" href="${homeUrl}" aria-label="Sinetik">${MARK}<span class="wm-txt">Sınetık<i>:</i></span></a>
      <div class="nav-links" data-open="false">
        ${links}
        <a href="${contactUrl}" data-i18n="nav.contact" class="${contactUrl === here ? "is-active" : ""}"></a>
        <div class="lang" role="group" aria-label="Language">
          ${langButtons}
        </div>
      </div>
      <button class="icon-btn" id="theme-btn" aria-label="Thème"></button>
      <a class="btn btn-primary btn-sm" href="${contactUrl}" data-i18n="cta.keep"></a>
      <button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </nav>`;
}

function buildFooter(){
  return `
  <footer class="foot">
    <div class="wrap">
      <div class="foot-grid">
        <div>
          ${wordmark()}
          <p style="margin-top:18px;max-width:34ch;color:var(--ink-2);font-size:.92rem" data-i18n="foot.tagline"></p>
        </div>
        <div>
          <h4 data-i18n="foot.h.modules"></h4>
          <ul>
            <li><a href="tracker.html">Sinetik:tracker</a></li>
            <li><a href="studio.html">Sinetik:studio</a></li>
            <li><a href="origin.html">Sinetik:origin</a></li>
            <li><a href="pure.html">Sinetik:pure</a></li>
          </ul>
        </div>
        <div>
          <h4 data-i18n="foot.h.marque"></h4>
          <ul>
            <li><a href="index.html" data-i18n="foot.eco"></a></li>
            <li><a href="contact.html" data-i18n="nav.contact"></a></li>
            <li><a data-email href="#"></a></li>
          </ul>
        </div>
        <div>
          <h4 data-i18n="foot.h.legal"></h4>
          <ul>
            <li><a href="mentions-legales.html" data-i18n="foot.legal"></a></li>
            <li><a href="confidentialite.html" data-i18n="foot.privacy"></a></li>
            <li><a href="cgu.html" data-i18n="foot.cgu"></a></li>
            <li><a href="cgv.html" data-i18n="foot.cgv"></a></li>
            <li><a href="cookies.html" data-i18n="foot.cookies"></a></li>
          </ul>
        </div>
      </div>
      <div class="foot-bottom">
        <span>© ${new Date().getFullYear()} Sinetik — <span data-i18n="foot.based"></span></span>
        <span data-i18n="foot.loop"></span>
      </div>
    </div>
  </footer>`;
}

/* ══ 3. Thème ════════════════════════════════════════════════ */
function applyTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("theme-btn");
  if(btn) btn.innerHTML = theme === "dark" ? SUN : MOON;
  try{ localStorage.setItem("sinetik-theme", theme); }catch(e){}
  // prévient le héros 3D pour qu'il change de palette
  document.dispatchEvent(new CustomEvent("sinetik:theme", { detail:{ theme } }));
}

function initialTheme(){
  try{
    const saved = localStorage.getItem("sinetik-theme");
    if(saved) return saved;
  }catch(e){}
  if(window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  return SINETIK.defaultTheme;
}

/* ══ 4. Traduction ═══════════════════════════════════════════ */
function applyLang(lang){
  const dict = window.SINETIK_I18N || {};
  document.documentElement.lang = lang;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const e = dict[el.getAttribute("data-i18n")];
    if(!e) return;
    const txt = e[lang] || e.fr;
    if(/<[a-z][\s\S]*>/i.test(txt)) el.innerHTML = txt; else el.textContent = txt;
  });

  document.querySelectorAll("[data-i18n-attr]").forEach(el => {
    el.getAttribute("data-i18n-attr").split(",").forEach(pair => {
      const [attr, key] = pair.split(":").map(s => s.trim());
      const e = dict[key];
      if(e) el.setAttribute(attr, e[lang] || e.fr);
    });
  });

  document.querySelectorAll(".lang button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang))
  );

  renderPrices(lang);
  try{ localStorage.setItem("sinetik-lang", lang); }catch(e){}
}

function initialLang(){
  try{
    const saved = localStorage.getItem("sinetik-lang");
    if(saved) return saved;
  }catch(e){}
  return (navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : SINETIK.defaultLang;
}

/* ── Bandeau de détection automatique de langue ──
   Propose (sans forcer) la langue du navigateur si la page existe dans
   cette langue et qu'elle diffère de la langue actuelle. Choix mémorisé.  */
function initLangBanner(){
  let chosen = null;
  try{ chosen = localStorage.getItem("sinetik-lang-choice"); }catch(e){}
  if(chosen) return;                                   // l'utilisateur a déjà choisi

  const urls = pageLangUrls();                          // langues dispo pour cette page
  const cur  = currentLang();
  const prefs = (navigator.languages && navigator.languages.length
                 ? navigator.languages : [navigator.language || ""])
                 .map(s => (s || "").slice(0, 2).toLowerCase());
  const best = prefs.find(l => urls[l]);                // 1ère préférence dispo
  if(!best || best === cur) return;                     // déjà la bonne langue

  const T = {
    fr:{ msg:"Ce site est aussi disponible en français.", go:"Passer au français", close:"Fermer" },
    en:{ msg:"This site is also available in English.",    go:"Switch to English",  close:"Close" },
    de:{ msg:"Diese Seite ist auch auf Deutsch verfügbar.", go:"Auf Deutsch wechseln", close:"Schliessen" },
    it:{ msg:"Questo sito è disponibile anche in italiano.", go:"Passa all'italiano", close:"Chiudi" }
  }[best] || null;
  if(!T) return;

  const remember = v => { try{ localStorage.setItem("sinetik-lang-choice", v); }catch(e){} };

  const bar = document.createElement("div");
  bar.className = "lang-prompt";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", T.msg);
  bar.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;margin:0 auto;max-width:560px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:13px 16px;border-radius:14px;background:rgba(12,14,19,.94);color:#fff;box-shadow:0 12px 44px rgba(0,0,0,.4);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:.94rem;line-height:1.35";

  const txt = document.createElement("span");
  txt.textContent = T.msg;
  txt.style.flex = "1 1 220px";

  const go = document.createElement("a");
  go.href = urls[best];
  go.textContent = T.go;
  go.style.cssText = "background:#0A6CFF;color:#fff;text-decoration:none;padding:8px 15px;border-radius:999px;font-weight:600;white-space:nowrap";
  go.addEventListener("click", () => remember(best));

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", T.close);
  close.textContent = "✕";
  close.style.cssText = "background:transparent;border:0;color:#fff;font-size:1.05rem;cursor:pointer;opacity:.7;padding:4px 6px;line-height:1";
  close.addEventListener("click", () => { remember(cur); bar.remove(); });

  bar.append(txt, go, close);
  document.body.appendChild(bar);
}

/* Remplit chaque <span data-price="studioClub" data-unit="price.month"> */
function renderPrices(lang){
  const dict = window.SINETIK_I18N || {};
  const t = k => (dict[k] ? (dict[k][lang] || dict[k].fr) : "");

  document.querySelectorAll("[data-price]").forEach(el => {
    const val = SINETIK.prices[el.dataset.price];
    if(val === undefined) return;
    if(val === null){
      el.innerHTML = `<span style="font-size:1.1rem">${t("plans.custom")}</span>`;
      return;
    }
    const unit = el.dataset.unit ? ` <small>${t(el.dataset.unit)}</small>` : "";
    const flag = SINETIK.pricesArePlaceholders ? ` <span class="todo">${t("price.tbd")}</span>` : "";
    el.innerHTML = val + unit + flag;
  });
}

/* ══ 5. Boutique ═════════════════════════════════════════════ */
function initShop(){
  const wrap = document.getElementById("sizes");
  if(!wrap) return;
  const btn = document.getElementById("buy");
  const msg = document.getElementById("buy-msg");

  wrap.innerHTML = Object.entries(SINETIK.ondaSizes).map(([size, link]) =>
    `<button class="size" data-size="${size}" ${link ? "" : "disabled"} aria-pressed="false">${size}</button>`
  ).join("");

  let chosen = null;
  wrap.addEventListener("click", e => {
    const b = e.target.closest(".size");
    if(!b || b.disabled) return;
    wrap.querySelectorAll(".size").forEach(s => s.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    chosen = b.dataset.size;
    btn.disabled = false;
  });
  btn.addEventListener("click", () => {
    const link = chosen && SINETIK.ondaSizes[chosen];
    if(link) location.href = link;
  });

  if(!Object.values(SINETIK.ondaSizes).some(Boolean)){
    btn.disabled = true;
    if(msg) msg.hidden = false;
  }
}

/* ══ 6. Bandeau défilant ═════════════════════════════════════ */
function initTicker(){
  const t = document.querySelector(".ticker-in");
  if(t) t.innerHTML += t.innerHTML;   // duplique pour une boucle sans couture
}


/* ══ 8. Mouvement lié au défilement ═══════════════════════════
   Chaque élément marqué reçoit une variable CSS --p qui va de 0
   à 1 pendant qu'il traverse l'écran. Le mouvement suit donc le
   doigt du visiteur et repart en arrière quand il remonte.
   Écrire dans le HTML :  <div data-anim="rise" data-delay="1">
   Valeurs : rise · left · right · drift · grow · fill · draw
   ═════════════════════════════════════════════════════════════ */
function initScrollMotion(){
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = [...document.querySelectorAll("[data-anim]")];
  if(!els.length) return;

  if(reduced){                                   // pas d'animation : tout est en place
    els.forEach(el => { el.style.setProperty("--p", 1); el.classList.add("lit"); });
    return;
  }

  /* longueur réelle des tracés SVG, pour que le trait se dessine juste */
  document.querySelectorAll('[data-anim="draw"] .stroke').forEach(pth => {
    try{ pth.style.setProperty("--len", Math.ceil(pth.getTotalLength())); }catch(e){}
  });

  /* Ce qui est déjà à l'écran au chargement ne doit pas attendre un scroll
     pour apparaître : on le fige en position finale. */
  const vh0 = innerHeight;
  els.forEach(el => {
    if(el.getBoundingClientRect().top < vh0 * .96){
      el.style.setProperty("--p", 1);
      el.classList.add("lit");
      el.dataset.prelit = "1";
    }
  });

  const live = new Set();
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? live.add(e.target) : live.delete(e.target));
    if(live.size) request();
  }, { rootMargin:"14% 0px 14% 0px" });
  els.forEach(el => io.observe(el));

  let queued = false;
  function request(){ if(!queued){ queued = true; requestAnimationFrame(tick); } }

  function tick(){
    queued = false;
    const vh = innerHeight;
    live.forEach(el => {
      if(el.dataset.prelit) return;
      const r = el.getBoundingClientRect();
      const delay = (+el.dataset.delay || 0) * 0.07;      // cascade
      /* 0 quand le haut de l'élément entre par le bas,
         1 quand il a parcouru ~55% de la hauteur d'écran */
      let p = (vh - r.top) / (vh * 0.62) - delay;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      p = p * p * (3 - 2 * p);                            // adoucissement
      el.style.setProperty("--p", p.toFixed(3));
      if(p > .18) el.classList.add("lit");                // déclenche les cascades CSS
    });
    if(live.size) request();
  }

  /* Compteurs : ils partent quand le chiffre entre dans l'écran */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if(e.isIntersecting){ runCount(e.target); cio.unobserve(e.target); }
  }), { threshold:.6 });
  document.querySelectorAll("[data-count]").forEach(el => cio.observe(el));

  addEventListener("scroll", request, { passive:true });
  addEventListener("resize", request, { passive:true });
  request();
}

/* Compteur qui monte une seule fois */
function runCount(el){
  if(el.dataset.counted) return;
  el.dataset.counted = "1";
  const to = parseFloat(el.dataset.count);
  const dec = (el.dataset.count.split(".")[1] || "").length;
  const t0 = performance.now(), dur = 900;
  (function step(now){
    const k = Math.min((now - t0) / dur, 1);
    el.textContent = (to * (1 - Math.pow(1 - k, 3))).toFixed(dec);
    if(k < 1) requestAnimationFrame(step);
  })(t0);
}

/* ══ 9. Rails horizontaux ════════════════════════════════════
   Le défilement de la page reste vertical. Seul le rail bouge
   latéralement : à la main, à la molette horizontale, aux
   flèches du clavier ou aux deux boutons.
   ═════════════════════════════════════════════════════════════ */
function initRails(){
  document.querySelectorAll(".rail").forEach(rail => {
    const wrap = rail.closest(".rail-wrap") || rail.parentElement;
    const prev = wrap.querySelector("[data-rail=prev]");
    const next = wrap.querySelector("[data-rail=next]");
    const bar  = wrap.querySelector(".rail-progress b");

    const step = () => (rail.firstElementChild?.getBoundingClientRect().width || 340) + 20;

    function sync(){
      const max = rail.scrollWidth - rail.clientWidth;
      if(prev) prev.disabled = rail.scrollLeft < 8;
      if(next) next.disabled = rail.scrollLeft > max - 8;
      if(bar){
        const seen = max > 0 ? rail.scrollLeft / max : 0;
        const share = rail.clientWidth / rail.scrollWidth;
        bar.style.width = Math.min(share * 100, 100) + "%";
        bar.style.transform = `translateX(${seen * (100 / share - 100)}%)`;
      }
    }
    rail.addEventListener("scroll", sync, { passive:true });
    addEventListener("resize", sync, { passive:true });

    prev?.addEventListener("click", () => rail.scrollBy({ left:-step(), behavior:"smooth" }));
    next?.addEventListener("click", () => rail.scrollBy({ left: step(), behavior:"smooth" }));

    rail.tabIndex = 0;
    rail.addEventListener("keydown", e => {
      if(e.key === "ArrowRight"){ e.preventDefault(); rail.scrollBy({ left: step(), behavior:"smooth" }); }
      if(e.key === "ArrowLeft"){  e.preventDefault(); rail.scrollBy({ left:-step(), behavior:"smooth" }); }
    });

    /* glisser à la souris — sans gêner le clic sur les cartes */
    let down = false, x0 = 0, s0 = 0, moved = 0;
    rail.addEventListener("pointerdown", e => {
      if(e.pointerType === "touch") return;          // le tactile gère déjà très bien
      down = true; moved = 0; x0 = e.clientX; s0 = rail.scrollLeft;
      rail.classList.add("dragging");
    });
    addEventListener("pointermove", e => {
      if(!down) return;
      const d = e.clientX - x0;
      moved = Math.max(moved, Math.abs(d));
      rail.scrollLeft = s0 - d;
    });
    addEventListener("pointerup", () => {
      if(!down) return;
      down = false; rail.classList.remove("dragging");
      if(moved > 6){                                  // c'était un glissement, pas un clic
        const kill = e => { e.preventDefault(); e.stopPropagation(); };
        rail.addEventListener("click", kill, { capture:true, once:true });
        setTimeout(() => rail.removeEventListener("click", kill, true), 60);
      }
    });

    sync();
  });
}

/* ══ 7. Démarrage ════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  const head = document.getElementById("site-header");
  const foot = document.getElementById("site-footer");
  if(head) head.innerHTML = buildHeader();
  if(foot) foot.innerHTML = buildFooter();

  document.querySelectorAll("[data-email]").forEach(el => {
    el.textContent = SINETIK.email;
    if(el.tagName === "A") el.href = "mailto:" + SINETIK.email;
  });

  applyTheme(initialTheme());
  // Le header/footer suit la langue RÉELLE de la page (data-page-lang),
  // pas un réglage mémorisé — sinon page moitié FR / moitié EN.
  applyLang(document.documentElement.getAttribute("data-page-lang") || SINETIK.defaultLang);
  initShop();
  initTicker();

  const tbtn = document.getElementById("theme-btn");
  if(tbtn) tbtn.addEventListener("click", () =>
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark")
  );

  // Le bouton de langue NAVIGUE vers le fichier de la langue choisie
  // (chaque page a sa version par langue). On mémorise le choix pour
  // ne plus proposer la détection automatique ensuite.
  document.querySelectorAll(".lang button").forEach(b =>
    b.addEventListener("click", () => {
      if(b.dataset.lang === currentLang()) return;          // déjà cette langue
      try{ localStorage.setItem("sinetik-lang-choice", b.dataset.lang); }catch(e){}
      if(b.dataset.url) location.href = b.dataset.url;       // bascule de fichier
    })
  );

  initLangBanner();

  const burger = document.querySelector(".burger");
  const links  = document.querySelector(".nav-links");
  if(burger && links){
    burger.addEventListener("click", () => {
      const open = links.dataset.open === "true";
      links.dataset.open = String(!open);
      burger.setAttribute("aria-expanded", String(!open));
    });
  }

  const nav = document.querySelector(".nav");
  const onScroll = () => nav && nav.classList.toggle("scrolled", scrollY > 24);
  addEventListener("scroll", onScroll, { passive:true });
  onScroll();

  initScrollMotion();
  initRails();

  const form = document.getElementById("contact-form");
  if(form){
    form.addEventListener("submit", e => {
      e.preventDefault();
      const v = id => (form.querySelector("#" + id)?.value || "").trim();
      const subject = `[Sinetik] ${v("subject")} — ${v("name")}`;
      const body = [v("message"), "", "—", v("name"), v("org"), v("email")].filter(Boolean).join("\n");
      location.href = `mailto:${SINETIK.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
});
