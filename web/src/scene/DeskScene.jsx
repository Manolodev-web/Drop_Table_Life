import { useState, useEffect, useRef } from 'preact/hooks';
import { createEngine } from './engine.js';
import { SCENARIOS } from './world.js';
import nivel1 from '../../../content/nivel1.json';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

// Etiquetas de prompt (coinciden con engine.js)
const PROMPT_LABELS = {
  monitor: 'Usar ordenador',
  phone: 'Revisar móvil',
  notebook: 'Abrir cuaderno',
  mug: 'Girar taza',
  postit: 'Leer post-it',
};

const SENDER_COLORS = {
  Diego: 'text-sky-400',
  Valeria: 'text-emerald-400',
};

// Plan B obligatorio (DISENO_REFERENCIA): 2D oscuro con parallax + botón directo
function Fallback2D() {
  const [par, setPar] = useState({ x: 0, y: 0 });
  const enter = () => {
    window.fx?.play?.('exito');
    window.dispatchEvent(new CustomEvent('nexus:monitor-click', { detail: { scenario: 1 } }));
  };
  return (
    <div
      class="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#0b0e14] via-[#0f1115] to-[#05070c]"
      onMouseMove={(e) => setPar({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      })}
    >
      <div class="absolute inset-0 flex items-center justify-center"
        style={{ transform: `translate3d(${par.x * -12}px, ${par.y * -8}px, 0)` }}>
        <div class="relative flex flex-col items-center">
          <div class="w-72 h-44 rounded-lg border-4 border-[#1c1f26] bg-[#0f1115] shadow-[0_0_80px_rgba(59,130,246,0.25)] flex flex-col items-center justify-center gap-2">
            <div class="w-10 h-10 rounded-full bg-nexus-accent flex items-center justify-center font-bold text-white">BN</div>
            <p class="text-sm text-nexus-text font-semibold">Banco Nexus OS</p>
            <p class="text-[10px] font-mono text-nexus-muted">DROP TABLE Life;</p>
          </div>
          <div class="w-8 h-6 bg-[#1c1f26]" />
          <div class="w-96 h-3 rounded bg-[#2a2118] shadow-xl" />
          <span class="absolute -left-14 bottom-2 text-3xl"
            style={{ transform: `translate3d(${par.x * 18}px, ${par.y * 12}px, 0)` }}>☕</span>
        </div>
      </div>
      <div class="absolute inset-0 flex flex-col items-center justify-end pb-16 gap-3">
        <h1 class="font-mono text-3xl font-bold text-white">DROP TABLE <span class="text-amber-400">Life;</span></h1>
        <p class="text-nexus-muted text-xs">Modo compatibilidad 2D · WebGL no disponible o pantalla pequeña</p>
        <button onClick={enter}
          class="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors shadow-lg shadow-amber-900/30">
          Entrar al ordenador →
        </button>
      </div>
    </div>
  );
}

// Iconos SVG inline reutilizables
const SignalIcon = () => (
  <svg viewBox="0 0 20 12" class="w-4 h-3 fill-current" aria-hidden="true">
    <path d="M1 9h2v3H1zM5 7h2v5H5zM9 4h2v8H9zM13 1h2v11h-2z" />
  </svg>
);
const WifiIcon = () => (
  <svg viewBox="0 0 20 15" class="w-4 h-3 fill-current" aria-hidden="true">
    <path d="M10 3c-3 0-6 1-8 3l1 1c2-2 4-2.5 7-2.5s5 .5 7 2.5l1-1c-2-2-5-3-8-3zm0 4c-2 0-4 .7-5 2l1 1c1-1 2.5-1.5 4-1.5s3 .5 4 1.5l1-1c-1-1.3-3-2-5-2zm0 4c-1 0-1.8.3-2.5 1l1 1c.4-.4 1-.6 1.5-.6s1.1.2 1.5.6l1-1c-.7-.7-1.5-1-2.5-1z" />
  </svg>
);
const BatteryIcon = () => (
  <svg viewBox="0 0 28 12" class="w-6 h-3" aria-hidden="true">
    <rect x="0.5" y="0.5" width="23" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1" />
    <rect x="2" y="2" width="19" height="8" rx="1.5" fill="currentColor" />
    <rect x="25" y="4" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.5" />
  </svg>
);
const FlashlightIcon = () => (
  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M7 2v8l3 3v9h4v-9l3-3V2H7zm7 8v4h-4v-4h4z" />
  </svg>
);
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M9 2l-1.5 2H4v16h16V4h-3.5L15 2H9zm3 5a5 5 0 110 10 5 5 0 010-10zm0 2a3 3 0 100 6 3 3 0 000-6z" />
  </svg>
);
const ChevronLeft = () => (
  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z" />
  </svg>
);
const VideoIcon = () => (
  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current" aria-hidden="true">
    <path d="M17 10.5V7a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1v-3.5l4 4v-11l-4 4z" />
  </svg>
);

export default function DeskScene({ active }) {
  const mountRef = useRef(null);
  const ctrl = useRef(null);
  const [ready, setReady] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true);
  const [started, setStarted] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const scenarioRef = useRef(1);
  const [scenario, setScenario] = useState(1);
  const [promptTag, setPromptTag] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [toast, setToast] = useState(null);

  // Teléfono (2 pasos: lock screen → chat oscuro)
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phoneUnlocked, setPhoneUnlocked] = useState(false);
  const [phoneReply, setPhoneReply] = useState(null);
  const msgContainerRef = useRef(null);

  // Cuaderno (5 temas SQL + paginación)
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [nbPage, setNbPage] = useState(0);

  // Fecha real para lock screen
  const [now] = useState(() => new Date());
  const lockDate = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  const closePhone = () => {
    setPhoneOpen(false);
    setPhoneUnlocked(false);
    setPhoneReply(null);
  };

  useEffect(() => {
    if (msgContainerRef.current) {
      msgContainerRef.current.scrollTop = msgContainerRef.current.scrollHeight;
    }
  }, [phoneReply, phoneUnlocked]);

  useEffect(() => {
    if (!webglAvailable() || window.innerWidth < 640) { setWebglOk(false); return; }
    try {
      ctrl.current = createEngine(mountRef.current, {
        onPrompt: setPromptTag,
        onTransition: setTransitioning,
        onEscape: () => setMenuOpen(true),
        onHint: (text) => setToast({ text, id: Date.now() }),
        onOpenPhone: () => {
          setNotebookOpen(false);
          setPhoneOpen(true);
          setPhoneUnlocked(false);
          setPhoneReply(null);
          window.fx?.play?.('notificacion');
        },
        onOpenNotebook: () => {
          setPhoneOpen(false);
          setNotebookOpen(true);
          window.fx?.play?.('tecla');
        },
        onEnterMonitor: () => {
          setPhoneOpen(false);
          setNotebookOpen(false);
          window.fx?.play?.('exito');
          window.dispatchEvent(new CustomEvent('nexus:monitor-click', { detail: { scenario: scenarioRef.current } }));
        },
      });
      setReady(true);
    } catch (err) {
      console.warn('[Escena3D] WebGL falló, activando Plan B:', err);
      setWebglOk(false);
    }
    return () => ctrl.current?.dispose();
  }, []);

  useEffect(() => {
    scenarioRef.current = scenario;
    ctrl.current?.setScenario(scenario);
    window.dispatchEvent(new CustomEvent('nexus:scenario-change', { detail: { scenario } }));
  }, [scenario, ready]);
  useEffect(() => { ctrl.current?.setLookEnabled(started && !menuOpen); }, [started, menuOpen, ready]);
  useEffect(() => { ctrl.current?.setModalOpen?.(phoneOpen || notebookOpen); }, [phoneOpen, notebookOpen, ready]);
  useEffect(() => { ctrl.current?.setActive(active); }, [active, ready]);

  // Cerrar modales con Escape
  useEffect(() => {
    if (!phoneOpen && !notebookOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (phoneOpen) closePhone();
        if (notebookOpen) setNotebookOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phoneOpen, notebookOpen]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  if (!webglOk) return <Fallback2D />;

  const sc = SCENARIOS[scenario];
  const start = () => {
    setStarted(true); setMenuOpen(false);
    window.fx?.play?.('tecla');
    setToast({ text: '🖱 Mueve el ratón para mirar. Haz clic en el monitor, móvil, cuaderno o taza del escritorio.', id: Date.now() });
  };

  // Datos del celular desde content/nivel1.json
  const celular = nivel1.celular_inicio;
  const horaCelular = celular.hora || '10:20';
  const primerMensaje = celular.mensajes_iniciales[0];
  const nombreGrupo = celular.grupo || 'BD — Supervivientes del parcial';
  const horasIniciales = ['10:18', '10:19', horaCelular];

  // Páginas del cuaderno (5 temas SQL + clave SELECTme)
  const paginasCuaderno = [
    ...nivel1.apuntes,
    {
      id: 'resumen_5',
      titulo: 'Tema 5 — Resumen para el Parcial (ORDER BY y DISTINCT)',
      resumen: 'DISTINCT elimina duplicados · ORDER BY ordena ASC (menor a mayor) o DESC (mayor a menor).',
      puntos: [
        'Orden de cláusulas: SELECT DISTINCT ... FROM ... WHERE ... ORDER BY ...',
        'BETWEEN incluye extremos · LIKE usa % · IN compara listas.',
      ],
      ejemplo: 'SELECT DISTINCT carrera FROM estudiantes ORDER BY carrera ASC;',
      regla: 'Revisa siempre el Visor E-R antes de escribir tu consulta.',
    },
  ];

  return (
    <div class="absolute inset-0 z-0">
      <div ref={mountRef} class="absolute inset-0" />

      {/* Viñeta cinematográfica */}
      <div class="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />

      {active && (
        <>
          {/* Menú inicial estilo The Last Deploy */}
          <div class={`absolute inset-y-0 left-0 z-20 w-[min(92vw,430px)] flex flex-col justify-center gap-5 px-10 bg-gradient-to-r from-black/90 via-black/65 to-transparent transition-all duration-500 ${menuOpen ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0 pointer-events-none'}`}>
            <p class="font-mono text-[11px] tracking-[0.35em] text-amber-500/90">BANCO NEXUS · SIMULADOR SQL / RL</p>
            <h1 class="font-mono text-5xl font-bold text-white leading-[1.05]">
              DROP TABLE<br /><span class="text-amber-400 drop-shadow-[0_0_18px_rgba(245,158,11,0.45)]">Life;</span>
            </h1>
            <p class="text-nexus-muted text-sm max-w-xs">
              Aprende SQL. Sobrevive a los tickets del banco. Entrena al agente que hará tu trabajo.
            </p>

            <div class="flex flex-col gap-2 mt-2 max-w-xs">
              <button onClick={start}
                class="px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-left transition-colors shadow-lg shadow-amber-900/30">
                ▶ Empezar juego
              </button>
              <button onClick={() => setChaptersOpen(!chaptersOpen)}
                class="px-5 py-3 rounded-lg border border-nexus-border hover:border-amber-500/50 text-nexus-text text-left transition-colors bg-white/[0.03]">
                {chaptersOpen ? '▾' : '▸'} Capítulos / Escenarios
              </button>

              {chaptersOpen && (
                <div class="flex flex-col gap-1.5 mt-1">
                  {SCENARIOS.slice(1).map((s) => (
                    <button key={s.id} onClick={() => { setScenario(s.id); window.fx?.play?.('tecla'); }}
                      class={`px-4 py-2.5 rounded-lg text-left border transition-colors ${scenario === s.id ? 'border-amber-500/70 bg-amber-500/10' : 'border-nexus-border bg-white/[0.02] hover:border-nexus-muted'}`}>
                      <div class="flex items-center gap-2">
                        <span class={`font-mono text-xs ${scenario === s.id ? 'text-amber-400' : 'text-nexus-muted'}`}>{s.id}.</span>
                        <span class="text-sm font-medium text-white">{s.nombre}</span>
                        <span class="ml-auto text-[10px] text-nexus-muted">{s.lugar}</span>
                      </div>
                      <p class="text-[11px] text-nexus-muted mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div class="text-[11px] text-nexus-muted/80 font-mono mt-3 space-y-1">
              <p>🖱 Ratón: mirar · Rueda: acercarse</p>
              <p>⌨ E / Clic en el monitor: entrar al OS</p>
              <p class="text-nexus-muted/50">Three.js procedural · 0 assets externos</p>
            </div>
          </div>

          {/* Botón discreto único en esquina superior izquierda: solo ☰ Menú */}
          {started && !menuOpen && !transitioning && (
            <button onClick={() => setMenuOpen(true)}
              class="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-md bg-black/50 border border-nexus-border backdrop-blur text-xs text-nexus-muted hover:text-white transition-colors">
              ☰ Menú · <span class="text-amber-400/90">{sc.nombre} — {sc.lugar}</span>
            </button>
          )}

          {/* === MODAL CELULAR · iPhone (Lock Screen 10:20 → Chat oscuro WhatsApp/iMessage) === */}
          {phoneOpen && (
            <div
              class="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={(e) => { if (e.target === e.currentTarget) closePhone(); }}
            >
              <div class="relative window-enter" style={{ maxHeight: '94vh' }}>
                {/* Cerrar (fuera del marco) */}
                <button
                  onClick={closePhone}
                  aria-label="Cerrar celular"
                  class="absolute -top-3 -right-3 z-50 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-sm flex items-center justify-center border border-white/20 shadow-xl"
                >
                  ✕
                </button>

                {/* Marco iPhone */}
                <div
                  class="relative rounded-[3.2rem] p-[10px] bg-gradient-to-b from-[#3f3f46] via-[#1c1c1f] to-[#0a0a0c] shadow-[0_0_100px_rgba(0,0,0,0.95),0_0_140px_rgba(16,185,129,0.12),0_0_180px_rgba(139,92,246,0.14)]"
                  style={{ width: '348px', height: 'min(736px, 92vh)' }}
                >
                  {/* Botones laterales (titanio) */}
                  <div class="absolute -left-[3px] top-[96px] w-[3px] h-8 bg-[#2a2a2e] rounded-l" />
                  <div class="absolute -left-[3px] top-[148px] w-[3px] h-14 bg-[#2a2a2e] rounded-l" />
                  <div class="absolute -left-[3px] top-[220px] w-[3px] h-14 bg-[#2a2a2e] rounded-l" />
                  <div class="absolute -right-[3px] top-[160px] w-[3px] h-20 bg-[#2a2a2e] rounded-r" />

                  {/* Pantalla */}
                  <div class="relative w-full h-full rounded-[2.6rem] overflow-hidden bg-black">
                    {/* Dynamic Island */}
                    <div class="absolute top-2.5 left-1/2 -translate-x-1/2 w-[108px] h-[28px] bg-black rounded-full z-30 pointer-events-none flex items-center justify-end pr-3">
                      <span class="w-2.5 h-2.5 rounded-full bg-[#121622] ring-1 ring-white/10" />
                    </div>

                    {!phoneUnlocked ? (
                      // ============ LOCK SCREEN (iPhone · 10:20) ============
                      <div class="absolute inset-0 text-white overflow-hidden select-none">
                        {/* Wallpaper oscuro degradado */}
                        <div class="absolute inset-0" style={{
                          background:
                            'radial-gradient(ellipse 75% 50% at 50% 100%, rgba(251,146,60,0.32) 0%, transparent 62%),' +
                            'radial-gradient(ellipse 90% 60% at 25% 15%, rgba(99,102,241,0.45) 0%, transparent 65%),' +
                            'radial-gradient(ellipse 95% 70% at 80% 50%, rgba(88,28,135,0.52) 0%, transparent 65%),' +
                            '#05030a',
                        }} />

                        {/* Status bar */}
                        <div class="absolute top-0 left-0 right-0 pt-3.5 px-7 flex justify-between items-center text-[13px] font-semibold z-20">
                          <span class="tracking-tight">{horaCelular}</span>
                          <span class="flex items-center gap-1.5">
                            <SignalIcon />
                            <WifiIcon />
                            <BatteryIcon />
                          </span>
                        </div>

                        {/* Candado */}
                        <div class="absolute top-[56px] left-1/2 -translate-x-1/2 z-20 text-white/85">
                          <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current" aria-hidden="true">
                            <path d="M12 1a5 5 0 00-5 5v3H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V11a2 2 0 00-2-2h-2V6a5 5 0 00-5-5zm-3 5a3 3 0 016 0v3H9V6z" />
                          </svg>
                        </div>

                        {/* Fecha + Hora grande 10:20 */}
                        <div class="absolute top-[80px] left-0 right-0 text-center z-20 px-3">
                          <p class="text-[14px] font-medium text-white/90 capitalize tracking-tight">{lockDate}</p>
                          <p
                            class="text-[84px] font-thin leading-[0.92] tracking-[-0.05em] text-white mt-1 tabular-nums drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
                            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
                          >
                            {horaCelular}
                          </p>
                        </div>

                        {/* Notificación de WhatsApp: BD — Supervivientes del parcial */}
                        <button
                          onClick={() => { setPhoneUnlocked(true); window.fx?.play?.('tecla'); }}
                          class="absolute top-[45%] left-3 right-3 z-20 text-left p-3.5 rounded-[22px] bg-white/[0.12] backdrop-blur-2xl border border-white/[0.16] hover:bg-white/[0.18] active:scale-[0.98] transition-all shadow-xl"
                        >
                          <div class="flex gap-3 items-start">
                            <div class="relative w-10 h-10 rounded-[12px] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-md">
                              <svg viewBox="0 0 24 24" class="w-5 h-5 fill-white" aria-hidden="true">
                                <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
                              </svg>
                              <span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow">
                                {celular.mensajes_iniciales.length}
                              </span>
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="flex justify-between items-baseline gap-2">
                                <p class="text-[13px] font-semibold text-white truncate">
                                  {nombreGrupo}
                                </p>
                                <p class="text-[11px] text-white/60 shrink-0">ahora</p>
                              </div>
                              <p class="text-[12.5px] text-white/90 mt-0.5 leading-snug line-clamp-2">
                                <span class="font-semibold text-emerald-300">{primerMensaje?.de || 'Diego'}:</span>{' '}
                                {primerMensaje?.texto}
                              </p>
                              <p class="text-[10.5px] text-white/55 mt-1.5 font-medium">
                                +{celular.mensajes_iniciales.length - 1} mensajes nuevos · Toca para abrir
                              </p>
                            </div>
                          </div>
                        </button>

                        {/* Deslizador / Botón para abrir */}
                        <div class="absolute bottom-[98px] left-5 right-5 z-20">
                          <button
                            onClick={() => { setPhoneUnlocked(true); window.fx?.play?.('tecla'); }}
                            class="w-full py-2.5 px-4 rounded-full bg-white/[0.12] hover:bg-white/[0.2] border border-white/20 backdrop-blur-md flex items-center justify-center gap-2 text-[13px] font-medium text-white/95 transition-all group"
                          >
                            <span class="w-6 h-6 rounded-full bg-emerald-500/90 text-black flex items-center justify-center text-xs font-bold group-hover:translate-x-0.5 transition-transform">
                              ›
                            </span>
                            <span>Deslizar para abrir chat</span>
                          </button>
                        </div>

                        {/* Linterna + Cámara */}
                        <div class="absolute bottom-6 left-6 right-6 flex justify-between z-20">
                          <button
                            type="button"
                            class="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/65 transition-colors"
                            aria-label="Linterna"
                          >
                            <FlashlightIcon />
                          </button>
                          <button
                            type="button"
                            class="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/65 transition-colors"
                            aria-label="Cámara"
                          >
                            <CameraIcon />
                          </button>
                        </div>

                        {/* Home indicator */}
                        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-white/75 z-20" />
                      </div>
                    ) : (
                      // ============ CHAT OSCURO (WhatsApp / iMessage) ============
                      <div class="absolute inset-0 flex flex-col bg-[#0b141a] text-white">
                        {/* Status bar */}
                        <div class="pt-3.5 px-7 pb-1.5 flex justify-between items-center text-[13px] font-semibold bg-[#111b21] z-20 shrink-0">
                          <span class="tracking-tight">{horaCelular}</span>
                          <span class="flex items-center gap-1.5">
                            <SignalIcon />
                            <WifiIcon />
                            <BatteryIcon />
                          </span>
                        </div>

                        {/* Header del grupo */}
                        <div class="px-2 py-2 flex items-center gap-1.5 bg-[#111b21] border-b border-white/[0.08] z-20 shrink-0">
                          <button
                            onClick={() => { setPhoneUnlocked(false); setPhoneReply(null); }}
                            class="text-emerald-400 hover:text-emerald-300 w-8 h-8 flex items-center justify-center rounded-full"
                            aria-label="Volver a pantalla de bloqueo"
                          >
                            <ChevronLeft />
                          </button>
                          <div class="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xs font-bold shrink-0 shadow ring-1 ring-white/15">
                            BD
                          </div>
                          <div class="flex-1 min-w-0 ml-1">
                            <p class="text-[13px] font-semibold text-white truncate leading-tight">
                              {nombreGrupo}
                            </p>
                            <p class="text-[11px] text-slate-400 truncate">
                              Diego, Valeria, Tú
                            </p>
                          </div>
                          <span class="text-slate-400 w-8 h-8 flex items-center justify-center">
                            <VideoIcon />
                          </span>
                        </div>

                        {/* Hilo de mensajes */}
                        <div
                          ref={msgContainerRef}
                          class="flex-1 overflow-y-auto px-3 py-3 space-y-2"
                          style={{
                            backgroundImage:
                              'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)',
                            backgroundSize: '18px 18px',
                          }}
                        >
                          <div class="flex justify-center pb-1">
                            <span class="px-3 py-0.5 rounded-full bg-[#182229] text-[10.5px] text-slate-400 border border-white/[0.05]">
                              Hoy · {horaCelular}
                            </span>
                          </div>

                          {celular.mensajes_iniciales.map((m, i) => (
                            <div key={i} class="max-w-[84%]">
                              <div class="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#202c33] border border-white/[0.04] shadow-sm">
                                <p class={`text-[11px] font-semibold mb-0.5 ${SENDER_COLORS[m.de] || 'text-amber-300'}`}>
                                  {m.de}
                                </p>
                                <p class="text-[13px] text-slate-100 leading-snug">{m.texto}</p>
                                <p class="text-[10px] text-slate-400 text-right mt-0.5">
                                  {horasIniciales[i] || horaCelular}
                                </p>
                              </div>
                            </div>
                          ))}

                          {phoneReply && (
                            <>
                              {/* Burbuja del jugador */}
                              <div class="max-w-[84%] ml-auto">
                                <div class="px-3 py-2 rounded-2xl rounded-tr-sm bg-[#005c4b] border border-emerald-400/20 shadow-sm">
                                  <p class="text-[13px] text-white leading-snug">{phoneReply.texto}</p>
                                  <p class="text-[10px] text-emerald-200/80 text-right mt-0.5">
                                    {horaCelular} ✓✓
                                  </p>
                                </div>
                              </div>

                              {/* Respuestas de los compañeros */}
                              {phoneReply.respuesta.map((r, i) => (
                                <div key={i} class="max-w-[84%]">
                                  <div class="px-3 py-2 rounded-2xl rounded-tl-sm bg-[#202c33] border border-white/[0.04] shadow-sm">
                                    <p class={`text-[11px] font-semibold mb-0.5 ${SENDER_COLORS[r.de] || 'text-amber-300'}`}>
                                      {r.de}
                                    </p>
                                    <p class="text-[13px] text-slate-100 leading-snug">{r.texto}</p>
                                    <p class="text-[10px] text-slate-400 text-right mt-0.5">10:21</p>
                                  </div>
                                </div>
                              ))}

                              {/* Aviso del docente */}
                              <div class="pt-1.5">
                                <div class="px-3.5 py-2.5 rounded-2xl bg-amber-500/15 border border-amber-400/35 shadow-sm">
                                  <p class="text-[10.5px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                                    📌 {celular.aviso_docente.de}
                                  </p>
                                  <p class="text-[12.5px] text-amber-50 leading-snug">
                                    {celular.aviso_docente.texto}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Zona inferior: opciones A/B/C o ir al ordenador */}
                        <div class="px-2.5 pt-2 pb-5 bg-[#111b21] border-t border-white/[0.08] z-20 shrink-0">
                          {!phoneReply ? (
                            <div class="space-y-1.5">
                              <p class="text-[10px] text-slate-400 px-1 uppercase tracking-wider font-semibold">
                                Elige tu respuesta
                              </p>
                              {celular.opciones.map((op) => (
                                <button
                                  key={op.id}
                                  onClick={() => { setPhoneReply(op); window.fx?.play?.('tecla'); }}
                                  class="w-full text-left px-3 py-2 rounded-xl bg-[#202c33] hover:bg-[#005c4b]/70 border border-white/10 hover:border-emerald-400/40 text-[12.5px] text-slate-100 transition-colors leading-snug"
                                >
                                  <span class="inline-block font-mono font-bold text-emerald-400 mr-1.5">{op.id}.</span>
                                  {op.texto}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                closePhone();
                                window.fx?.play?.('exito');
                                window.dispatchEvent(new CustomEvent('nexus:monitor-click', { detail: { scenario: scenarioRef.current } }));
                              }}
                              class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors shadow-lg shadow-emerald-950/40"
                            >
                              Ir al ordenador →
                            </button>
                          )}
                        </div>

                        {/* Home indicator */}
                        <div class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-white/70 z-20 pointer-events-none" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === MODAL CUADERNO (Papel rayado limpio · 5 temas SQL + clave SELECTme) === */}
          {notebookOpen && (() => {
            const pg = paginasCuaderno[nbPage] || paginasCuaderno[0];
            return (
              <div
                class="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => { if (e.target === e.currentTarget) setNotebookOpen(false); }}
              >
                <div class="w-full max-w-xl rounded-2xl border-2 border-amber-900/60 bg-[#fefcf3] text-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.65)] overflow-hidden window-enter">
                  {/* Encabezado del cuaderno */}
                  <div class="px-5 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#1e293b] text-amber-50 flex items-center justify-between border-b border-amber-900/30">
                    <div class="flex items-center gap-2.5">
                      <span class="text-base">📒</span>
                      <div>
                        <p class="font-mono text-xs font-semibold tracking-wide">Cuaderno de Apuntes · SQL</p>
                        <p class="text-[10.5px] text-sky-200/80">
                          Tema {nbPage + 1} de {paginasCuaderno.length} · Clave CampusOS: <span class="font-mono font-bold text-amber-300">SELECTme</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotebookOpen(false)}
                      class="text-xs px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      ✕ Cerrar
                    </button>
                  </div>

                  {/* Hoja rayada con margen rojo */}
                  <div
                    class="relative pl-12 pr-6 py-5 min-h-[320px] space-y-3.5"
                    style={{
                      backgroundColor: '#fefcf3',
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(147,197,253,0.45) 28px)',
                    }}
                  >
                    {/* Línea vertical de margen */}
                    <div class="absolute inset-y-0 left-9 w-[2px] bg-rose-300/75 pointer-events-none" />
                    {/* Perforaciones de espiral */}
                    <div class="absolute inset-y-4 left-2.5 flex flex-col justify-between pointer-events-none">
                      {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                        <span key={h} class="w-3 h-3 rounded-full bg-slate-800/20 border border-slate-500/30" />
                      ))}
                    </div>

                    {pg.nota_clave && (
                      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-yellow-200 border border-yellow-400/90 text-slate-900 font-mono text-xs font-semibold shadow-sm -rotate-1">
                        <span>📌</span>
                        <span>{pg.nota_clave}</span>
                      </div>
                    )}

                    <h3 class="text-base font-bold text-slate-900 leading-snug">{pg.titulo}</h3>
                    <p class="text-[13.5px] text-slate-700 leading-relaxed">{pg.resumen}</p>

                    <ul class="text-[12.5px] text-slate-700 space-y-1.5">
                      {pg.puntos.map((pt, i) => (
                        <li key={i} class="flex items-start gap-2">
                          <span class="text-blue-700 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>

                    <pre class="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto shadow-inner border border-slate-700">
                      {pg.ejemplo}
                    </pre>

                    <div class="px-3 py-2 rounded-lg bg-blue-50/90 border border-blue-200 text-xs font-medium text-blue-950">
                      <span class="font-bold text-blue-800">Regla clave:</span> {pg.regla}
                    </div>
                  </div>

                  {/* Paginación */}
                  <div class="px-5 py-3 bg-[#f5efe0] border-t border-amber-200/90 flex items-center justify-between gap-3">
                    <button
                      onClick={() => { setNbPage((p) => Math.max(0, p - 1)); window.fx?.play?.('tecla'); }}
                      disabled={nbPage === 0}
                      class="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium disabled:opacity-35 transition-colors"
                    >
                      ◀ Anterior
                    </button>

                    <div class="flex items-center gap-1.5">
                      {paginasCuaderno.map((p, idx) => (
                        <button
                          key={p.id}
                          onClick={() => { setNbPage(idx); window.fx?.play?.('tecla'); }}
                          class={`w-6 h-6 rounded-full text-[11px] font-mono font-semibold transition-colors ${
                            nbPage === idx
                              ? 'bg-blue-700 text-white shadow'
                              : 'bg-amber-200/70 text-slate-700 hover:bg-amber-300/80'
                          }`}
                          aria-label={`Ir al tema ${idx + 1}`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => { setNbPage((p) => Math.min(paginasCuaderno.length - 1, p + 1)); window.fx?.play?.('tecla'); }}
                      disabled={nbPage === paginasCuaderno.length - 1}
                      class="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium disabled:opacity-35 transition-colors"
                    >
                      Siguiente ▶
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Prompt contextual (monitor / móvil / cuaderno / taza / post-it) */}
          {promptTag && started && !menuOpen && !transitioning && !phoneOpen && !notebookOpen && (
            <div class="prompt-pulse absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-black/80 border border-amber-500/60 backdrop-blur text-sm text-white font-mono pointer-events-none whitespace-nowrap shadow-xl">
              <span class="text-amber-400">[Clic{promptTag === 'monitor' ? ' / E' : ''}]</span>{' '}
              {PROMPT_LABELS[promptTag] || 'Interactuar'}
            </div>
          )}

          {/* Toast de pistas */}
          {toast && !transitioning && (
            <div key={toast.id} class="window-enter absolute bottom-6 left-6 z-20 max-w-sm px-4 py-3 rounded-lg bg-nexus-panel/90 border border-nexus-border backdrop-blur text-sm text-nexus-text shadow-xl pointer-events-none">
              {toast.text}
            </div>
          )}
        </>
      )}
    </div>
  );
}
