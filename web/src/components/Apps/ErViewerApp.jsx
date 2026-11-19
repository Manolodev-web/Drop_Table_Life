import { useState, useEffect } from 'preact/hooks';
import nivel1Variantes from '../../../../content/nivel1_variantes.json';

function getInitialBd() {
  if (typeof window !== 'undefined' && window.__campusOsActiveBd?.esquema_er) {
    return window.__campusOsActiveBd;
  }
  const primera = nivel1Variantes.bases_datos[0];
  return {
    bdId: primera.id,
    nombre: primera.nombre,
    descripcion: primera.descripcion,
    esquema_er: primera.esquema_er,
  };
}

export default function ErViewerApp() {
  const [bdActiva, setBdActiva] = useState(getInitialBd);
  const { tablas, relaciones } = bdActiva.esquema_er;
  const [selected, setSelected] = useState(() => tablas[0]?.nombre || '');

  useEffect(() => {
    const onBdCambio = (e) => {
      const detail = e?.detail;
      if (!detail?.esquema_er?.tablas?.length) return;
      setBdActiva({
        bdId: detail.bdId || 'desconocida',
        nombre: detail.nombre || detail.bdId || 'Base de Datos',
        descripcion: detail.descripcion || '',
        esquema_er: detail.esquema_er,
      });
      setSelected(detail.esquema_er.tablas[0].nombre);
    };

    window.addEventListener('nexus:bd-cambio', onBdCambio);
    // Sincronizar por si AcademyApp emitió antes de montar este listener
    if (window.__campusOsActiveBd?.esquema_er?.tablas?.length) {
      const cur = window.__campusOsActiveBd;
      setBdActiva((prev) => (prev.bdId === cur.bdId ? prev : cur));
    }
    return () => window.removeEventListener('nexus:bd-cambio', onBdCambio);
  }, []);

  const tablaActual = tablas.find((t) => t.nombre === selected) || tablas[0];
  const relacionesActivas = relaciones.filter((r) => r.includes(`${tablaActual?.nombre}.`));

  return (
    <div class="flex flex-col h-full gap-3 text-slate-200">
      <div class="flex items-center justify-between border-b border-white/10 pb-2 gap-2">
        <div>
          <h2 class="text-sm font-semibold text-white">
            Visor E-R — {bdActiva.nombre}
          </h2>
          <p class="text-xs text-slate-400">
            Haz clic en una tabla para inspeccionar sus atributos, PK y FK.
          </p>
        </div>
        <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[11px] font-mono shrink-0">
          {tablas.length} tablas
        </span>
      </div>

      {/* Mapa de tablas */}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tablas.map((t) => {
          const isSel = t.nombre === tablaActual?.nombre;
          const isRel =
            !isSel &&
            relacionesActivas.some((r) => r.includes(`${t.nombre}.`));
          return (
            <button
              key={t.nombre}
              onClick={() => {
                window.fx?.play?.('tecla');
                setSelected(t.nombre);
              }}
              class={`text-left p-2.5 rounded-lg border transition-all ${
                isSel
                  ? 'bg-blue-600/25 border-blue-400 shadow-lg shadow-blue-900/20'
                  : isRel
                  ? 'bg-emerald-500/10 border-emerald-400/50'
                  : 'bg-slate-800/60 border-white/10 hover:border-white/25'
              }`}
            >
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs font-bold text-white">{t.nombre}</span>
                {isRel && (
                  <span class="text-[10px] text-emerald-300 font-medium">conectada</span>
                )}
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{t.descripcion}</p>
            </button>
          );
        })}
      </div>

      {/* Detalle de la tabla seleccionada */}
      {tablaActual && (
        <div class="flex-1 overflow-auto rounded-lg bg-slate-950/60 border border-white/10 p-3">
          <div class="flex items-center justify-between mb-2 gap-2">
            <span class="font-mono text-sm font-bold text-blue-300">
              Tabla: {tablaActual.nombre}
            </span>
            <span class="text-xs text-slate-400">{tablaActual.descripcion}</span>
          </div>

          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="text-left text-slate-400 border-b border-white/10">
                <th class="py-1.5 pr-2">Atributo</th>
                <th class="py-1.5 pr-2">Tipo</th>
                <th class="py-1.5">Llave / Relación</th>
              </tr>
            </thead>
            <tbody>
              {tablaActual.columnas.map((col) => (
                <tr key={col.nombre} class="border-b border-white/5">
                  <td class="py-1.5 pr-2 font-mono text-slate-100">{col.nombre}</td>
                  <td class="py-1.5 pr-2 font-mono text-slate-400">{col.tipo}</td>
                  <td class="py-1.5">
                    {col.pk && (
                      <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] mr-1">
                        PK
                      </span>
                    )}
                    {col.fk && (
                      <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                        FK → {col.fk}
                      </span>
                    )}
                    {!col.pk && !col.fk && <span class="text-slate-500">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div class="mt-3 pt-2 border-t border-white/10">
            <p class="text-[11px] font-semibold text-slate-300 mb-1">Relaciones en el esquema:</p>
            <ul class="text-[11px] font-mono text-slate-400 space-y-0.5">
              {relaciones.map((r) => (
                <li
                  key={r}
                  class={r.includes(`${tablaActual.nombre}.`) ? 'text-emerald-300 font-semibold' : ''}
                >
                  • {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
