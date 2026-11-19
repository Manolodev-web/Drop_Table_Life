import { useState } from 'preact/hooks';
import { STORY } from '../story';

export default function GitHubApp() {
  const pr = STORY.pr_acto3;
  const [decision, setDecision] = useState(null); // null | 'aprobado' | 'rechazado'
  const [comentario, setComentario] = useState('');

  const aprobar = () => {
    setDecision('aprobado');
    window.dispatchEvent(new CustomEvent('nexus:toast', {
      detail: { texto: '¡Peligro! Aprobaste un DELETE sin WHERE.', tipo: 'error' },
    }));
    window.fx?.play?.('error');
  };

  const rechazar = () => {
    setDecision('rechazado');
    window.dispatchEvent(new CustomEvent('nexus:toast', {
      detail: { texto: 'PR rechazado correctamente. Bien hecho.', tipo: 'exito' },
    }));
    window.dispatchEvent(new CustomEvent('nexus:mision-resuelta', {
      detail: { id: 'auditoria_pr_42', puntos: 200, pasos: 1 },
    }));
    window.fx?.play?.('exito');
  };

  return (
    <div class="h-full overflow-y-auto p-4">
      <div class="rounded-lg border border-white/10 bg-slate-900/60">
        {/* Cabecera del PR */}
        <div class="p-3 border-b border-white/10">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="font-mono">banco-nexus/core</span>
            <span>/</span>
            <span class="text-slate-300">migrations</span>
          </div>
          <div class="mt-1 flex items-center gap-2">
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">OPEN</span>
            <h3 class="text-sm font-semibold text-white">#{pr.numero} {pr.titulo}</h3>
          </div>
          <div class="mt-1 text-xs text-slate-400">
            <span class="font-mono text-slate-300">{pr.autor}</span> quiere fusionar{' '}
            <span class="font-mono text-blue-300">{pr.rama}</span>
          </div>
        </div>

        {/* Descripción */}
        <div class="p-3 border-b border-white/10 text-xs text-slate-300">
          {pr.descripcion}
        </div>

        {/* Diff */}
        <div class="p-3">
          <div class="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-semibold font-mono">{pr.archivo}</div>
          <div class="rounded-md bg-slate-950/80 border border-white/10 overflow-hidden font-mono text-xs">
            {pr.diff.map((l, i) => (
              <div
                key={i}
                class={`px-3 py-1 flex ${
                  l.tipo === 'add'
                    ? 'bg-emerald-500/10 text-emerald-200'
                    : l.tipo === 'del'
                    ? 'bg-red-500/10 text-red-200'
                    : 'text-slate-400'
                }`}
              >
                <span class="w-4 shrink-0 text-slate-600">
                  {l.tipo === 'add' ? '+' : l.tipo === 'del' ? '-' : ' '}
                </span>
                <span class="whitespace-pre-wrap break-words">{l.texto}</span>
              </div>
            ))}
          </div>
          {pr.peligro && (
            <div class="mt-2 p-2 rounded-md bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              ⚠️ {pr.explicacion}
            </div>
          )}
        </div>

        {/* Acciones */}
        {decision === null ? (
          <div class="p-3 border-t border-white/10 flex items-center gap-2">
            <input
              value={comentario}
              onInput={(e) => setComentario(e.currentTarget.value)}
              placeholder="Comentario (opcional)"
              class="flex-1 px-3 py-1.5 rounded-md bg-slate-950/60 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={rechazar}
              class="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
            >
              Rechazar
            </button>
            <button
              onClick={aprobar}
              class="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
            >
              Aprobar y mergear
            </button>
          </div>
        ) : (
          <div
            class={`p-3 border-t border-white/10 text-sm ${
              decision === 'rechazado' ? 'text-emerald-300' : 'text-red-300'
            }`}
          >
            {decision === 'rechazado'
              ? '✅ Rechazaste el PR. Ningún cliente fue borrado.'
              : '🚨 Aprobaste el PR. El equipo de SRE está restaurando el backup.'}
          </div>
        )}
      </div>
    </div>
  );
}