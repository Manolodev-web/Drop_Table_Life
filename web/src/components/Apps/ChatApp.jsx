import { useState, useEffect, useRef } from 'preact/hooks';
import { STORY, getActo, getActoActual, setActoActual } from '../story';

const EXTRAS_POR_ACTO = {
  1: { autor: 'Prof. Ramírez', rol: 'profesor', texto: 'Recuerden: WHERE filtra antes de agrupar. ¡A practicar!', hace: 'ahora' },
  2: { autor: 'Auditoría', rol: 'jefe', texto: 'El reporte debe estar en menos de 2 minutos.', hace: 'ahora' },
  3: { autor: 'SRE Bot', rol: 'bot', texto: 'Incidente resuelto parcialmente, monitoreando latencia.', hace: 'ahora' },
};

const ROLES = {
  profesor: 'bg-blue-500/20 text-blue-300',
  jefe: 'bg-red-500/20 text-red-300',
  colega: 'bg-emerald-500/20 text-emerald-300',
  alumno: 'bg-amber-500/20 text-amber-300',
  bot: 'bg-purple-500/20 text-purple-300',
  yo: 'bg-slate-500/30 text-slate-200',
};

export default function ChatApp() {
  const [actoNum, setActoNum] = useState(getActoActual());
  const [mensajes, setMensajes] = useState(() => getActo(getActoActual()).mensajes || []);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  // Sincronizar con el acto global
  useEffect(() => {
    const onActo = (e) => setActoNum(e.detail.numero);
    window.addEventListener('nexus:acto-cambio', onActo);
    return () => window.removeEventListener('nexus:acto-cambio', onActo);
  }, []);

  // Cargar mensajes al cambiar de acto
  useEffect(() => {
    setMensajes(getActo(actoNum).mensajes || []);
  }, [actoNum]);

  // Autoscroll al fondo
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes]);

  // Mensaje entrante simulado (toast + badge global)
  useEffect(() => {
    const timer = setTimeout(() => {
      const extra = EXTRAS_POR_ACTO[actoNum];
      if (!extra) return;
      setMensajes((prev) => [...prev, extra]);
      window.dispatchEvent(new CustomEvent('nexus:chat-nuevo'));
      window.dispatchEvent(new CustomEvent('nexus:toast', {
        detail: { texto: `💬 ${extra.autor}: ${extra.texto.slice(0, 60)}…`, tipo: 'info' },
      }));
    }, 6000);
    return () => clearTimeout(timer);
  }, [actoNum]);

  const enviar = (e) => {
    e.preventDefault();
    const texto = input.trim();
    if (!texto) return;
    setMensajes((prev) => [...prev, { autor: 'Tú', rol: 'yo', texto, hace: 'ahora' }]);
    setInput('');
    window.fx?.play?.('tecla');
    setTimeout(() => {
      setMensajes((prev) => [
        ...prev,
        { autor: 'Bot Nexus', rol: 'bot', texto: 'Recibido. Sigue con la misión activa 👀', hace: 'ahora' },
      ]);
    }, 1400);
  };

  const canal = '#' + getActo(actoNum).canal;

  return (
    <div class="h-full flex">
      {/* Sidebar de canales */}
      <div class="w-40 bg-slate-950/50 border-r border-white/10 p-2 flex flex-col gap-1 text-sm shrink-0">
        <div class="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Canales</div>
        {STORY.actos.map((a) => (
          <button
            key={a.numero}
            onClick={() => setActoActual(a.numero)}
            class={`text-left px-2 py-1.5 rounded text-slate-300 hover:bg-white/5 transition-colors ${
              actoNum === a.numero ? 'bg-white/10 text-white font-medium' : ''
            }`}
          >
            <span class="text-slate-500">#</span> {a.canal}
            <span class="block text-[10px] text-slate-500 mt-0.5">Acto {a.numero} · {a.nombre}</span>
          </button>
        ))}
        <div class="mt-auto px-2 py-1 text-[10px] text-slate-600">Conectado como tú</div>
      </div>

      {/* Chat */}
      <div class="flex-1 flex flex-col min-w-0">
        <div class="h-9 px-3 flex items-center border-b border-white/10 text-sm text-slate-300 font-medium shrink-0">
          <span class="text-slate-500 mr-1">#</span>{canal.replace('#', '')}
        </div>
        <div ref={scrollRef} class="flex-1 overflow-y-auto p-3 space-y-3">
          {mensajes.map((m, i) => (
            <div key={i} class="flex gap-2">
              <div class={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${ROLES[m.rol] || ROLES.colega}`}>
                {(m.autor || '?').slice(0, 1).toUpperCase()}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline gap-2">
                  <span class="text-xs font-semibold text-slate-200">{m.autor}</span>
                  <span class="text-[10px] text-slate-500">{m.hace}</span>
                </div>
                <div class="text-sm text-slate-300 leading-snug break-words">{m.texto}</div>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={enviar} class="p-2 border-t border-white/10 flex gap-2 shrink-0">
          <input
            value={input}
            onInput={(e) => setInput(e.currentTarget.value)}
            placeholder={`Mensaje a ${canal}`}
            class="flex-1 px-3 py-1.5 rounded-md bg-slate-950/60 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
          <button type="submit" class="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}