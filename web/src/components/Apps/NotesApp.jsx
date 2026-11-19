import { useState, useEffect } from 'preact/hooks';
import { STORY, getActo, getActoActual } from '../story';
import nivel1 from '../../../../content/nivel1.json';

const NOTAS_POR_ACTO = {
  1: {
    titulo: 'Apuntes · Curso de SQL',
    items: [
      { t: 'SELECT', d: 'Elige columnas. Puedes usar funciones de agregación (COUNT, SUM, AVG).' },
      { t: 'WHERE', d: 'Filtra filas ANTES de agrupar. Se combina con AND / OR.' },
      { t: 'ORDER BY', d: 'Ordena el resultado. ASC por defecto, DESC para invertir.' },
      { t: 'LIMIT', d: 'Trae solo las primeras N filas (útil para "top N").' },
      { t: 'JOIN', d: 'Combina dos tablas por una clave (cliente.sucursal_id = sucursal.id).' },
    ],
    tips: [
      'Orden lógico: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.',
      'Pon ; al final para ejecutar la consulta.',
    ],
  },
  2: {
    titulo: 'Reglas del pasante',
    items: [
      { t: '1. Nunca DELETE sin WHERE', d: 'Podrías borrar toda la tabla. Revisa el WHERE antes de ejecutar.' },
      { t: '2. Datos sucios', d: 'Los campos pueden ser NULL o duplicados. Prueba con IS NULL.' },
      { t: '3. JOIN con ciudad', d: 'Para filtrar por ciudad de una sucursal debes hacer JOIN con `sucursales`.' },
      { t: '4. SLA', d: 'Las misiones tienen límite de tiempo. Prioriza lo urgente del correo.' },
      { t: '5. Respalda', d: 'Antes de tocar producción, verifica permisos y respaldos.' },
    ],
    tips: [
      'Usa LIMIT para "ver antes de ejecutar".',
      'Abre el esquema desde el menú para revisar columnas.',
    ],
  },
  3: {
    titulo: 'Guardia nocturna · Checklist',
    items: [
      { t: '[ ] Monitorear latencia', d: 'Consulta las vistas del panel RL / Auditoría.' },
      { t: '[ ] Revisar PRs pendientes', d: 'Abre GitHub y audita el PR #42 (¿tiene WHERE?).' },
      { t: '[ ] Snapshot de BD', d: 'Verifica el último respaldo (pg_dump) del turno.' },
      { t: '[ ] Cerrar incidentes', d: 'Marca como resueltos los tickets del correo y chat.' },
      { t: '[ ] Bitácora', d: 'Anota en #incidentes cualquier bloqueo o query lenta.' },
    ],
    tips: [
      'Un DELETE/UPDATE sin WHERE es un incidente crítico.',
      'Confirma con SRE antes de aprobar migraciones peligrosas.',
    ],
  },
};

export default function NotesApp({ scenario = 1 }) {
  const [pdfIdx, setPdfIdx] = useState(0);
  const [acto, setActo] = useState(getActoActual());

  useEffect(() => {
    const onActo = (e) => setActo(e.detail.numero);
    window.addEventListener('nexus:acto-cambio', onActo);
    return () => window.removeEventListener('nexus:acto-cambio', onActo);
  }, []);

  if (scenario === 1) {
    const pdf = nivel1.apuntes[pdfIdx] || nivel1.apuntes[0];
    return (
      <div class="flex flex-col h-full gap-3 text-slate-200 text-xs">
        <div class="flex items-center justify-between border-b border-white/10 pb-2">
          <div>
            <h2 class="text-sm font-semibold text-white">📒 Apuntes de clase (PDF)</h2>
            <p class="text-[11px] text-slate-400">Material de estudio rápido para el parcial</p>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('nexus:open-app', { detail: { appId: 'academy' } }))}
            class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            Volver a practicar →
          </button>
        </div>

        <div class="flex gap-1.5 flex-wrap">
          {nivel1.apuntes.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setPdfIdx(i)}
              class={`px-2.5 py-1 rounded-md font-medium ${
                i === pdfIdx ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              PDF {i + 1}
            </button>
          ))}
        </div>

        <div class="flex-1 overflow-auto rounded-lg bg-slate-950/60 border border-white/10 p-3 space-y-2.5">
          {pdf.nota_clave && (
            <div class="p-2 rounded bg-amber-500/15 border border-amber-400/40 font-mono text-amber-200 text-[11px]">
              📌 {pdf.nota_clave}
            </div>
          )}
          <h3 class="text-sm font-semibold text-white">{pdf.titulo}</h3>
          <p class="text-slate-200 leading-relaxed">{pdf.resumen}</p>
          <ul class="space-y-1 text-slate-300">
            {pdf.puntos.map((p, idx) => (
              <li key={idx}>• {p}</li>
            ))}
          </ul>
          <pre class="p-2 rounded bg-black/50 text-emerald-300 font-mono text-[11px] overflow-x-auto">
            {pdf.ejemplo}
          </pre>
          <div class="p-2 rounded bg-blue-500/10 border border-blue-400/30 text-blue-200">
            <strong>Regla para recordar:</strong> {pdf.regla}
          </div>
        </div>
      </div>
    );
  }

  const notas = NOTAS_POR_ACTO[acto] || NOTAS_POR_ACTO[2];
  const esquema = STORY.esquema;

  return (
    <div class="h-full flex">
      {/* Sidebar de esquema */}
      <div class="w-56 bg-slate-950/50 border-r border-white/10 p-3 overflow-y-auto shrink-0">
        <div class="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Esquema SQL</div>
        <div class="space-y-2">
          {esquema.tablas.map((t) => (
            <div key={t.nombre} class="rounded-md bg-slate-900/60 border border-white/5 p-2">
              <div class="font-mono text-xs text-emerald-300">{t.nombre}</div>
              <ul class="mt-1 space-y-0.5">
                {t.columnas.map((c, i) => (
                  <li key={i} class="text-[10px] text-slate-400 font-mono break-words">{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Notas del acto */}
      <div class="flex-1 p-4 overflow-y-auto min-w-0">
        <h3 class="text-sm font-semibold text-white mb-1">{notas.titulo}</h3>
        <p class="text-[11px] text-slate-500 mb-3">Acto {acto} · {getActo(acto).nombre}</p>
        <div class="space-y-2">
          {notas.items.map((it, i) => (
            <div key={i} class="rounded-md bg-slate-900/60 border border-white/5 p-2.5">
              <div class="text-xs font-mono text-amber-300">{it.t}</div>
              <div class="text-xs text-slate-300 mt-1 leading-snug">{it.d}</div>
            </div>
          ))}
        </div>
        {notas.tips?.length > 0 && (
          <div class="mt-4 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
            <div class="text-[10px] uppercase tracking-wider text-blue-300 font-semibold mb-1">Tips</div>
            <ul class="space-y-1">
              {notas.tips.map((tip, i) => (
                <li key={i} class="text-xs text-blue-200/80">• {tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}