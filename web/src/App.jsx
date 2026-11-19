// web/src/App.jsx
import { useState, useEffect } from 'preact/hooks';
import DeskScene from './scene/DeskScene.jsx';
import LockScreen from './components/LockScreen.jsx';
import TopBar from './components/TopBar.jsx';
import Dock from './components/Dock.jsx';
import Window from './components/Window.jsx';
import MailApp from './components/Apps/MailApp.jsx';
import SqlTerminalApp from './components/Apps/SqlTerminalApp.jsx';
import AcademyApp from './components/Apps/AcademyApp.jsx';
import RlPanelApp from './components/Apps/RlPanelApp.jsx';
import ChatApp from './components/Apps/ChatApp.jsx';
import PhoneChatApp from './components/Apps/PhoneChatApp.jsx';
import ErViewerApp from './components/Apps/ErViewerApp.jsx';
import NotesApp from './components/Apps/NotesApp.jsx';
import GitHubApp from './components/Apps/GitHubApp.jsx';

const TITLES = {
  mail: 'Correo / Misiones',
  chat: 'Mensajes',
  sql: 'Terminal SQL',
  academy: 'Práctica SQL · CampusOS',
  er: 'Visor E-R Universitario',
  notes: 'Apuntes de Base de Datos',
  rl: 'Progreso y Tutor RL',
  github: 'GitHub / PRs',
};

const PARCIAL_BLOQUES = [
  { num: 1, id: 'b1_select', label: 'Fundamentos y SELECT' },
  { num: 2, id: 'b2_where', label: 'WHERE y operadores' },
  { num: 3, id: 'b3_avanzada', label: 'BETWEEN · LIKE · IN' },
  { num: 4, id: 'b4_order_distinct', label: 'ORDER BY y DISTINCT' },
  { num: 5, id: 'b5_parcial', label: 'Reto del parcial' },
];

function leerCompletadosTutor() {
  try {
    const raw = localStorage.getItem('campusos_tutor_rl_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.completados) ? parsed.completados : [];
  } catch {
    return [];
  }
}

/* -------------------- Toasts -------------------- */
function Toasts({ toasts }) {
  return (
    <div class="fixed top-11 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          class={`pointer-events-auto px-4 py-2.5 rounded-xl bg-[#141824]/92 backdrop-blur-2xl border border-white/[0.14] shadow-[0_14px_36px_rgba(0,0,0,0.6)] text-[13px] text-slate-100 window-enter ${
            t.tipo === 'error'
              ? 'border-l-2 border-l-red-400'
              : t.tipo === 'exito'
              ? 'border-l-2 border-l-emerald-400'
              : 'border-l-2 border-l-sky-400'
          }`}
        >
          {t.texto}
        </div>
      ))}
    </div>
  );
}

/* -------------------- Widget: reloj/fecha (Escenario 1) -------------------- */
function ClockWidget() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const hora = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dia = now.toLocaleDateString('es-ES', { weekday: 'long' });
  const fecha = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace(/\./g, '');

  return (
    <div class="rounded-[20px] bg-[#141824]/52 backdrop-blur-2xl border border-white/[0.12] ring-1 ring-inset ring-white/[0.05] px-4 py-3.5 shadow-[0_16px_38px_rgba(0,0,0,0.45)] text-right pointer-events-auto select-none min-w-[138px]">
      <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/80 capitalize">
        {dia}
      </p>
      <p class="text-[32px] font-extralight text-white/95 leading-none tracking-tight tabular-nums mt-1">
        {hora}
      </p>
      <p class="text-[11px] text-slate-400 mt-1.5 capitalize">{fecha}</p>
    </div>
  );
}

/* -------------------- Widget: progreso del parcial (5 bloques) -------------------- */
function ParcialProgressWidget({ completados, onOpenAcademy }) {
  const isDone = (b) =>
    completados.includes(b.id) || completados.includes(b.num) || completados.includes(String(b.num));
  const hechos = PARCIAL_BLOQUES.filter(isDone).length;
  const pct = Math.round((hechos / PARCIAL_BLOQUES.length) * 100);

  return (
    <div
      onClick={onOpenAcademy}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpenAcademy?.();
      }}
      class="group rounded-[20px] bg-[#141824]/52 hover:bg-[#181d2c]/65 backdrop-blur-2xl border border-white/[0.12] ring-1 ring-inset ring-white/[0.05] p-3.5 shadow-[0_16px_38px_rgba(0,0,0,0.45)] pointer-events-auto select-none w-[216px] cursor-pointer transition-colors"
      title="Abrir Práctica SQL"
    >
      <div class="flex items-center justify-between">
        <p class="text-[10px] uppercase tracking-[0.12em] text-slate-300/90 font-semibold">
          Progreso del Parcial
        </p>
        <span class="text-[10.5px] text-amber-300 font-mono font-medium">
          {hechos}/{PARCIAL_BLOQUES.length}
        </span>
      </div>

      {/* Barra de progreso sutil */}
      <div class="mt-2 mb-2.5 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
        <div
          class="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${Math.max(pct, hechos > 0 ? 12 : 0)}%` }}
        />
      </div>

      <ul class="space-y-1.5">
        {PARCIAL_BLOQUES.map((b) => {
          const done = isDone(b);
          return (
            <li key={b.id} class="flex items-center gap-2 text-[11px] leading-tight">
              <span
                class={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  done
                    ? 'bg-emerald-400/90 border-emerald-300 text-[#062214]'
                    : 'border-white/25 bg-white/[0.03]'
                }`}
              >
                {done && (
                  <svg class="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2.5 6.2 5 8.6 9.5 3.6" />
                  </svg>
                )}
              </span>
              <span class={done ? 'text-slate-400 line-through' : 'text-slate-200/95'}>
                {b.num}. {b.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------- Widget: carpeta Apuntes_BD (estilo macOS) -------------------- */
function FolderIcon({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onDblClick={onOpen}
      class="flex flex-col items-center gap-1.5 group pointer-events-auto select-none p-2 rounded-2xl hover:bg-white/[0.07] active:bg-white/[0.12] transition-colors focus:outline-none"
      title="Abrir Apuntes de Base de Datos"
    >
      <div class="relative w-14 h-12 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]">
        <svg viewBox="0 0 64 54" class="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="macFolderBack" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#60b8ff" />
              <stop offset="100%" stop-color="#2b7be9" />
            </linearGradient>
            <linearGradient id="macFolderFront" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7cd0ff" />
              <stop offset="18%" stop-color="#4ba6f9" />
              <stop offset="100%" stop-color="#256fd9" />
            </linearGradient>
          </defs>
          {/* Pestaña trasera */}
          <path
            d="M4 11 C4 7.7 6.7 5 10 5 H23.5 C25.6 5 27.5 6.1 28.6 7.8 L30.6 11 H54 C57.3 11 60 13.7 60 17 V45 C60 48.3 57.3 51 54 51 H10 C6.7 51 4 48.3 4 45 Z"
            fill="url(#macFolderBack)"
          />
          {/* Cuerpo frontal con brillo superior */}
          <rect x="4" y="15" width="56" height="36" rx="6" fill="url(#macFolderFront)" />
          <line x1="8" y1="16.2" x2="56" y2="16.2" stroke="rgba(255,255,255,0.45)" stroke-width="1.2" stroke-linecap="round" />
        </svg>
      </div>
      <span class="text-[11px] text-white/95 font-medium tracking-[-0.01em] px-2 py-0.5 rounded-md bg-black/35 group-hover:bg-blue-500/75 transition-colors drop-shadow">
        Apuntes_BD
      </span>
    </button>
  );
}

/* -------------------- App -------------------- */
export default function App() {
  const [view, setView] = useState('mesa');
  const [scenario, setScenario] = useState(1);
  const [osMounted, setOsMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [openWindows, setOpenWindows] = useState([]);
  const [activeWindow, setActiveWindow] = useState(null);
  const [minimizedWindows, setMinimizedWindows] = useState(() => new Set());
  const [zMap, setZMap] = useState({});
  const [toasts, setToasts] = useState([]);
  const [badges, setBadges] = useState({ chat: 3, mail: 1 });
  const [completadosParcial, setCompletadosParcial] = useState(leerCompletadosTutor);

  // Contrato: Escena 3D → Interfaz
  useEffect(() => {
    const onMonitorClick = (e) => {
      if (e.detail?.scenario) setScenario(e.detail.scenario);
      setOsMounted(true);
      setView('os');
    };
    const onScenarioChange = (e) => {
      if (e.detail?.scenario) setScenario(e.detail.scenario);
    };
    window.addEventListener('nexus:monitor-click', onMonitorClick);
    window.addEventListener('nexus:scenario-change', onScenarioChange);
    return () => {
      window.removeEventListener('nexus:monitor-click', onMonitorClick);
      window.removeEventListener('nexus:scenario-change', onScenarioChange);
    };
  }, []);

  // Contrato: Interfaz → Escena 3D / FX
  useEffect(() => {
    if (!isLocked) window.dispatchEvent(new CustomEvent('nexus:os-ready'));
  }, [isLocked]);

  // Sincronizar progreso del parcial con localStorage
  useEffect(() => {
    const syncProgreso = () => setCompletadosParcial(leerCompletadosTutor());
    window.addEventListener('storage', syncProgreso);
    window.addEventListener('nexus:toast', syncProgreso);
    return () => {
      window.removeEventListener('storage', syncProgreso);
      window.removeEventListener('nexus:toast', syncProgreso);
    };
  }, []);

  // Toasts + eventos de misión + chat + abrir app
  useEffect(() => {
    const addToast = (e) => {
      const id = Date.now() + Math.random();
      const texto = e.detail?.texto || 'Notificación';
      const tipo = e.detail?.tipo || 'info';
      setToasts((prev) => [...prev, { id, texto, tipo }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    const onMisionIniciada = (e) => console.log('[OS] Misión iniciada:', e.detail.id);
    const onMisionResuelta = (e) =>
      console.log('[OS] Misión resuelta:', e.detail.id, 'Puntos:', e.detail.puntos);
    const onChatNuevo = () => {
      if (activeWindow !== 'chat') {
        setBadges((b) => ({ ...b, chat: (b.chat || 0) + 1 }));
      }
    };
    const onMisionResueltaResetBadge = (e) => {
      if (e.detail?.id) {
        setBadges((b) => ({ ...b, mail: Math.max(0, (b.mail || 0) - 1) }));
      }
    };
    const onOpenApp = (e) => {
      const appId = e.detail?.appId;
      if (!appId) return;
      setOpenWindows((prev) => (prev.includes(appId) ? prev : [...prev, appId]));
      setMinimizedWindows((prev) => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
      setActiveWindow(appId);
      setZMap((prev) => {
        const maxZ = Math.max(10, ...Object.values(prev), 0);
        return { ...prev, [appId]: maxZ + 1 };
      });
    };

    window.addEventListener('nexus:toast', addToast);
    window.addEventListener('nexus:mision-iniciada', onMisionIniciada);
    window.addEventListener('nexus:mision-resuelta', onMisionResuelta);
    window.addEventListener('nexus:mision-resuelta', onMisionResueltaResetBadge);
    window.addEventListener('nexus:chat-nuevo', onChatNuevo);
    window.addEventListener('nexus:open-app', onOpenApp);
    return () => {
      window.removeEventListener('nexus:toast', addToast);
      window.removeEventListener('nexus:mision-iniciada', onMisionIniciada);
      window.removeEventListener('nexus:mision-resuelta', onMisionResuelta);
      window.removeEventListener('nexus:mision-resuelta', onMisionResueltaResetBadge);
      window.removeEventListener('nexus:chat-nuevo', onChatNuevo);
      window.removeEventListener('nexus:open-app', onOpenApp);
    };
  }, [activeWindow]);

  const bringToFront = (appId) => {
    if (minimizedWindows.has(appId)) return;
    setZMap((prev) => {
      const maxZ = Math.max(10, ...Object.values(prev), 0);
      return { ...prev, [appId]: maxZ + 1 };
    });
    setActiveWindow(appId);
  };

  const toggleWindow = (appId) => {
    if (
      openWindows.includes(appId) &&
      activeWindow === appId &&
      !minimizedWindows.has(appId)
    ) {
      setActiveWindow(null);
      return;
    }
    if (openWindows.includes(appId) && minimizedWindows.has(appId)) {
      setMinimizedWindows((prev) => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
      bringToFront(appId);
      return;
    }
    if (openWindows.includes(appId)) {
      bringToFront(appId);
      return;
    }
    setOpenWindows((prev) => [...prev, appId]);
    setMinimizedWindows((prev) => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
    setZMap((prev) => {
      const maxZ = Math.max(10, ...Object.values(prev), 0);
      return { ...prev, [appId]: maxZ + 1 };
    });
    setActiveWindow(appId);
    if (badges[appId]) {
      setBadges((b) => ({ ...b, [appId]: 0 }));
    }
  };

  const closeWindow = (appId) => {
    setOpenWindows((prev) => prev.filter((id) => id !== appId));
    setMinimizedWindows((prev) => {
      const next = new Set(prev);
      next.delete(appId);
      return next;
    });
    setZMap((prev) => {
      const next = { ...prev };
      delete next[appId];
      return next;
    });
    if (activeWindow === appId) setActiveWindow(null);
  };

  const minimizeWindow = (appId) => {
    setMinimizedWindows((prev) => new Set([...prev, appId]));
    if (activeWindow === appId) setActiveWindow(null);
  };

  const renderWindow = (appId) => {
    const isActive = activeWindow === appId;
    const isMinimized = minimizedWindows.has(appId);
    const z = isActive ? (zMap[appId] || 10) + 1 : zMap[appId] || 10;

    const commonProps = {
      appId,
      title: TITLES[appId] || appId,
      isActive,
      zIndex: z,
      onClose: () => closeWindow(appId),
      onFocus: () => bringToFront(appId),
      onMinimize: () => minimizeWindow(appId),
    };

    const wrapperStyle = isMinimized ? { display: 'none' } : undefined;

    switch (appId) {
      case 'mail':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 640, h: 460 }}>
              <MailApp />
            </Window>
          </div>
        );
      case 'chat':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 660, h: 480 }}>
              {scenario === 1 ? <PhoneChatApp /> : <ChatApp />}
            </Window>
          </div>
        );
      case 'er':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 680, h: 480 }}>
              <ErViewerApp />
            </Window>
          </div>
        );
      case 'sql':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 760, h: 520 }}>
              <SqlTerminalApp />
            </Window>
          </div>
        );
      case 'academy':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 860, h: 560 }}>
              <AcademyApp
                scenario={scenario}
                onGoToNivel2={() => {
                  setScenario(2);
                  setIsLocked(true);
                  setOpenWindows([]);
                }}
              />
            </Window>
          </div>
        );
      case 'notes':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 700, h: 480 }}>
              <NotesApp scenario={scenario} />
            </Window>
          </div>
        );
      case 'rl':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 760, h: 520 }}>
              <RlPanelApp />
            </Window>
          </div>
        );
      case 'github':
        return (
          <div style={wrapperStyle}>
            <Window {...commonProps} defaultSize={{ w: 700, h: 520 }}>
              <GitHubApp />
            </Window>
          </div>
        );
      default:
        return null;
    }
  };

  const volverALaMesa = () => {
    window.fx?.play?.('tecla');
    setView('mesa');
  };

  const abrirApp = (appId) =>
    window.dispatchEvent(new CustomEvent('nexus:open-app', { detail: { appId } }));

  return (
    <div class="relative w-screen h-screen overflow-hidden bg-[#070a12]">
      {/* Wallpaper animado estilo macOS oscuro/acogedor con logo sutil */}
      {osMounted && (
        <div
          class={`absolute inset-0 z-20 pointer-events-none overflow-hidden mac-aurora ${
            view === 'os' ? 'os-fade-in' : 'hidden'
          }`}
        >
          <div
            class="mac-orb-1 absolute -top-28 -left-24 w-[560px] h-[560px] rounded-full blur-3xl opacity-35"
            style={{
              background:
                scenario === 1
                  ? 'radial-gradient(circle, rgba(56,189,248,0.48), transparent 70%)'
                  : 'radial-gradient(circle, rgba(16,185,129,0.48), transparent 70%)',
            }}
          />
          <div
            class="mac-orb-2 absolute -bottom-28 -right-24 w-[580px] h-[580px] rounded-full blur-3xl opacity-30"
            style={{
              background:
                scenario === 1
                  ? 'radial-gradient(circle, rgba(245,158,11,0.36), transparent 70%)'
                  : 'radial-gradient(circle, rgba(59,130,246,0.42), transparent 70%)',
            }}
          />
          <div
            class="mac-orb-3 absolute top-1/3 left-1/2 -translate-x-1/2 w-[480px] h-[480px] rounded-full blur-3xl opacity-20"
            style={{
              background:
                scenario === 1
                  ? 'radial-gradient(circle, rgba(129,140,248,0.42), transparent 70%)'
                  : 'radial-gradient(circle, rgba(6,182,212,0.35), transparent 70%)',
            }}
          />
          {/* Viñeta sutil para calidez */}
          <div
            class="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at center, transparent 48%, rgba(4,6,12,0.55) 100%)',
            }}
          />

          {/* Logo central sutil estilo macOS */}
          <div class="absolute inset-0 flex flex-col items-center justify-center opacity-[0.18] select-none">
            <div
              class={`w-24 h-24 rounded-[26px] flex items-center justify-center border border-white/20 ring-1 ring-inset ring-white/15 shadow-2xl mb-3 ${
                scenario === 1
                  ? 'bg-gradient-to-br from-sky-400/35 via-blue-600/35 to-indigo-800/35'
                  : 'bg-gradient-to-br from-emerald-400/35 to-cyan-800/35'
              }`}
            >
              <span class="font-mono text-3xl font-bold text-white tracking-tight">
                {scenario === 1 ? 'CO' : 'BN'}
              </span>
            </div>
            <p class="font-mono text-sm tracking-[0.28em] uppercase text-white/85">
              {scenario === 1 ? 'CampusOS' : 'Banco Nexus OS'}
            </p>
            <p class="font-mono text-[11px] text-white/55 mt-1">DROP TABLE Life;</p>
          </div>
        </div>
      )}

      {/* La escena 3D vive siempre montada; se pausa el render cuando el OS está encima */}
      <DeskScene active={view === 'mesa'} />

      {osMounted && (
        <div class={`absolute inset-0 z-30 ${view === 'os' ? 'os-fade-in' : 'hidden'}`}>
          {isLocked ? (
            <LockScreen
              scenario={scenario}
              onUnlock={() => {
                setIsLocked(false);
                if (scenario === 1 && openWindows.length === 0) {
                  setOpenWindows(['academy']);
                  setActiveWindow('academy');
                }
              }}
            />
          ) : (
            <div class="relative w-full h-full overflow-hidden select-none text-slate-200">
              <TopBar
                scenario={scenario}
                onVolverMesa={volverALaMesa}
                onLock={() => setIsLocked(true)}
                onCloseActive={() => activeWindow && closeWindow(activeWindow)}
              />

              {/* === Widgets discretos del escritorio (solo Escenario 1, detrás de ventanas) === */}
              {scenario === 1 && (
                <div class="absolute inset-0 top-8 bottom-20 pointer-events-none z-[1]">
                  {/* Carpeta Apuntes_BD (esquina superior izquierda) */}
                  <div class="absolute top-4 left-4 pointer-events-auto">
                    <FolderIcon onOpen={() => abrirApp('notes')} />
                  </div>

                  {/* Tarjeta compacta de progreso del parcial (esquina superior derecha) */}
                  <div class="absolute top-4 right-4 pointer-events-auto">
                    <ParcialProgressWidget
                      completados={completadosParcial}
                      onOpenAcademy={() => abrirApp('academy')}
                    />
                  </div>

                  {/* Widget de reloj/fecha (esquina inferior derecha) */}
                  <div class="absolute bottom-2 right-4 pointer-events-auto">
                    <ClockWidget />
                  </div>
                </div>
              )}

              {/* === Área de ventanas === */}
              <div class="absolute inset-0 pt-8 pb-20 px-2 pointer-events-none z-[10]">
                {openWindows.map((id) => (
                  <div key={id} class="pointer-events-auto">
                    {renderWindow(id)}
                  </div>
                ))}
              </div>

              <Dock
                scenario={scenario}
                activeWindow={activeWindow}
                openWindows={openWindows}
                badges={badges}
                onToggle={toggleWindow}
              />

              <Toasts toasts={toasts} />
            </div>
          )}

          {/* Botón Volver a la mesa (esquina inferior izquierda, estilo macOS discreto) */}
          <button
            type="button"
            onClick={volverALaMesa}
            class="fixed bottom-4 left-4 z-[55] pl-2.5 pr-3.5 py-1.5 rounded-full bg-[#121621]/72 hover:bg-[#1a2030]/90 border border-white/[0.14] ring-1 ring-inset ring-white/[0.05] backdrop-blur-2xl text-[12px] text-slate-200 hover:text-white transition-all flex items-center gap-2 shadow-[0_10px_28px_rgba(0,0,0,0.55)]"
            title="Volver al escritorio 3D"
          >
            <span class="w-5 h-5 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center text-[10px] leading-none text-slate-200">
              ⏻
            </span>
            <span class="font-medium tracking-[-0.01em]">Volver a la mesa</span>
          </button>
        </div>
      )}
    </div>
  );
}
