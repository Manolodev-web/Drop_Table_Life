import { useState, useEffect } from 'preact/hooks';
import { STORY, getActo, getActoActual, setActoActual } from './story';
import nivel1 from '../../../content/nivel1.json';

function getMenus(scenario) {
  if (scenario === 1) {
    return {
      Archivo: [
        'Abrir Práctica SQL',
        'Abrir Visor E-R',
        'Abrir Apuntes',
        '—',
        'Cerrar ventana activa',
        'Bloquear pantalla',
        'Volver a la mesa',
      ],
      Ver: ['Cambiar a mesa 3D', 'Ajustes de sonido'],
      Esquema: null,
      Ayuda: ['Guía rápida SQL', 'Atajos de teclado', 'Acerca de CampusOS'],
    };
  }
  return {
    Archivo: ['Nueva misión', 'Abrir terminal SQL', 'Cerrar ventana activa', '—', 'Salir del OS'],
    Ver: ['Cambiar a mesa 3D', 'Ajustes de sonido', 'Alternar tema'],
    Esquema: null,
    Ayuda: ['Atajos de teclado', 'Documentación SQL', 'Acerca de Banco Nexus'],
  };
}

function getInitialCampusEsquema() {
  if (typeof window !== 'undefined' && window.__campusOsActiveBd?.esquema_er) {
    return {
      nombre: window.__campusOsActiveBd.nombre || 'Universidad',
      tablas: window.__campusOsActiveBd.esquema_er.tablas || [],
    };
  }
  return {
    nombre: 'Universidad',
    tablas: nivel1.esquema_er.tablas || [],
  };
}

export default function TopBar({ scenario = 1, onVolverMesa, onLock, onCloseActive }) {
  const [clockText, setClockText] = useState('');
  const [muted, setMuted] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [acto, setActoState] = useState(getActoActual());
  const [campusEsquema, setCampusEsquema] = useState(getInitialCampusEsquema);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const fecha = now
        .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
        .replace(/\./g, '');
      const hora = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setClockText(`${fecha}  ${hora}`);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onActo = (e) => setActoState(e.detail.numero);
    const onBdCambio = (e) => {
      if (e.detail?.esquema_er?.tablas) {
        setCampusEsquema({
          nombre: e.detail.nombre || e.detail.bdId || 'Base activa',
          tablas: e.detail.esquema_er.tablas,
        });
      }
    };
    window.addEventListener('nexus:acto-cambio', onActo);
    window.addEventListener('nexus:bd-cambio', onBdCambio);
    return () => {
      window.removeEventListener('nexus:acto-cambio', onActo);
      window.removeEventListener('nexus:bd-cambio', onBdCambio);
    };
  }, []);

  const cambiarActo = (n) => {
    setActoActual(n);
    setOpenMenu(null);
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      window.fx?.silenciar?.(next);
      return next;
    });
  };

  const openApp = (appId) => {
    window.dispatchEvent(new CustomEvent('nexus:open-app', { detail: { appId } }));
  };

  const showToast = (texto, tipo = 'info') => {
    window.dispatchEvent(new CustomEvent('nexus:toast', { detail: { texto, tipo } }));
  };

  const handleMenuAction = (menu, item) => {
    setOpenMenu(null);
    if (item === 'Cambiar a mesa 3D' || item === 'Volver a la mesa') {
      onVolverMesa?.();
      return;
    }
    if (item === 'Salir del OS') {
      window.dispatchEvent(new CustomEvent('nexus:os-cerrar'));
      onVolverMesa?.();
      return;
    }
    if (item === 'Bloquear pantalla') {
      onLock?.();
      return;
    }
    if (item === 'Cerrar ventana activa') {
      onCloseActive?.();
      return;
    }
    if (item === 'Abrir Práctica SQL') {
      openApp('academy');
      return;
    }
    if (item === 'Abrir Visor E-R') {
      openApp('er');
      return;
    }
    if (item === 'Abrir Apuntes' || item === 'Guía rápida SQL') {
      openApp('notes');
      return;
    }
    if (item === 'Abrir terminal SQL') {
      openApp('sql');
      return;
    }
    if (item === 'Nueva misión') {
      openApp('mail');
      return;
    }
    if (item === 'Ajustes de sonido') {
      toggleMute();
      return;
    }
    if (item === 'Atajos de teclado') {
      showToast('Ctrl+Enter ejecuta tu consulta SQL · Doble clic en la barra maximiza la ventana.');
      return;
    }
    if (item === 'Acerca de CampusOS') {
      showToast('CampusOS · Entorno de práctica SQL universitario (Aula 204)');
      return;
    }
    if (item === 'Acerca de Banco Nexus') {
      showToast('Banco Nexus OS · Estación de entrenamiento SQL & RL');
    }
  };

  const menus = getMenus(scenario);
  const actoInfo = getActo(acto);

  return (
    <div
      class="absolute top-0 left-0 right-0 h-8 bg-[#090c14]/65 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between px-3 z-40 text-[12.5px] text-slate-200 select-none"
      onMouseLeave={() => setOpenMenu(null)}
    >
      {/* Izquierda: marca + menús estilo macOS */}
      <div class="flex items-center gap-0.5">
        <span class="px-2 py-0.5 font-semibold text-white/95 flex items-center gap-1.5 tracking-[-0.01em]">
          <svg
            class={`w-3.5 h-3.5 ${scenario === 1 ? 'text-sky-400' : 'text-emerald-400'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2.5 3.5 7v10L12 21.5 20.5 17V7L12 2.5zm0 2.3L18.2 8 12 11.2 5.8 8 12 4.8zm-6.5 5 5.5 2.9v6.2l-5.5-2.9V9.8zm13 0v6.2L13 18.9v-6.2l5.5-2.9z" />
          </svg>
          {scenario === 1 ? 'CampusOS' : 'Banco Nexus'}
        </span>

        {Object.keys(menus).map((menu) => (
          <div key={menu} class="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === menu ? null : menu)}
              onMouseEnter={() => openMenu && setOpenMenu(menu)}
              class={`px-2.5 py-0.5 rounded-[5px] text-white/85 hover:text-white transition-colors ${
                openMenu === menu ? 'bg-white/15 text-white' : 'hover:bg-white/10'
              }`}
            >
              {menu}
            </button>

            {openMenu === menu && (
              <div class="absolute top-full left-0 mt-1 min-w-[228px] py-1.5 px-1 rounded-xl bg-[#161a26]/95 backdrop-blur-2xl border border-white/[0.14] ring-1 ring-inset ring-white/[0.05] shadow-[0_18px_45px_rgba(0,0,0,0.72)] z-50">
                {menu === 'Esquema' ? (
                  <div class="text-xs max-h-72 overflow-y-auto px-1">
                    <div class="px-2 py-1 text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-between">
                      <span>Tablas</span>
                      {scenario === 1 && (
                        <span class="text-sky-300/90 normal-case font-medium">{campusEsquema.nombre}</span>
                      )}
                    </div>
                    {(scenario === 1
                      ? campusEsquema.tablas.map((t) => ({
                          nombre: t.nombre,
                          columnas: t.columnas.map(
                            (c) => `${c.nombre} ${c.tipo}${c.pk ? ' PK' : c.fk ? ' FK' : ''}`
                          ),
                        }))
                      : STORY.esquema.tablas
                    ).map((t) => (
                      <div key={t.nombre} class="px-2 py-1.5 rounded-lg hover:bg-white/[0.07] cursor-default">
                        <div class={`font-mono text-[11.5px] ${scenario === 1 ? 'text-sky-300' : 'text-emerald-300'}`}>
                          {t.nombre}
                        </div>
                        <div class="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          {t.columnas.join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  menus[menu].map((item, i) =>
                    item === '—' ? (
                      <div key={i} class="my-1 mx-2 border-t border-white/[0.1]" />
                    ) : (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleMenuAction(menu, item)}
                        class="w-full text-left px-2.5 py-1 rounded-[6px] text-[12.5px] text-slate-200 hover:bg-blue-500/85 hover:text-white transition-colors"
                      >
                        {item}
                      </button>
                    )
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Derecha: estado + controles SVG + fecha/hora */}
      <div class="flex items-center gap-3 text-[12px]">
        {scenario === 1 ? (
          <span class="hidden md:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-slate-300">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-400" />
            Aula 204 · {campusEsquema.nombre}
          </span>
        ) : (
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.09]">
            <span class="text-slate-400 text-[11px]">Acto</span>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => cambiarActo(n)}
                class={`w-5 h-5 rounded text-[10px] font-bold transition-colors ${
                  acto === n ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-white/10'
                }`}
                title={getActo(n).nombre}
              >
                {n}
              </button>
            ))}
            <span class="text-slate-300 ml-1 hidden md:inline text-[11px]">{actoInfo.nombre}</span>
          </div>
        )}

        {/* Wi-Fi SVG */}
        <span class="text-white/80 hidden sm:inline-flex" title="Conectado">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </span>

        {/* Volumen SVG (sin emoji plano) */}
        <button
          type="button"
          onClick={toggleMute}
          class="text-white/80 hover:text-white transition-colors p-0.5 rounded hover:bg-white/10"
          title={muted ? 'Activar sonido' : 'Silenciar'}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        >
          {muted ? (
            <svg class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          ) : (
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>

        {/* Fecha y hora estilo macOS */}
        <span class="text-white/95 font-medium tracking-[-0.01em] tabular-nums capitalize">
          {clockText}
        </span>
      </div>
    </div>
  );
}
