// Iconos SVG estilo macOS (squircles con gradiente y brillo specular, cero emojis planos)
function MacIcon({ id }) {
  const base =
    'w-11 h-11 rounded-[13px] border border-white/20 ring-1 ring-inset ring-white/20 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.45)]';
  const cls = 'w-[22px] h-[22px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]';

  switch (id) {
    case 'academy':
      return (
        <div class={`${base} bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 16 9 11 4 6" />
            <line x1="12" y1="18" x2="20" y2="18" />
            <circle cx="17.5" cy="7.5" r="2" fill="currentColor" stroke="none" class="text-sky-400" />
          </svg>
        </div>
      );
    case 'sql':
      return (
        <div class={`${base} bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
      );
    case 'er':
      return (
        <div class={`${base} bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-700`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
            <path d="M4.5 5.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
            <path d="M4.5 11.5v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" />
          </svg>
        </div>
      );
    case 'notes':
      return (
        <div class={`${base} bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 19.5A2.5 2.5 0 0 1 7.5 17H20" />
            <path d="M7.5 2H20v20H7.5A2.5 2.5 0 0 1 5 19.5v-15A2.5 2.5 0 0 1 7.5 2z" />
            <line x1="9.5" y1="7.5" x2="16" y2="7.5" />
            <line x1="9.5" y1="11.5" x2="14.5" y2="11.5" />
          </svg>
        </div>
      );
    case 'chat':
      return (
        <div class={`${base} bg-gradient-to-b from-emerald-400 via-emerald-500 to-green-700`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 14.5a2 2 0 0 1-2 2H8l-4 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      );
    case 'mail':
      return (
        <div class={`${base} bg-gradient-to-b from-sky-300 via-blue-500 to-blue-700`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2.5" y="4.5" width="19" height="15" rx="2.2" />
            <path d="m21.5 7-8.4 5.4a2 2 0 0 1-2.2 0L2.5 7" />
          </svg>
        </div>
      );
    case 'rl':
      return (
        <div class={`${base} bg-gradient-to-b from-violet-400 via-purple-600 to-indigo-800`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3.5 3.5v17h17" />
            <path d="m19 9-4.8 4.8-3.4-3.4-3.3 3.3" />
          </svg>
        </div>
      );
    case 'github':
    default:
      return (
        <div class={`${base} bg-gradient-to-b from-zinc-600 via-zinc-800 to-zinc-950`}>
          <svg class={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <line x1="6" y1="9" x2="6" y2="21" />
          </svg>
        </div>
      );
  }
}

const APPS_CAMPUS = [
  { id: 'academy', label: 'Práctica SQL' },
  { id: 'er', label: 'Visor E-R' },
  { id: 'notes', label: 'Apuntes de clase' },
  { id: 'chat', label: 'Mensajes' },
  { id: 'rl', label: 'Progreso / Tutor RL' },
];

const APPS_NEXUS = [
  { id: 'mail', label: 'Correo / Misiones' },
  { id: 'chat', label: 'Chat del banco' },
  { id: 'sql', label: 'Terminal SQL' },
  { id: 'academy', label: 'Academia SQL' },
  { id: 'notes', label: 'Notas' },
  { id: 'rl', label: 'Panel RL / Auditoría' },
  { id: 'github', label: 'GitHub / PRs' },
];

export default function Dock({
  scenario = 1,
  activeWindow,
  openWindows = [],
  badges = {},
  onToggle,
}) {
  const apps = scenario === 1 ? APPS_CAMPUS : APPS_NEXUS;

  return (
    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-40">
      <div class="flex items-end gap-2 px-3 py-2 bg-[#121621]/60 backdrop-blur-2xl border border-white/[0.14] ring-1 ring-inset ring-white/[0.06] rounded-[20px] shadow-[0_18px_45px_rgba(0,0,0,0.68)]">
        {apps.map((app) => {
          const isActive = activeWindow === app.id;
          const isOpen = openWindows.includes(app.id);
          const badge = badges[app.id] || 0;

          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onToggle(app.id)}
              class="group relative flex flex-col items-center gap-1 px-1 pt-0.5 pb-1 rounded-2xl focus:outline-none"
              aria-label={app.label}
            >
              {/* Tooltip flotante estilo macOS */}
              <span class="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#161a26]/95 backdrop-blur-xl text-white/95 text-[11.5px] font-medium tracking-[-0.01em] border border-white/[0.14] shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 whitespace-nowrap">
                {app.label}
                <span class="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 bg-[#161a26] border-r border-b border-white/[0.14]" />
              </span>

              {/* Icono squircle con elevación suave */}
              <div
                class={`dock-icon-wrap relative ${
                  isActive
                    ? 'scale-110 -translate-y-1.5'
                    : 'group-hover:scale-115 group-hover:-translate-y-2 group-active:scale-95'
                }`}
              >
                <MacIcon id={app.id} />

                {/* Badge rojo estilo macOS */}
                {badge > 0 && (
                  <span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff3b30] text-white text-[10px] font-semibold leading-none flex items-center justify-center ring-2 ring-[#121621] shadow-md">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>

              {/* Punto indicador de app abierta */}
              <span
                class={`w-1 h-1 rounded-full transition-opacity ${
                  isOpen
                    ? isActive
                      ? 'bg-white opacity-100 shadow-[0_0_6px_rgba(255,255,255,0.8)]'
                      : 'bg-white/55 opacity-100'
                    : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
