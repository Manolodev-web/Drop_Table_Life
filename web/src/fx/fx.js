/**
 * Banco Nexus · fx.js
 * Audio 100 % sintetizado con Web Audio API (0 KB de audio externo) y
 * animaciones sincronizadas con Web Animations API.
 *
 * API global:  window.fx = { play, animar, volumen, silenciar, ambiente }
 *   fx.play(nombre, opts?)          -> boolean (true si sonó)
 *   fx.animar(nombre, el, opts?)    -> Promise (se resuelve al terminar)
 *   fx.volumen(v?)                  -> number (0..1). Sin argumento: lee.
 *   fx.silenciar(bool?)             -> boolean. Sin argumento: alterna.
 *   fx.ambiente(escenario, nivel?)  -> 'aula' | 'lluvia' | null
 * Extras: fx.estado(), fx.duraciones
 *
 * Sonidos: tecla, notificacion, ring, pagina, exito, error, zoom, sello, logro
 * Animaciones: sello, logro, shake (cada una dispara su sonido en el instante
 * exacto del impacto visual, programado con el reloj de audio).
 *
 * Eventos que escucha (docs/CONTRATOS.md):
 *   nexus:monitor-click    -> zoom  (usa detail.duracion en ms = duración del lerp)
 *   nexus:mision-iniciada  -> pagina
 *   nexus:mision-resuelta  -> exito (+ sello si hay [data-fx="sello"] o detail.elemento)
 *   nexus:logro            -> logro (animado si hay [data-fx="logro"] o detail.elemento)
 *
 * Emite: nexus:fx-silencio  { detail: { silenciado } }
 */

// ───────────── Ajustes: toca aquí para afinar a oído ─────────────
const MEZCLA = {
  tecla: 1, notificacion: 1, ring: 1, pagina: 1, exito: 1,
  error: 1, zoom: 1, sello: 1, logro: 1, ambiente: 1,
};
const LS_CLAVE = 'nexus:fx';
const VENTANA_DEDUPE = 0.15;   // s: ignora el mismo sonido repetido dentro de esta ventana
const COALESCENCIA_ANIM = 700; // ms: evita doble animación/sonido si evento y componente coinciden

const BROWSER = typeof window !== 'undefined';
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
const rnd = (a, b) => a + Math.random() * (b - a);

// ───────────── Estado persistente ─────────────
const estado = { volumen: 0.7, silenciado: false, ambiente: null, ambNivel: 1 };
try {
  const g = JSON.parse(localStorage.getItem(LS_CLAVE) || 'null');
  if (g) { estado.volumen = clamp(g.volumen ?? estado.volumen); estado.silenciado = !!g.silenciado; }
} catch { /* sin localStorage */ }
const guardar = () => {
  try { localStorage.setItem(LS_CLAVE, JSON.stringify({ volumen: estado.volumen, silenciado: estado.silenciado })); } catch { /* ignorar */ }
};

// ───────────── Contexto de audio ─────────────
let ctx = null, master = null, comp = null, salida = null, ruidos = null;
const ganancia = () => (estado.silenciado ? 0 : Math.pow(estado.volumen, 1.6) * 0.8);
const listo = () => !!ctx && ctx.state === 'running';

function asegurarCtx() {
  if (ctx) return ctx;
  const AC = BROWSER && (window.AudioContext || window.webkitAudioContext);
  if (!AC) return null;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch { return null; }
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3;
  comp.attack.value = 0.005; comp.release.value = 0.2;
  master = ctx.createGain();
  master.gain.value = ganancia();
  master.connect(comp); comp.connect(ctx.destination);
  return ctx;
}

function aplicarGanancia() {
  if (!master) return;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(ganancia(), t, 0.03);
}

// ───────────── Ruido (blanco, rosa, marrón) ─────────────
function ruido(tipo) {
  ruidos = ruidos || {};
  if (ruidos[tipo]) return ruidos[tipo];
  const n = Math.floor(ctx.sampleRate * 3);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  if (tipo === 'rosa') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;    b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;    b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (tipo === 'marron') {
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  } else {
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  const F = 512; // fundido en los bordes para evitar clics al repetir el bucle
  for (let i = 0; i < F; i++) { d[i] *= i / F; d[n - 1 - i] *= i / F; }
  return (ruidos[tipo] = buf);
}

// ───────────── Bloques de síntesis ─────────────
function adsr(param, t, a, pico, d) {
  param.cancelScheduledValues(t);
  param.setValueAtTime(0.0001, t);
  param.exponentialRampToValueAtTime(Math.max(pico, 0.0002), t + a);
  param.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function tono({ tipo = 'sine', f, f2 = null, t, a = 0.005, d = 0.2, v = 0.2, filtro = null, destino = salida }) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + a + d);
  adsr(g.gain, t, a, v, d);
  o.connect(g);
  if (filtro) {
    const fl = ctx.createBiquadFilter();
    fl.type = filtro.tipo; fl.frequency.value = filtro.f; fl.Q.value = filtro.q ?? 0.7;
    g.connect(fl); fl.connect(destino);
  } else {
    g.connect(destino);
  }
  o.start(t); o.stop(t + a + d + 0.05);
}

function rafaga({ tipo = 'blanco', t, dur = 0.03, v = 0.3, filtro = 'bandpass', f = 3000, f2 = null, q = 1, a = 0.002, destino = salida }) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruido(tipo);
  fl.type = filtro; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  adsr(g.gain, t, a, v, Math.max(0.005, dur - a));
  s.connect(fl); fl.connect(g); g.connect(destino);
  s.start(t, rnd(0, 2.4)); s.stop(t + dur + 0.05);
}

// ───────────── Sonidos ─────────────
const SONIDOS = {
  // Clic suave de tecla mecánica / UI (con ligera variación para no sonar robótico)
  tecla(t) {
    const p = 1 + (Math.random() - 0.5) * 0.12;
    rafaga({ t, dur: 0.022, v: 0.3, f: 3200 * p, q: 1.2 });
    tono({ f: 170 * p, f2: 90 * p, t, a: 0.002, d: 0.035, v: 0.2 });
  },
  // Doble tono ascendente estilo mensajería
  notificacion(t) {
    [[987.77, 0], [1318.51, 0.13]].forEach(([f, dt]) => {
      tono({ f, t: t + dt, a: 0.006, d: 0.32, v: 0.2 });
      tono({ tipo: 'triangle', f: f * 2, t: t + dt, a: 0.004, d: 0.18, v: 0.045 });
    });
  },
  // Dos zumbidos cortos del celular vibrando sobre madera
  ring(t) {
    for (let k = 0; k < 2; k++) {
      const t0 = t + k * 0.22, dur = 0.16;
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      const am = ctx.createOscillator(), amg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 82;
      lp.type = 'lowpass'; lp.frequency.value = 480;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.26, t0 + 0.012);
      g.gain.setValueAtTime(0.26, t0 + dur - 0.03);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      am.frequency.value = 34; amg.gain.value = 0.07;
      am.connect(amg); amg.connect(g.gain);
      o.connect(lp); lp.connect(g); g.connect(salida);
      o.start(t0); am.start(t0); o.stop(t0 + dur + 0.02); am.stop(t0 + dur + 0.02);
      for (let j = 0; j < 4; j++) {
        rafaga({ t: t0 + 0.01 + j * 0.035 + Math.random() * 0.01, dur: 0.02, v: 0.1, f: rnd(1400, 2000), q: 2 });
      }
    }
  },
  // Papel pasando de página
  pagina(t) {
    rafaga({ tipo: 'rosa', t, dur: 0.26, v: 0.16, f: 1800, f2: 5200, q: 0.7, a: 0.05 });
    rafaga({ t: t + 0.12, dur: 0.12, v: 0.06, filtro: 'highpass', f: 4500, q: 0.5, a: 0.02 });
    for (let j = 0; j < 3; j++) {
      rafaga({ t: t + 0.05 + j * 0.06 + Math.random() * 0.02, dur: 0.012, v: 0.07, f: rnd(2600, 4400), q: 3 });
    }
  },
  // Acorde ascendente (do mayor) al aprobar
  exito(t) {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const t0 = t + i * 0.075;
      tono({ f, t: t0, a: 0.01, d: 0.9 - i * 0.08, v: 0.16 });
      tono({ tipo: 'triangle', f: f * 2, t: t0, a: 0.01, d: 0.35, v: 0.04 });
    });
    [523.25, 659.25, 783.99].forEach((f) => tono({ f, t: t + 0.3, a: 0.03, d: 1.1, v: 0.06 }));
    rafaga({ t: t + 0.3, dur: 0.4, v: 0.025, filtro: 'highpass', f: 6000, q: 0.5, a: 0.05 });
  },
  // Tono grave y suave, descendente (no agresivo)
  error(t) {
    tono({ f: 220, f2: 146.83, t, a: 0.012, d: 0.32, v: 0.2, filtro: { tipo: 'lowpass', f: 700 } });
    tono({ tipo: 'triangle', f: 110, f2: 92, t: t + 0.02, a: 0.01, d: 0.28, v: 0.1 });
  },
  // Whoosh ligero; dura lo mismo que el movimiento de cámara (opts.duracion en ms)
  zoom(t, o = {}) {
    const dur = clamp((o.duracion ?? 1000) / 1000, 0.35, 3, 1);
    rafaga({ tipo: 'rosa', t, dur, v: 0.2, f: 260, f2: 2400, q: 0.8, a: dur * 0.5 });
    tono({ f: 70, f2: 190, t, a: dur * 0.3, d: dur * 0.7, v: 0.1 });
    tono({ f: 140, f2: 90, t: t + dur * 0.92, a: 0.01, d: 0.18, v: 0.07 }); // asentamiento al llegar
  },
  // Golpe de sello sobre papel
  sello(t) {
    tono({ f: 120, f2: 48, t, a: 0.002, d: 0.16, v: 0.32 });
    rafaga({ t, dur: 0.07, v: 0.2, filtro: 'lowpass', f: 900, q: 0.8 });
    rafaga({ t: t + 0.005, dur: 0.03, v: 0.1, f: 2800, q: 1 });
  },
  // Destello de logro
  logro(t) {
    [[1046.5, 0], [1318.51, 0.09], [1567.98, 0.18], [2093, 0.27]].forEach(([f, dt]) => {
      tono({ f, t: t + dt, a: 0.006, d: 0.55, v: 0.12 });
      tono({ tipo: 'triangle', f: f / 2, t: t + dt, a: 0.008, d: 0.3, v: 0.045 });
    });
  },
};

// ───────────── play ─────────────
const ultimo = {};
function play(nombre, opts = {}) {
  const gen = SONIDOS[nombre];
  if (!gen) { console.warn(`[fx] sonido desconocido: "${nombre}"`); return false; }
  if (!listo()) { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); return false; }
  if (estado.silenciado) return false;
  const t = ctx.currentTime + 0.005 + Math.max(0, (opts.retraso || 0) / 1000);
  const ventana = nombre === 'tecla' ? 0.03 : VENTANA_DEDUPE;
  if (ultimo[nombre] !== undefined && Math.abs(t - ultimo[nombre]) < ventana) return false;
  ultimo[nombre] = t;
  const bus = ctx.createGain();
  bus.gain.value = (MEZCLA[nombre] ?? 1) * (opts.vol ?? 1);
  bus.connect(master);
  salida = bus;
  try { gen(t, opts); } catch (e) { console.warn(`[fx] error al sintetizar "${nombre}"`, e); return false; }
  return true;
}

// ───────────── Volumen y silencio ─────────────
function volumen(v) {
  if (v === undefined) return estado.volumen;
  estado.volumen = clamp(Number(v));
  guardar(); aplicarGanancia();
  return estado.volumen;
}

function silenciar(v) {
  estado.silenciado = v === undefined ? !estado.silenciado : !!v;
  guardar(); aplicarGanancia();
  if (estado.silenciado) pararAmbiente(); else if (estado.ambiente) iniciarAmbiente(estado.ambiente);
  if (BROWSER) window.dispatchEvent(new CustomEvent('nexus:fx-silencio', { detail: { silenciado: estado.silenciado } }));
  return estado.silenciado;
}

// ───────────── Ambiente ─────────────
let amb = null;

function normalizar(e) {
  if (e == null || e === false) return null;
  const s = String(e).toLowerCase();
  if (/aula|(^|\D)1($|\D)/.test(s)) return 'aula';
  if (/lluvia|noche|(^|\D)3($|\D)/.test(s)) return 'lluvia';
  return null;
}

function capa(tipo, filtro, f, q, nivel, ag) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruido(tipo); s.loop = true;
  fl.type = filtro; fl.frequency.value = f; fl.Q.value = q;
  g.gain.value = nivel;
  s.connect(fl); fl.connect(g); g.connect(ag);
  s.start(0, rnd(0, 2));
  return s;
}

function montarAula(ag, nodos, timers) {
  nodos.push(capa('marron', 'lowpass', 380, 0.7, 0.06, ag));
  nodos.push(capa('rosa', 'bandpass', 1300, 0.5, 0.008, ag));
  const hum = ctx.createOscillator(), hg = ctx.createGain();
  hum.type = 'sine'; hum.frequency.value = 118; hg.gain.value = 0.004;
  hum.connect(hg); hg.connect(ag); hum.start(); nodos.push(hum);
  const evento = () => {
    if (!amb || amb.ag !== ag) return;
    salida = ag;
    const t = ctx.currentTime + 0.02;
    if (Math.random() < 0.55) {
      rafaga({ tipo: 'rosa', t, dur: rnd(0.12, 0.25), v: rnd(0.02, 0.04), f: rnd(1800, 2800), q: 0.8, a: 0.03 });
    } else {
      const d = rnd(0.7, 1.3);
      rafaga({ tipo: 'rosa', t, dur: d, v: 0.014, f: 520, q: 2, a: d * 0.4 });
      rafaga({ tipo: 'rosa', t, dur: d, v: 0.008, f: 1500, q: 2.5, a: d * 0.4 });
    }
    timers.push(setTimeout(evento, rnd(5000, 12000)));
  };
  timers.push(setTimeout(evento, rnd(2500, 6000)));
}

function montarLluvia(ag, nodos, timers) {
  nodos.push(capa('rosa', 'bandpass', 4200, 0.35, 0.075, ag));
  nodos.push(capa('marron', 'lowpass', 280, 0.7, 0.05, ag));
  nodos.push(capa('rosa', 'highpass', 7000, 0.5, 0.01, ag));
  const gotas = () => {
    if (!amb || amb.ag !== ag) return;
    salida = ag;
    const n = Math.round(rnd(5, 11));
    for (let i = 0; i < n; i++) {
      rafaga({ t: ctx.currentTime + rnd(0.01, 0.34), dur: 0.012, v: rnd(0.012, 0.04), f: rnd(2600, 6200), q: 3, a: 0.001 });
    }
    if (Math.random() < 0.18) { // gota más gruesa en el cristal
      rafaga({ tipo: 'rosa', t: ctx.currentTime + rnd(0.01, 0.3), dur: 0.05, v: 0.05, f: rnd(700, 1100), q: 4, a: 0.002 });
    }
  };
  timers.push(setInterval(gotas, 350));
}

function pararAmbiente() {
  if (!amb) return;
  const a = amb;
  amb = null;
  a.timers.forEach((id) => clearTimeout(id));
  try { a.ag.gain.cancelScheduledValues(ctx.currentTime); a.ag.gain.setTargetAtTime(0, ctx.currentTime, 0.25); } catch { /* ignorar */ }
  setTimeout(() => {
    a.nodos.forEach((n) => { try { n.stop(); } catch { /* ya parado */ } });
    try { a.ag.disconnect(); } catch { /* ignorar */ }
  }, 1500);
}

function iniciarAmbiente(nombre) {
  if (amb && amb.nombre === nombre) return;
  pararAmbiente();
  if (!nombre || !listo() || estado.silenciado) return;
  const ag = ctx.createGain();
  ag.gain.value = 0.0001;
  ag.connect(master);
  const nodos = [], timers = [];
  amb = { nombre, ag, nodos, timers };
  if (nombre === 'aula') montarAula(ag, nodos, timers); else montarLluvia(ag, nodos, timers);
  ag.gain.setTargetAtTime((MEZCLA.ambiente ?? 1) * estado.ambNivel, ctx.currentTime, 0.6);
}

/** ambiente(1|'aula') aula suave · ambiente(3|'lluvia') lluvia nocturna · ambiente(null) apagar */
function ambiente(escenario, nivel) {
  const nombre = normalizar(escenario);
  if (nivel !== undefined) estado.ambNivel = clamp(Number(nivel), 0, 2);
  estado.ambiente = nombre; // se recuerda aunque aún no haya gesto del usuario o esté en silencio
  if (nombre === null) pararAmbiente(); else iniciarAmbiente(nombre);
  return nombre;
}

// ───────────── Animaciones (Web Animations API) ─────────────
// Solo se animan propiedades individuales (scale, translate, opacity, filter) y el
// fotograma final es el estado natural del elemento: no pisan tu `transform` ni Tailwind.
const ANIM = {
  sello: {
    dur: 620, sonido: 'sello', impacto: 0.42,
    keyframes: [
      { opacity: 0, scale: 2.4, filter: 'blur(2px)', offset: 0, easing: 'cubic-bezier(.5,0,.85,.35)' },
      { opacity: 1, scale: 1, filter: 'brightness(1.5) blur(0px)', offset: 0.42, easing: 'ease-out' },
      { scale: 0.94, offset: 0.55 },
    ],
  },
  logro: {
    dur: 760, sonido: 'logro', impacto: 0.28,
    keyframes: [
      { opacity: 0, scale: 0.5, offset: 0, easing: 'cubic-bezier(.2,.9,.3,1.4)' },
      { opacity: 1, scale: 1.14, filter: 'drop-shadow(0 0 14px rgba(255,214,102,.95))', offset: 0.28, easing: 'ease-in-out' },
      { scale: 1, offset: 0.5 },
    ],
  },
  shake: {
    dur: 420, sonido: 'error', impacto: 0.03,
    keyframes: [
      { translate: '0px 0px', offset: 0 },
      { translate: '-7px 0px', offset: 0.1 },
      { translate: '6px 0px', offset: 0.25 },
      { translate: '-5px 0px', offset: 0.4 },
      { translate: '4px 0px', offset: 0.55 },
      { translate: '-2px 0px', offset: 0.75 },
    ],
  },
};
const duraciones = { sello: ANIM.sello.dur, logro: ANIM.logro.dur, shake: ANIM.shake.dur };

const recientes = new Map(); // nombre -> { t, el, promesa }
const activas = new WeakMap(); // el -> Animation

function resolverEl(x) {
  if (!x) return null;
  if (typeof x === 'string') return BROWSER ? document.querySelector(x) : null;
  if (typeof x === 'object' && 'current' in x) return x.current; // refs de Preact/React
  return x;
}

/**
 * animar('sello'|'logro'|'shake', elemento|ref|selector, { duracion?, sonido? })
 * El sonido se programa en el reloj de audio para caer en el instante del impacto visual
 * (desfase máximo ≈ 1 fotograma). Con `el` nulo solo suena y devuelve una promesa que
 * dura lo mismo que la animación (útil para tweens propios de objetos 3D).
 */
function animar(nombre, elemento, opts = {}) {
  const cfg = ANIM[nombre];
  if (!cfg) { console.warn(`[fx] animación desconocida: "${nombre}"`); return Promise.resolve(); }
  const el = resolverEl(elemento);
  const dur = opts.duracion ?? cfg.dur;
  const ahora = BROWSER ? performance.now() : Date.now();

  let conSonido = opts.sonido !== false;
  const prev = recientes.get(nombre);
  if (prev && ahora - prev.t < COALESCENCIA_ANIM) {
    if (prev.el === el) return prev.promesa;
    conSonido = false; // otro elemento, mismo evento: anima pero no dupliques el sonido
  }
  if (conSonido) play(cfg.sonido, { retraso: dur * cfg.impacto });

  const reducir = BROWSER && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let promesa;
  if (el && typeof el.animate === 'function' && !reducir) {
    try { activas.get(el)?.cancel(); } catch { /* ignorar */ }
    const anim = el.animate(cfg.keyframes, { duration: dur, easing: 'linear' });
    activas.set(el, anim);
    promesa = anim.finished.then(() => undefined, () => undefined);
  } else {
    promesa = new Promise((r) => setTimeout(r, reducir ? 0 : dur));
  }
  recientes.set(nombre, { t: ahora, el, promesa });
  return promesa;
}

// ───────────── Eventos del contrato ─────────────
const escuchas = [];
function on(target, ev, fn, opts) {
  target.addEventListener(ev, fn, opts);
  escuchas.push([target, ev, fn, opts]);
}

function desbloquear() {
  if (listo()) return;
  if (!asegurarCtx()) return;
  ctx.resume().then(() => {
    aplicarGanancia();
    if (estado.ambiente) iniciarAmbiente(estado.ambiente);
  }).catch(() => {});
}

if (BROWSER) {
  window.__nexusFxLimpiar?.(); // recarga en caliente (Vite HMR): evita escuchas duplicadas

  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => on(window, ev, desbloquear, { capture: true, passive: true }));

  on(document, 'visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
  });

  on(window, 'nexus:monitor-click', (e) => { desbloquear(); play('zoom', { duracion: e.detail?.duracion }); });
  on(window, 'nexus:mision-iniciada', () => { play('pagina'); });
  on(window, 'nexus:mision-resuelta', (e) => {
    play('exito');
    const el = resolverEl(e.detail?.elemento) || document.querySelector('[data-fx="sello"]');
    if (el) animar('sello', el);
  });
  on(window, 'nexus:logro', (e) => {
    const el = resolverEl(e.detail?.elemento) || document.querySelector('[data-fx="logro"]');
    if (el) animar('logro', el); else play('logro');
  });

  window.__nexusFxLimpiar = () => {
    escuchas.forEach(([t, ev, fn, o]) => t.removeEventListener(ev, fn, o));
    pararAmbiente();
    try { ctx?.close(); } catch { /* ignorar */ }
  };
}

// ───────────── API pública ─────────────
const fx = {
  play, animar, volumen, silenciar, ambiente,
  estado: () => ({ volumen: estado.volumen, silenciado: estado.silenciado, ambiente: estado.ambiente }),
  duraciones,
};
if (BROWSER) window.fx = fx;

export { fx };
export default fx;