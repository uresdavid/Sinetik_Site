/* ============================================================
   Sinetik — héros 3D (WebGL / Three.js)

   Deux familles de scènes :
   • "orbit"  — l'accueil. Un noyau, quatre nœuds sur des anneaux
                inclinés, reliés par des arcs. Chaque nœud porte
                une étiquette HTML projetée depuis la 3D.
   • les champs de particules — une signature de mouvement par
                branche (impulsion, grille, tracé, matière).

   La scène se lit sur <div id="hero3d" data-scene="…">.
   Les couleurs suivent le thème clair / sombre automatiquement.
   ============================================================ */

import * as THREE from './vendor/three.module.min.js';

/* Les quatre nœuds de l'orbite. L'ordre fixe leur position sur l'anneau. */
const NODES = [
  { key:'tracker', label:'Sinetik:tracker', verb:{fr:'Capter',    en:'Capture'},   href:'tracker.html' },
  { key:'studio',  label:'Sinetik:studio',  verb:{fr:'Analyser',  en:'Analyse'},   href:'studio.html'  },
  { key:'motion',  label:'Sinetik:origin',  verb:{fr:'Entraîner', en:'Train'},     href:'origin.html'  },
  { key:'pure',    label:'Sinetik:pure',    verb:{fr:'Équiper',   en:'Equip'},     href:'pure.html'    }
];

/* Champs de particules : une signature par branche.
   mode 1 grille · 2 impulsions · 3 houle · 4 flux diagonal */
const FIELDS = {
  studio:  { mode:1, density:.85, speed:.40, tint:0x0A6CFF, tilt:-.72 },
  tracker: { mode:2, density:1.10, speed:.55, tint:0x3D8BFF, tilt:-.62 },
  pure:    { mode:3, density:.90, speed:.30, tint:0x0A6CFF, tilt:-.58 },
  motion:  { mode:4, density:.95, speed:.62, tint:0x3D8BFF, tilt:-.36 },
  contact: { mode:4, density:.60, speed:.30, tint:0x0A6CFF, tilt:-.40 }
};

const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Un point rond et doux, dessiné en mémoire.
   Sans lui, THREE.PointsMaterial rend des carrés. */
function softSprite(){
  const n = 64, cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(n/2, n/2, 0, n/2, n/2, n/2);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(.45, 'rgba(255,255,255,.5)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, n, n);
  const t = new THREE.CanvasTexture(cv);
  t.needsUpdate = true;
  return t;
}

/* ══════════════ Scène 1 — l'orbite ══════════════ */
function buildOrbit(host, renderer){
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, .1, 100);
  camera.position.set(0, 1.5, 7.4);
  camera.lookAt(0, 0, 0);

  const world = new THREE.Group();
  world.rotation.x = -0.52;
  scene.add(world);

  const BLUE = new THREE.Color(0x0A6CFF);
  const PALE = new THREE.Color(0x3D8BFF);

  /* — Noyau : sphère pleine + deux coques en fil contre-tournantes + halo lumineux — */
  const core = new THREE.Group();
  core.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(.42, 3),
    new THREE.MeshBasicMaterial({ color:BLUE })
  ));
  const halo = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.82, 2),
    new THREE.MeshBasicMaterial({ color:BLUE, wireframe:true, transparent:true, opacity:.28 })
  );
  core.add(halo);
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 1),
    new THREE.MeshBasicMaterial({ color:PALE, wireframe:true, transparent:true, opacity:.14 })
  );
  core.add(shell);
  /* halo lumineux additif : le noyau « s'allume » */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map:softSprite(), color:PALE, transparent:true, opacity:.5,
    blending:THREE.AdditiveBlending, depthWrite:false
  }));
  glow.scale.setScalar(3.4);
  core.add(glow);
  world.add(core);

  /* — Anneaux inclinés — */
  const R = [2.20, 2.80, 3.40, 4.00];
  const TILT = [.00, .20, -.16, .30];
  const rings = [];
  R.forEach((r, i) => {
    const g = new THREE.RingGeometry(r - .004, r + .004, 220);
    const m = new THREE.MeshBasicMaterial({ color:BLUE, transparent:true, opacity:.26, side:THREE.DoubleSide });
    const ring = new THREE.Mesh(g, m);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.y = TILT[i];
    world.add(ring);
    rings.push(m);
  });

  /* — Les quatre nœuds — */
  const nodes = NODES.map((n, i) => {
    const g = new THREE.Group();
    const ballMat = new THREE.MeshBasicMaterial({ color:PALE });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 24), ballMat));
    const ringGeo = new THREE.RingGeometry(.29, .33, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color:BLUE, transparent:true, opacity:.75, side:THREE.DoubleSide });
    const halo2 = new THREE.Mesh(ringGeo, ringMat);
    g.add(halo2);
    world.add(g);
    return {
      group:g, halo:halo2, mat:ringMat, ball:ballMat,
      radius:R[i], tilt:TILT[i],
      phase:(i / NODES.length) * Math.PI * 2,
      speed:.16 + i * .022,
      key:NODES[i].key
    };
  });

  /* — Arcs de lumière : du noyau vers chacun des quatre nœuds — */
  const ARC_PTS = 48;
  const arcs = NODES.map(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_PTS * 3), 3));
    const m = new THREE.LineBasicMaterial({ color:PALE, transparent:true, opacity:.5 });
    world.add(new THREE.Line(g, m));
    return { geo:g, mat:m };
  });
  const ORIGIN = new THREE.Vector3(0, 0, 0);

  /* — Poussière d'étoiles, pour donner de la profondeur — */
  const N = 680, pos = new Float32Array(N * 3);
  for(let i = 0; i < N; i++){
    const r = 5.5 + Math.random() * 8, a = Math.random() * Math.PI * 2, y = (Math.random() - .5) * 6;
    pos[i*3] = Math.cos(a) * r; pos[i*3+1] = y; pos[i*3+2] = Math.sin(a) * r;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dustMat = new THREE.PointsMaterial({
    color:BLUE, map:softSprite(), size:2.4, sizeAttenuation:false,
    transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  world.add(dust);

  /* — Étiquettes HTML, projetées depuis la 3D — */
  const layer = document.createElement('div');
  layer.className = 'orbit-labels';
  host.parentElement.appendChild(layer);
  const labels = NODES.map(n => {
    const el = document.createElement('a');
    el.className = 'orbit-label';
    el.href = n.href;
    el.style.pointerEvents = 'auto';
    el.style.textDecoration = 'none';
    el.innerHTML = `<b>${n.label}</b><em data-verb="${n.key}"></em>`;
    layer.appendChild(el);
    return el;
  });
  function refreshVerbs(){
    const lang = document.documentElement.lang === 'en' ? 'en' : 'fr';
    NODES.forEach(n => {
      const em = layer.querySelector(`[data-verb="${n.key}"]`);
      if(em) em.textContent = n.verb[lang];
    });
  }
  refreshVerbs();
  new MutationObserver(refreshVerbs).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });

  /* — Mise en avant d'un nœud (utilisée si l'orbite sert sur une page de branche) — */
  const focus = host.dataset.focus || null;

  /* Bleu plus profond en mode clair : le bleu pâle disparaît sur fond blanc. */
  const DEEP = new THREE.Color(0x0A4FD6);

  function theme(){
    const light = isLight();
    /* couleurs : en clair on fonce tout pour tenir sur le blanc */
    rings.forEach(m => { m.color.copy(light ? DEEP : BLUE); m.opacity = light ? .60 : .42; });
    dustMat.color.copy(light ? DEEP : BLUE);
    dustMat.opacity = light ? .55 : .62;
    dustMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    dustMat.needsUpdate = true;
    halo.material.color.copy(light ? DEEP : PALE);
    halo.material.opacity = light ? .42 : .46;
    shell.material.color.copy(light ? DEEP : PALE);
    shell.material.opacity = light ? .26 : .24;
    glow.material.color.copy(light ? DEEP : PALE);
    glow.material.opacity = light ? .30 : .66;
    glow.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    glow.material.needsUpdate = true;
    arcs.forEach(a => { a.mat.color.copy(light ? DEEP : PALE); });
    nodes.forEach(n => { n.ball.color.copy(light ? DEEP : PALE); n.mat.color.copy(light ? DEEP : BLUE); });
  }

  /* Allumage à l'arrivée : la scène grandit depuis un point et s'éclaire. */
  let baseScale = 1, scroll = 0;
  const setScroll = s => { scroll = s; };
  const v = new THREE.Vector3(), a1 = new THREE.Vector3(), mid = new THREE.Vector3();

  function frame(t){
    /* reveal 0→1 sur ~1.3 s, courbe douce (ease-out cubique) */
    const r = Math.min(1, t / 1.3);
    const rev = 1 - Math.pow(1 - r, 3);

    world.rotation.y = t * .055 + scroll * .0024;   // le scroll fait pivoter l'orbite (marqué)
    world.rotation.x = -0.52 + scroll * .0007;
    world.scale.setScalar(baseScale * (.55 + rev * .45));
    core.rotation.y  = -t * .35;
    halo.rotation.x  =  t * .22;
    shell.rotation.y = -t * .16;
    shell.rotation.z =  t * .10;
    /* le noyau respire */
    const pulse = 1 + Math.sin(t * 1.5) * .08;
    glow.scale.setScalar(3.4 * pulse);
    glow.material.opacity = (isLight() ? .30 : .66) * rev * (.8 + Math.sin(t * 1.5) * .2);

    nodes.forEach((n, i) => {
      const a = n.phase + t * n.speed;
      n.group.position.set(
        Math.cos(a) * n.radius,
        Math.sin(a) * n.radius * Math.sin(n.tilt),
        Math.sin(a) * n.radius * Math.cos(n.tilt)
      );
      n.halo.lookAt(camera.position);
      const active = !focus || focus === n.key;
      n.group.scale.setScalar((active ? 1 + Math.sin(t * 1.6 + i) * .06 : .55) * rev);
      n.mat.opacity = (active ? .75 : .2) * rev;

      /* étiquette : projection en coordonnées écran */
      v.copy(n.group.position);
      n.group.parent.localToWorld(v);
      v.project(camera);
      const el = labels[i];
      const front = v.z < 1;
      el.style.left = ((v.x * .5 + .5) * 100) + '%';
      el.style.top  = ((-v.y * .5 + .5) * 100) + '%';
      /* visible seulement devant la caméra, hors zone de texte,
         et sans dépasser le bord droit */
      el.classList.toggle('on', rev > .96 && front && active && v.x > minX && v.x < .88);
    });

    /* arcs : du noyau vers chaque nœud, en courbe, avec une pulsation décalée */
    arcs.forEach((arc, i) => {
      a1.copy(nodes[i].group.position);
      mid.copy(a1).multiplyScalar(.52);
      mid.y += .5 + Math.sin(t * .7 + i) * .25;          // ventre de la courbe, animé
      const curve = new THREE.QuadraticBezierCurve3(ORIGIN, mid, a1);
      const arr = arc.geo.attributes.position.array;
      curve.getPoints(ARC_PTS - 1).forEach((p, k) => { arr[k*3]=p.x; arr[k*3+1]=p.y; arr[k*3+2]=p.z; });
      arc.geo.attributes.position.needsUpdate = true;
      arc.mat.opacity = (.22 + (Math.sin(t * 1.3 + i * 1.7) * .5 + .5) * .5) * rev;
    });

    /* la poussière tourne lentement à contre-sens et scintille */
    dust.rotation.y = -t * .02;
    dustMat.opacity = (isLight() ? .55 : .62) * (.7 + Math.sin(t * .8) * .3) * rev;

    renderer.render(scene, camera);
  }

  /* Sur grand écran la scène occupe toute la largeur : on décale l'orbite
     vers la droite pour qu'elle ne passe jamais sous le titre. */
  const target = new THREE.Vector3();
  let minX = -1;                       // limite gauche d'affichage des étiquettes
  function layout(w, h){
    const wide = w >= 1000;
    world.position.x = wide ? 3.55 : 0;
    world.position.y = wide ? 0 : -0.2;
    const k = wide ? Math.min(h / 660, 1.05) : Math.min(w / 780, 1);
    baseScale = Math.max(k, .62);      // le frame applique l'allumage par-dessus
    target.set(world.position.x * .5, 0, 0);
    /* Une étiquette qui passe côté texte est masquée : la géométrie peut
       glisser sous le voile, les mots non. */
    minX = wide ? 0.04 : -1;
  }

  return { camera, frame, theme, layout, target, setScroll, dispose(){ layer.remove(); } };
}

/* ══════════════ Scène — hélice (origin) ══════════════
   Une double hélice de points qui tourne lentement ; les barreaux
   s'allument en séquence (un signal qui parcourt la structure =
   l'accompagnement qui s'adapte). Abstrait, monochrome, jamais un
   « schéma de biologie ». */
function buildHelix(host, renderer){
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, .1, 100);
  camera.position.set(0, 0, 8.4);

  const group = new THREE.Group();
  scene.add(group);

  const BLUE = new THREE.Color(0x0A6CFF);
  const PALE = new THREE.Color(0x3D8BFF);
  const DEEP = new THREE.Color(0x0A4FD6);
  const BRIGHT = new THREE.Color(0x5AA0FF);   // sombre : bleu lumineux qui « pop » en additif

  const SPR = softSprite();                   // texture ronde partagée

  /* grande hélice HORIZONTALE : l'axe court en X, elle déborde à
     gauche/droite pour balayer toute la largeur du hero. */
  const TURNS = 4.4, N = 460, L = 18.0, R = 1.75;
  const dxStep = L / (N - 1), aStep = TURNS * Math.PI * 2 / (N - 1);
  const A = [], B = [];                        // points des deux brins
  const posArr = new Float32Array(N * 2 * 3);
  const lineAArr = new Float32Array(N * 3), lineBArr = new Float32Array(N * 3);
  for(let i = 0; i < N; i++){
    const x = -L / 2 + i * dxStep, a = i * aStep;
    const ay = Math.cos(a) * R, az = Math.sin(a) * R;
    const by = Math.cos(a + Math.PI) * R, bz = Math.sin(a + Math.PI) * R;
    A.push([x, ay, az]); B.push([x, by, bz]);
    posArr[i*3]     = x; posArr[i*3+1]     = ay; posArr[i*3+2]     = az;
    posArr[(N+i)*3] = x; posArr[(N+i)*3+1] = by; posArr[(N+i)*3+2] = bz;
    lineAArr[i*3] = x; lineAArr[i*3+1] = ay; lineAArr[i*3+2] = az;
    lineBArr[i*3] = x; lineBArr[i*3+1] = by; lineBArr[i*3+2] = bz;
  }
  const strandGeo = new THREE.BufferGeometry();
  strandGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  const strandMat = new THREE.PointsMaterial({
    color:BLUE, map:SPR, size:7.0, sizeAttenuation:false,
    transparent:true, opacity:1, depthWrite:false, blending:THREE.AdditiveBlending
  });
  group.add(new THREE.Points(strandGeo, strandMat));

  /* — Corps : nuage de points À L'INTÉRIEUR du tube de l'hélice (du volume) — */
  const FILL = 1400, fpos = new Float32Array(FILL * 3);
  for(let i = 0; i < FILL; i++){
    const x = -L / 2 + Math.random() * L;
    const ang = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.random()) * R * .92;     // disque plein (densité homogène)
    fpos[i*3] = x; fpos[i*3+1] = Math.cos(ang) * rr; fpos[i*3+2] = Math.sin(ang) * rr;
  }
  const fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
  const fillMat = new THREE.PointsMaterial({
    color:BLUE, map:SPR, size:3.4, sizeAttenuation:false,
    transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending
  });
  group.add(new THREE.Points(fillGeo, fillMat));

  /* — Détail : chaque brin relié par une ligne continue (ruban qui s'enroule) — */
  const lineMats = [];
  [lineAArr, lineBArr].forEach(arr => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.LineBasicMaterial({ color:BLUE, transparent:true, opacity:.5 });
    group.add(new THREE.Line(g, m));
    lineMats.push(m);
  });

  /* — Barreaux : échelons ÉPAIS (rangée de points) tous les RUNG_EVERY crans — */
  const RUNG_EVERY = 4, KSAMP = 16;
  const rungs = [];
  for(let i = 0; i < N; i += RUNG_EVERY){
    const arr = new Float32Array(KSAMP * 3);
    for(let s = 0; s < KSAMP; s++){
      const f = s / (KSAMP - 1);
      arr[s*3]   = A[i][0];
      arr[s*3+1] = A[i][1] + (B[i][1] - A[i][1]) * f;
      arr[s*3+2] = A[i][2] + (B[i][2] - A[i][2]) * f;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.PointsMaterial({
      color:PALE, map:SPR, size:5.4, sizeAttenuation:false,
      transparent:true, opacity:.4, depthWrite:false, blending:THREE.AdditiveBlending
    });
    group.add(new THREE.Points(g, m));
    rungs.push({ mat:m, phase:i / N });
  }

  /* — Halo : bande lumineuse horizontale qui donne du corps à l'ensemble — */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map:SPR, color:PALE, transparent:true, opacity:.4,
    blending:THREE.AdditiveBlending, depthWrite:false
  }));
  glow.scale.set(L * .62, R * 3.4, 1);
  group.add(glow);

  /* — Poussière, pour la profondeur (étirée le long de l'axe) — */
  const DN = 520, dpos = new Float32Array(DN * 3);
  for(let i = 0; i < DN; i++){
    dpos[i*3]   = (Math.random() - .5) * (L + 6);
    dpos[i*3+1] = (Math.random() - .5) * 9;
    dpos[i*3+2] = (Math.random() - .5) * 9;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustMat = new THREE.PointsMaterial({
    color:BLUE, map:SPR, size:2.8, sizeAttenuation:false,
    transparent:true, opacity:.45, depthWrite:false, blending:THREE.AdditiveBlending
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  group.add(dust);

  function theme(){
    const light = isLight();
    strandMat.color.copy(light ? DEEP : BRIGHT);
    strandMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    strandMat.needsUpdate = true;
    lineMats.forEach(m => { m.color.copy(light ? DEEP : BLUE); m.opacity = light ? .55 : .45; });
    fillMat.color.copy(light ? DEEP : BLUE); fillMat.opacity = light ? .4 : .5; fillMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; fillMat.needsUpdate = true;
    rungs.forEach(r => { r.mat.color.copy(light ? DEEP : BRIGHT); r.mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; r.mat.needsUpdate = true; });
    glow.material.color.copy(light ? DEEP : PALE);
    glow.material.opacity = light ? .14 : .5;
    glow.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    glow.material.needsUpdate = true;
    dustMat.color.copy(light ? DEEP : BLUE);
    dustMat.opacity = light ? .36 : .45;
    dustMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    dustMat.needsUpdate = true;
  }

  let baseScale = 1, scroll = 0, baseY = 0;
  const setScroll = s => { scroll = s; };

  function frame(t){
    const rev = 1 - Math.pow(1 - Math.min(1, t / 1.3), 3);
    group.rotation.x = t * .30 + scroll * .003;          // tourne autour de l'axe horizontal + scroll
    group.rotation.y = Math.sin(t * .15) * .12;          // légère profondeur 3D
    group.scale.setScalar(baseScale * (.66 + rev * .34));
    group.position.y = baseY + Math.sin(t * .5) * .10;   // respiration

    strandMat.opacity = rev;
    lineMats.forEach(m => m.opacity = (isLight() ? .55 : .45) * rev);
    fillMat.opacity = (isLight() ? .4 : .5) * (.7 + Math.sin(t * .9) * .3) * rev;   // le corps scintille
    /* un signal parcourt l'hélice : chaque barreau s'allume à son tour */
    rungs.forEach(r => {
      const pulse = Math.sin(t * 1.6 - r.phase * Math.PI * 8) * .5 + .5;
      r.mat.opacity = (.28 + pulse * pulse * .62) * rev;
    });
    glow.material.opacity = (isLight() ? .14 : .5) * rev * (.8 + Math.sin(t * 1.2) * .2);
    dust.rotation.x = -t * .02;
    dustMat.opacity = (isLight() ? .36 : .45) * (.7 + Math.sin(t * .8) * .3) * rev;

    renderer.render(scene, camera);
  }

  const target = new THREE.Vector3();
  function layout(w, h){
    const wide = w >= 1000;
    group.position.x = 0;                       // axe horizontal centré = balaie toute la largeur
    baseY = wide ? -0.3 : -0.2;
    const k = wide ? Math.min(h / 720, 1.15) : Math.min(w / 700, 1.1);
    baseScale = Math.max(k, .66);
    target.set(0, 0, 0);
  }

  return { camera, frame, theme, layout, target, setScroll };
}

/* ══════════════ Scène — éventail (pure) ══════════════
   Des rayons qui s'ouvrent depuis le talon ; une onde d'énergie
   jaillit en continu vers les orteils (l'appui, la poussée), avec de
   la profondeur 3D et une rotation — l'avant-pied large qui s'anime. */
const FAN_VERT = /* glsl */`
  uniform float uTime, uSpread, uLen, uFx, uFy, uSize, uPix, uReveal;
  attribute float aAngle, aDist, aRayLen;
  varying float vA;
  void main(){
    float th  = aAngle * uSpread;              // angle du rayon (uSpread respire)
    float d   = aDist * uLen * aRayLen;        // distance le long du rayon
    float x = uFx + cos(th) * d;
    float y = uFy + sin(th) * d;
    float z = sin(th) * 1.1;                   // profondeur : le pied n'est pas plat
    vec4 mv = modelViewMatrix * vec4(x, y, z, 1.);
    /* deux ondes qui remontent du talon vers les orteils */
    float p1 = fract(uTime * .34), p2 = fract(uTime * .34 + .5);
    float band = exp(-pow((aDist - p1) / .13, 2.)) + exp(-pow((aDist - p2) / .13, 2.));
    float head = smoothstep(.82, 1., aDist);   // pointes (orteils)
    vA = (.22 + band * .9 + head * .7) * uReveal;
    gl_PointSize = uSize * uPix * (.6 + aDist * .5 + band * 1.3 + head) * (7.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FAN_FRAG = /* glsl */`
  uniform vec3 uTint; uniform float uLight;
  varying float vA;
  void main(){
    float dd = length(gl_PointCoord - .5);
    float a = smoothstep(.5, .1, dd);
    if(a < .02) discard;
    gl_FragColor = vec4(uTint, a * vA * mix(1., 1.3, uLight));
  }
`;
function buildFan(host, renderer){
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
  camera.position.set(0, 0, 8.6);

  const group = new THREE.Group();
  scene.add(group);

  const BLUE = new THREE.Color(0x0A6CFF), DEEP = new THREE.Color(0x0A4FD6), BRIGHT = new THREE.Color(0x5AA0FF);
  const SPR = softSprite();

  const NR = 44, P = 42;                        // rayons × points (dense = ruban lumineux)
  const COUNT = NR * P;
  const pos = new Float32Array(COUNT * 3);       // position réelle calculée dans le shader
  const aAngle = new Float32Array(COUNT), aDist = new Float32Array(COUNT), aRayLen = new Float32Array(COUNT);
  let n = 0;
  for(let r = 0; r < NR; r++){
    const frac = r / (NR - 1);
    const ang = (frac - .5);                     // -0.5 .. 0.5
    const rl = .80 + .20 * Math.cos((frac - .5) * Math.PI);  // pointes en arc (milieu plus long)
    for(let s = 0; s < P; s++){
      aAngle[n] = ang; aDist[n] = s / (P - 1); aRayLen[n] = rl; n++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
  geo.setAttribute('aDist', new THREE.BufferAttribute(aDist, 1));
  geo.setAttribute('aRayLen', new THREE.BufferAttribute(aRayLen, 1));
  const uni = {
    uTime:{value:0}, uSpread:{value:1.0}, uLen:{value:7.6}, uFx:{value:-3.6}, uFy:{value:-0.3},
    uSize:{value:4.6}, uPix:{value:Math.min(devicePixelRatio,2)}, uReveal:{value:0},
    uLight:{value:0}, uTint:{value:new THREE.Color(0x5AA0FF)}
  };
  const mat = new THREE.ShaderMaterial({
    uniforms:uni, vertexShader:FAN_VERT, fragmentShader:FAN_FRAG,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  group.add(pts);

  /* halo au foyer (talon) */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:SPR, color:BRIGHT, transparent:true, opacity:.5, blending:THREE.AdditiveBlending, depthWrite:false }));
  glow.scale.set(4.2, 4.8, 1); glow.position.set(-3.2, -0.3, 0);
  group.add(glow);

  /* poussière */
  const DN = 440, dpos = new Float32Array(DN * 3);
  for(let i = 0; i < DN; i++){ dpos[i*3]=(Math.random()-.5)*20; dpos[i*3+1]=(Math.random()-.5)*10; dpos[i*3+2]=(Math.random()-.5)*8; }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dustMat = new THREE.PointsMaterial({ color:BLUE, map:SPR, size:2.6, sizeAttenuation:false, transparent:true, opacity:.4, depthWrite:false, blending:THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  group.add(dust);

  function theme(){
    const light = isLight();
    uni.uLight.value = light ? 1 : 0;
    uni.uTint.value.copy(light ? DEEP : BRIGHT);
    mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.needsUpdate = true;
    glow.material.color.copy(light ? DEEP : BRIGHT); glow.material.opacity = light ? .18 : .5; glow.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; glow.material.needsUpdate = true;
    dustMat.color.copy(light ? DEEP : BLUE); dustMat.opacity = light ? .34 : .4; dustMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; dustMat.needsUpdate = true;
  }

  let baseScale = 1, scroll = 0, baseY = 0;
  const setScroll = s => { scroll = s; };

  function frame(t){
    const rev = 1 - Math.pow(1 - Math.min(1, t / 1.3), 3);
    uni.uTime.value = t;
    uni.uReveal.value = rev;
    uni.uSpread.value = 1.0 + Math.sin(t * .5) * .28;   // ouverture qui respire
    group.rotation.y = Math.sin(t * .22) * .32 + scroll * .0016;   // tourne en 3D = dynamique
    group.rotation.z = Math.sin(t * .17) * .05;
    group.scale.setScalar(baseScale * (.66 + rev * .34));
    group.position.y = baseY + Math.sin(t * .5) * .08;
    glow.material.opacity = (isLight() ? .18 : .5) * rev * (.8 + Math.sin(t * 1.2) * .2);
    dust.rotation.y = -t * .02;
    dustMat.opacity = (isLight() ? .34 : .4) * (.7 + Math.sin(t * .8) * .3) * rev;
    renderer.render(scene, camera);
  }

  const target = new THREE.Vector3();
  function layout(w, h){
    const wide = w >= 1000;
    baseY = wide ? 0 : -0.2;
    const k = wide ? Math.min(h / 820, 1.05) : Math.min(w / 820, .95);
    baseScale = Math.max(k, .6);
    target.set(0, 0, 0);
  }
  function resize(w){ uni.uPix.value = Math.min(devicePixelRatio, 2); }

  return { camera, frame, theme, layout, resize, target, setScroll };
}

/* ══════════════ Scène — essaim qui s'ordonne (studio) ══════════════
   Des points épars (le chaos des fichiers/apps) convergent en une
   grille structurée (le tableau), s'y tiennent, puis se dispersent —
   « rassembler ce qui vit partout, pour décider ». */
const SWARM_VERT = /* glsl */`
  uniform float uTime, uMix, uSize, uPix, uReveal;
  attribute vec3 aHome, aScatter;
  attribute float aCol, aRand;
  varying float vA;
  void main(){
    vec3 p = mix(aScatter, aHome, uMix);
    p += .10 * vec3(sin(uTime + aRand * 6.28), cos(uTime * 1.1 + aRand * 6.28), 0.) * (1. - uMix);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    float shimmer = uMix * (.5 + .5 * sin(uTime * 2. - aCol * 6.28));   // vague de « mise à jour » sur la grille
    vA = (.28 + uMix * .5 + shimmer * .45) * uReveal;
    gl_PointSize = uSize * uPix * (.7 + uMix * .5 + shimmer * .8) * (7.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const SWARM_FRAG = /* glsl */`
  uniform vec3 uTint; uniform float uLight;
  varying float vA;
  void main(){
    float d = length(gl_PointCoord - .5);
    float a = smoothstep(.5, .1, d);
    if(a < .02) discard;
    gl_FragColor = vec4(uTint, a * vA * mix(1., 1.3, uLight));
  }
`;
function buildSwarm(host, renderer){
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
  camera.position.set(0, 0, 8.6);

  const group = new THREE.Group();
  scene.add(group);

  const BLUE = new THREE.Color(0x0A6CFF), DEEP = new THREE.Color(0x0A4FD6), BRIGHT = new THREE.Color(0x5AA0FF);
  const SPR = softSprite();

  const C = 48, Rr = 18, N = C * Rr, GW = 15.5, GH = 5.6;   // grille ordonnée (le tableau)
  const home = new Float32Array(N * 3), scatter = new Float32Array(N * 3);
  const aCol = new Float32Array(N), aRand = new Float32Array(N);
  let n = 0;
  for(let r = 0; r < Rr; r++){
    for(let c = 0; c < C; c++){
      home[n*3]   = -GW / 2 + (c / (C - 1)) * GW;
      home[n*3+1] = -GH / 2 + (r / (Rr - 1)) * GH;
      home[n*3+2] = (Math.random() - .5) * .5;
      scatter[n*3]   = (Math.random() - .5) * 20;
      scatter[n*3+1] = (Math.random() - .5) * 11;
      scatter[n*3+2] = (Math.random() - .5) * 7;
      aCol[n] = c / (C - 1); aRand[n] = Math.random();
      n++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  geo.setAttribute('aCol', new THREE.BufferAttribute(aCol, 1));
  geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1));
  const uni = {
    uTime:{value:0}, uMix:{value:0}, uSize:{value:4.4}, uPix:{value:Math.min(devicePixelRatio,2)},
    uReveal:{value:0}, uLight:{value:0}, uTint:{value:new THREE.Color(0x5AA0FF)}
  };
  const mat = new THREE.ShaderMaterial({
    uniforms:uni, vertexShader:SWARM_VERT, fragmentShader:SWARM_FRAG,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  group.add(pts);

  function theme(){
    const light = isLight();
    uni.uLight.value = light ? 1 : 0;
    uni.uTint.value.copy(light ? DEEP : BRIGHT);
    mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.needsUpdate = true;
  }

  let baseScale = 1, scroll = 0, baseY = 0;
  const setScroll = s => { scroll = s; };

  function frame(t){
    const rev = 1 - Math.pow(1 - Math.min(1, t / 1.3), 3);
    uni.uTime.value = t;
    uni.uReveal.value = rev;
    /* cycle : converge → se tient → se disperse */
    const CYCLE = 8, ph = (t % CYCLE) / CYCLE;
    let m = ph < .30 ? ph / .30 : ph < .72 ? 1 : 1 - (ph - .72) / .28;
    m = m * m * (3 - 2 * m);
    uni.uMix.value = m;
    group.rotation.y = Math.sin(t * .15) * .16 + scroll * .0014;
    group.scale.setScalar(baseScale * (.68 + rev * .32));
    group.position.y = baseY;
    renderer.render(scene, camera);
  }

  const target = new THREE.Vector3();
  function layout(w, h){
    const wide = w >= 1000;
    baseY = wide ? 0 : -0.2;
    const k = wide ? Math.min(h / 820, 1.05) : Math.min(w / 820, .95);
    baseScale = Math.max(k, .62);
    target.set(0, 0, 0);
  }
  function resize(w){ uni.uPix.value = Math.min(devicePixelRatio, 2); }

  return { camera, frame, theme, layout, resize, target, setScroll };
}

/* ══════════════ Scène — pulsations (contact) ══════════════
   Des anneaux de points qui jaillissent du centre vers l'extérieur,
   en continu — un signal qu'on envoie, une balise : entrer en relation. */
const RIPPLE_VERT = /* glsl */`
  uniform float uTime, uMaxR, uSize, uPix, uReveal, uSpeed;
  attribute float aAngle, aRing, aJit;
  varying float vA;
  void main(){
    float phase = fract(aRing + uTime * uSpeed);
    float rad = phase * uMaxR;
    float x = cos(aAngle) * rad;
    float y = sin(aAngle) * rad * .74;           // légère ellipse (perspective)
    vec4 mv = modelViewMatrix * vec4(x, y, 0., 1.);
    float env = smoothstep(0., .06, phase) * (1. - smoothstep(.72, 1., phase));
    vA = env * uReveal;
    gl_PointSize = uSize * uPix * (.6 + (1. - phase) * .7 + aJit * .3) * (7.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const RIPPLE_FRAG = /* glsl */`
  uniform vec3 uTint; uniform float uLight;
  varying float vA;
  void main(){
    float d = length(gl_PointCoord - .5);
    float a = smoothstep(.5, .1, d);
    if(a < .02) discard;
    gl_FragColor = vec4(uTint, a * vA * mix(1., 1.3, uLight));
  }
`;
function buildRipples(host, renderer){
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 100);
  camera.position.set(0, 0, 8.6);

  const group = new THREE.Group();
  scene.add(group);

  const BLUE = new THREE.Color(0x0A6CFF), PALE = new THREE.Color(0x3D8BFF);
  const DEEP = new THREE.Color(0x0A4FD6), BRIGHT = new THREE.Color(0x5AA0FF);
  const SPR = softSprite();

  const RINGS = 9, PR = 150, N = RINGS * PR;      // anneaux × points par anneau (dense)
  const pos = new Float32Array(N * 3);
  const aAngle = new Float32Array(N), aRing = new Float32Array(N), aJit = new Float32Array(N);
  let n = 0;
  for(let r = 0; r < RINGS; r++){
    for(let p = 0; p < PR; p++){
      aAngle[n] = (p / PR) * Math.PI * 2 + Math.random() * .04;
      aRing[n]  = r / RINGS + Math.random() * .01;
      aJit[n]   = Math.random();
      n++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aAngle', new THREE.BufferAttribute(aAngle, 1));
  geo.setAttribute('aRing', new THREE.BufferAttribute(aRing, 1));
  geo.setAttribute('aJit', new THREE.BufferAttribute(aJit, 1));
  const uni = {
    uTime:{value:0}, uMaxR:{value:7.2}, uSize:{value:4.2}, uPix:{value:Math.min(devicePixelRatio,2)},
    uReveal:{value:0}, uLight:{value:0}, uSpeed:{value:.12}, uTint:{value:new THREE.Color(0x5AA0FF)}
  };
  const mat = new THREE.ShaderMaterial({
    uniforms:uni, vertexShader:RIPPLE_VERT, fragmentShader:RIPPLE_FRAG,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false;
  group.add(pts);

  /* balise centrale */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:SPR, color:BRIGHT, transparent:true, opacity:.6, blending:THREE.AdditiveBlending, depthWrite:false }));
  glow.scale.set(2.2, 2.2, 1);
  group.add(glow);
  const coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0,0,0]), 3));
  const coreMat = new THREE.PointsMaterial({ color:PALE, map:SPR, size:16, sizeAttenuation:false, transparent:true, opacity:1, depthWrite:false, blending:THREE.AdditiveBlending });
  group.add(new THREE.Points(coreGeo, coreMat));

  function theme(){
    const light = isLight();
    uni.uLight.value = light ? 1 : 0;
    uni.uTint.value.copy(light ? DEEP : BRIGHT);
    mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; mat.needsUpdate = true;
    coreMat.color.copy(light ? DEEP : PALE); coreMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; coreMat.needsUpdate = true;
    glow.material.color.copy(light ? DEEP : BRIGHT); glow.material.opacity = light ? .22 : .6; glow.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending; glow.material.needsUpdate = true;
  }

  let baseScale = 1, scroll = 0, baseX = 0, baseY = 0;
  const setScroll = s => { scroll = s; };

  function frame(t){
    const rev = 1 - Math.pow(1 - Math.min(1, t / 1.3), 3);
    uni.uTime.value = t;
    uni.uReveal.value = rev;
    group.rotation.z = Math.sin(t * .1) * .05 + scroll * .0010;
    group.scale.setScalar(baseScale * (.7 + rev * .3));
    group.position.set(baseX, baseY + Math.sin(t * .5) * .06, 0);
    coreMat.opacity = (.75 + Math.sin(t * 2.2) * .25) * rev;      // battement de la balise
    glow.material.opacity = (isLight() ? .22 : .6) * rev * (.7 + Math.sin(t * 2.2) * .3);
    renderer.render(scene, camera);
  }

  const target = new THREE.Vector3();
  function layout(w, h){
    const wide = w >= 1000;
    baseX = wide ? 2.6 : 0;                     // décalé à droite pour dégager le texte
    baseY = wide ? 0 : -0.2;
    const k = wide ? Math.min(h / 820, 1.05) : Math.min(w / 820, .95);
    baseScale = Math.max(k, .62);
    target.set(0, 0, 0);                        // on vise tout droit → la balise reste à droite
  }
  function resize(w){ uni.uPix.value = Math.min(devicePixelRatio, 2); }

  return { camera, frame, theme, layout, resize, target, setScroll };
}

/* ══════════════ Scène 2 — champ de particules ══════════════ */
const DISPLACE = /* glsl */`
  /* Une bosse douce entre a et b : 0 → 1 → 0. Brique de base des profils. */
  float bump(float u, float a, float b){
    float m = (a + b) * .5, h = (b - a) * .5;
    float d = clamp(1. - abs(u - m) / h, 0., 1.);
    return d * d * (3. - 2. * d);
  }

  float hash21(vec2 c){
    return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
  }

  /* ── tracker : la courbe force-temps d'un CMJ ──
     Poids de corps, contre-mouvement, freinage, propulsion,
     envol à force nulle, puis pic de réception. */
  float cmj(float u){
    u = fract(u);
    float f = 1.;
    f -= 0.72 * bump(u, .12, .34);   // délestage
    f += 1.55 * bump(u, .31, .53);   // freinage puis propulsion
    f -= 1.00 * bump(u, .54, .74);   // envol : la force tombe à zéro
    f += 1.95 * bump(u, .73, .84);   // impact à la réception
    f -= 0.50 * bump(u, .83, .97);   // amortissement
    return f;
  }

  /* ── pure : le profil d'une chaussure, vu de côté ──
     Contrefort du talon, semelle basse, avant-pied et pointe relevée.
     Les copies décalées de ±1 évitent la cassure à la répétition. */
  float shoe(float u){
    u = fract(u);
    float s = .12;
    s += .80 * (bump(u, -.04, .18) + bump(u - 1., -.04, .18));
    s += .26 * bump(u, .28, .70);
    s += .58 * (bump(u, .68, 1.02) + bump(u + 1., .68, 1.02));
    return s;
  }

  float displace(vec2 p, float t, int mode){
    if(mode == 1){                                  // studio — barres 3D qui montent et descendent
      vec2 cell = floor(p * vec2(.46, .60));        // barres larges et massives = lecture « histogramme 3D »
      float h    = hash21(cell);
      /* chaque barre monte et descend : vague qui traverse les colonnes + rythme propre */
      float rise = smoothstep(-1., 1., sin(t * .55 - cell.x * .55 + h * 6.283));
      return ((h * .75 + .35) * rise) * 2.6 - .8;   // forte amplitude : vraies barres qui s'élèvent
    } else if(mode == 2){                           // tracker — courbe de CMJ, balaie GAUCHE→DROITE
      float u    = p.x * .072 - t * .16;            // (-t) = la courbe se déplace vers la droite ; plus rapide = plus vif
      float band = exp(-p.y * p.y * .42);           // la trace se resserre en ligne
      return (cmj(u) - 1.) * 1.25 * band + sin(p.y * .8 + t * .4) * .035;   // amplitude accrue = saut plus marqué
    } else if(mode == 3){                           // pure — vagues au profil de la chaussure
      float u     = p.x * .082 - t * .055;
      float swell = sin(p.y * .34 + t * .38) * .13;
      return shoe(u) * .80 - .42 + swell;
    }                                               // motion — flux diagonal, inchangé
    return sin((p.x + p.y) * .85 - t * 1.5) * .38 + sin(p.x * 1.9 + t * .9) * .16;
  }
`;

const PT_VERT = /* glsl */`
  uniform float uTime, uSize, uPix; uniform int uMode;
  varying float vH;
  ${DISPLACE}
  void main(){
    vec3 p = position;
    p.z = displace(p.xy, uTime, uMode);
    vH = p.z;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_PointSize = uSize * uPix * (7.5 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const PT_FRAG = /* glsl */`
  uniform vec3 uTint; uniform float uLight, uReveal;
  varying float vH;
  void main(){
    float d = length(gl_PointCoord - .5);
    float a = smoothstep(.5, .12, d);
    if(a < .02) discard;
    vec3 hi = mix(vec3(1.), vec3(.01, .05, .14), uLight);   // crêtes : blanches / encre
    vec3 c  = mix(uTint, hi, clamp(vH * .8 + .28, 0., 1.));
    float fade = clamp(.38 + vH * .85, .14, 1.);
    /* Sur fond clair le mélange n'est plus additif : sans ce rattrapage
       d'opacité, la scène disparaissait. */
    gl_FragColor = vec4(c, a * fade * mix(1., 1.35, uLight) * uReveal);
  }
`;

function buildField(cfg, renderer){
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, .1, 100);
  camera.position.set(0, -2.6, 5.4);
  camera.lookAt(0, 0, 0);

  const group = new THREE.Group();
  group.rotation.x = cfg.tilt;
  scene.add(group);

  const cols = Math.round(150 * cfg.density), rows = Math.round(86 * cfg.density);
  const uni = {
    uTime:{value:0}, uMode:{value:cfg.mode}, uSize:{value:2.8}, uPix:{value:1},
    uTint:{value:new THREE.Color(cfg.tint)}, uLight:{value:0}, uReveal:{value:0}
  };
  const mat = new THREE.ShaderMaterial({
    uniforms:uni, vertexShader:PT_VERT, fragmentShader:PT_FRAG,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
  group.add(new THREE.Points(new THREE.PlaneGeometry(15, 9, cols, rows), mat));
  /* taille des points : plus gros = plus visible ; compense le pâle sur blanc */
  const sizeFor = w => (w < 720 ? 2.1 : 2.8) * (isLight() ? 1.22 : 1.);

  return {
    camera, baseTilt: cfg.tilt,
    frame(t){
      /* allumage : fondu + léger grandissement sur ~1.2 s */
      const rev = 1 - Math.pow(1 - Math.min(1, t / 1.2), 3);
      uni.uReveal.value = rev;
      group.scale.setScalar(.92 + rev * .08);
      uni.uTime.value = t * cfg.speed;
      renderer.render(scene, camera);
    },
    theme(){
      const light = isLight();
      uni.uLight.value = light ? 1 : 0;
      /* le mélange additif éclaircit : illisible sur fond clair */
      mat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
      uni.uSize.value = sizeFor(innerWidth);
      mat.needsUpdate = true;
    },
    resize(w){ uni.uSize.value = sizeFor(w); },
    target: new THREE.Vector3(0, 0, 0),
    group
  };
}

/* ══════════════ Démarrage ══════════════ */
function boot(){
  const host = document.getElementById('hero3d');
  if(!host) return;

  let renderer;
  try{
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
  }catch(e){
    host.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  host.appendChild(renderer.domElement);

  const name  = host.dataset.scene;
  const scene = (name === 'orbit') ? buildOrbit(host, renderer)
    : (name === 'helix') ? buildHelix(host, renderer)
    : (name === 'fan') ? buildFan(host, renderer)
    : (name === 'swarm') ? buildSwarm(host, renderer)
    : (name === 'ripples') ? buildRipples(host, renderer)
    : buildField(FIELDS[name] || FIELDS.motion, renderer);

  /* Parallaxe souris (légère) + réaction au scroll (rotation de la scène) */
  let tx = 0, ty = 0, mx = 0, my = 0, syTarget = 0, sy = 0;
  if(!reduced()){
    addEventListener('pointermove', e => {
      tx = (e.clientX / innerWidth - .5) * .40;
      ty = (e.clientY / innerHeight - .5) * .22;
    }, { passive:true });
    addEventListener('scroll', () => { syTarget = scrollY; }, { passive:true });
  }

  function resize(){
    const w = host.clientWidth, h = host.clientHeight;
    if(!w || !h) return;
    renderer.setSize(w, h);
    scene.camera.aspect = w / h;
    scene.camera.updateProjectionMatrix();
    if(scene.resize) scene.resize(w);
    if(scene.layout) scene.layout(w, h);
  }
  addEventListener('resize', resize, { passive:true });
  resize();

  scene.theme();
  document.addEventListener('sinetik:theme', () => { scene.theme(); if(reduced()) scene.frame(1.2); });

  let visible = true, running = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold:0 }).observe(host);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  if(reduced()){ scene.frame(1.2); return; }

  const clock = new THREE.Clock();
  let t = 0;
  (function loop(){
    requestAnimationFrame(loop);
    if(!visible || !running){ clock.getDelta(); return; }
    t += clock.getDelta();
    mx += (tx - mx) * .045;
    my += (ty - my) * .045;
    sy += (syTarget - sy) * .08;
    if(scene.group){                                           // champs de particules
      scene.group.rotation.y = mx + sy * .0026;                // scroll plus marqué
      scene.group.rotation.x = (scene.baseTilt || 0) + sy * .0010;   // garde l'inclinaison de base
    }
    if(scene.setScroll) scene.setScroll(sy);
    scene.camera.position.x = mx * 3.6;
    scene.camera.position.y = (name === 'orbit' ? 1.5 + my * 3.2 : (name === 'helix' || name === 'fan' || name === 'swarm' || name === 'ripples') ? my * 2.6 : -2.6 + my * 3);
    if(name === 'orbit') scene.camera.position.z = 7.4 - Math.min(sy, 800) * .0028;   // dolly avant au scroll, marqué
    else if(name === 'helix' || name === 'fan' || name === 'swarm' || name === 'ripples') scene.camera.position.z = 8.6 - Math.min(sy, 800) * .003;
    const tgt = scene.target;
    scene.camera.lookAt(tgt ? tgt.x : 0, tgt ? tgt.y : 0, 0);
    scene.frame(t);
  })();
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
