import { useState, useEffect } from 'preact/hooks';
import nivel1 from '../../../../content/nivel1.json';

function leerProgresoGuardado() {
  try {
    const raw = localStorage.getItem('campusos_tutor_rl_v1');
    if (!raw) return 0;
    return JSON.parse(raw).completados?.length || 0;
  } catch {
    return 0;
  }
}

function leerChatExtras() {
  try {
    const raw = localStorage.getItem('campusos_chat_extras_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PhoneChatApp() {
  const { celular_inicio, celular_cierre } = nivel1;
  const [elegida, setElegida] = useState(null);
  const [cierreElegida, setCierreElegida] = useState(null);
  const [progresoGuardado, setProgresoGuardado] = useState(leerProgresoGuardado);
  const [extras, setExtras] = useState(leerChatExtras);

  useEffect(() => {
    const syncProgreso = () => setProgresoGuardado(leerProgresoGuardado());
    const onCampusChatMsg = () => {
      setExtras(leerChatExtras());
    };
    const onStorage = (e) => {
      if (!e.key || e.key === 'campusos_tutor_rl_v1') syncProgreso();
      if (!e.key || e.key === 'campusos_chat_extras_v1') setExtras(leerChatExtras());
    };
    window.addEventListener('nexus:mision-resuelta', syncProgreso);
    window.addEventListener('nexus:campus-chat-msg', onCampusChatMsg);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('nexus:mision-resuelta', syncProgreso);
      window.removeEventListener('nexus:campus-chat-msg', onCampusChatMsg);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const opcionSeleccionada = celular_inicio.opciones.find((o) => o.id === elegida);
  const cierreSeleccionado = celular_cierre.opciones.find((o) => o.id === cierreElegida);

  const abrirPractica = () => {
    window.fx?.play?.('tecla');
    window.dispatchEvent(new CustomEvent('nexus:open-app', { detail: { appId: 'academy' } }));
  };

  return (
    <div class="flex flex-col h-full gap-3 text-slate-200">
      <div class="flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <h2 class="text-sm font-semibold text-white">📱 {celular_inicio.grupo}</h2>
          <p class="text-[11px] text-slate-400">Aula 204 · {celular_inicio.hora} a. m.</p>
        </div>
        <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px]">
          En línea
        </span>
      </div>

      <div class="flex-1 overflow-auto space-y-2.5 pr-1">
        {celular_inicio.mensajes_iniciales.map((m, i) => (
          <div key={i} class="bg-slate-800/70 border border-white/10 rounded-lg p-2.5">
            <span class="text-xs font-semibold text-blue-300">{m.de}</span>
            <p class="text-xs text-slate-200 mt-0.5">{m.texto}</p>
          </div>
        ))}

        {!elegida ? (
          <div class="pt-1 space-y-1.5">
            <p class="text-[11px] text-slate-400">Elige tu respuesta:</p>
            {celular_inicio.opciones.map((op) => (
              <button
                key={op.id}
                onClick={() => {
                  window.fx?.play?.('tecla');
                  setElegida(op.id);
                }}
                class="w-full text-left px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-400/30 text-xs text-blue-100 transition-colors"
              >
                {op.id}. {op.texto}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div class="ml-8 bg-blue-600/30 border border-blue-400/30 rounded-lg p-2.5">
              <span class="text-xs font-semibold text-blue-200">Tú</span>
              <p class="text-xs text-white mt-0.5">{opcionSeleccionada?.texto}</p>
            </div>
            {opcionSeleccionada?.respuesta.map((r, i) => (
              <div key={i} class="bg-slate-800/70 border border-white/10 rounded-lg p-2.5">
                <span class="text-xs font-semibold text-emerald-300">{r.de}</span>
                <p class="text-xs text-slate-200 mt-0.5">{r.texto}</p>
              </div>
            ))}

            {/* Aviso del docente */}
            <div class="bg-amber-500/15 border border-amber-400/30 rounded-lg p-3 mt-2">
              <span class="text-xs font-semibold text-amber-300">
                🔔 {celular_inicio.aviso_docente.de}
              </span>
              <p class="text-xs text-amber-100 mt-1">{celular_inicio.aviso_docente.texto}</p>
              <button
                onClick={abrirPractica}
                class="mt-2 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors"
              >
                Abrir Práctica SQL →
              </button>
            </div>
          </>
        )}

        {/* Reacciones en vivo entre bloques */}
        {extras.length > 0 && (
          <div class="pt-2 border-t border-white/10 space-y-2">
            {extras.map((msg, i) => {
              const esDocente = String(msg.de || '').toLowerCase().includes('docente');
              return (
                <div
                  key={msg.id || i}
                  class={`rounded-lg p-2.5 border ${
                    esDocente
                      ? 'bg-amber-500/10 border-amber-400/30'
                      : 'bg-slate-800/80 border-sky-400/25'
                  }`}
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class={`text-xs font-semibold ${esDocente ? 'text-amber-300' : 'text-sky-300'}`}>
                      {msg.de}
                    </span>
                    {msg.hora && <span class="text-[10px] text-slate-400">{msg.hora}</span>}
                  </div>
                  <p class="text-xs text-slate-200 mt-0.5">{msg.texto}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Seguimiento al terminar los 5 bloques */}
        {progresoGuardado >= 5 && (
          <div class="mt-3 pt-3 border-t border-white/10 space-y-2">
            <div class="bg-slate-800/70 border border-emerald-500/30 rounded-lg p-2.5">
              <span class="text-xs font-semibold text-emerald-300">{celular_cierre.de}</span>
              <p class="text-xs text-slate-200 mt-0.5">{celular_cierre.pregunta}</p>
            </div>
            {!cierreElegida ? (
              <div class="space-y-1.5">
                {celular_cierre.opciones.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setCierreElegida(op.id)}
                    class="w-full text-left px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-400/30 text-xs text-emerald-100"
                  >
                    {op.texto}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div class="ml-8 bg-blue-600/30 border border-blue-400/30 rounded-lg p-2.5">
                  <span class="text-xs font-semibold text-blue-200">Tú</span>
                  <p class="text-xs text-white mt-0.5">{cierreSeleccionado?.texto}</p>
                </div>
                {cierreSeleccionado?.respuestas.map((r, i) => (
                  <div key={i} class="bg-slate-800/70 border border-white/10 rounded-lg p-2.5">
                    <span class="text-xs font-semibold text-emerald-300">{r.de}</span>
                    <p class="text-xs text-slate-200 mt-0.5">{r.texto}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
