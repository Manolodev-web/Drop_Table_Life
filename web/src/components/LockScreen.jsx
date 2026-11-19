import { useState, useEffect } from 'preact/hooks';

export default function LockScreen({ scenario = 1, onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const isCampus = scenario === 1;
  const validPass = isCampus ? 'SELECTme' : 'nexus';

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  const hora = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const fecha = now.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password === validPass || password === '') {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  return (
    <div
      class="absolute inset-0 z-50 flex flex-col items-center justify-between py-14 px-6 select-none overflow-hidden"
      style={{
        background: isCampus
          ? 'radial-gradient(circle at 26% 22%, rgba(56,189,248,0.22), transparent 52%), radial-gradient(circle at 78% 76%, rgba(245,158,11,0.16), transparent 52%), radial-gradient(circle at 50% 50%, rgba(99,102,241,0.14), transparent 60%), linear-gradient(145deg, #070a12 0%, #10192d 50%, #171326 100%)'
          : 'radial-gradient(circle at 22% 20%, rgba(16,185,129,0.2), transparent 52%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.16), transparent 55%), linear-gradient(145deg, #030712 0%, #0b1320 100%)',
      }}
    >
      <div class="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />

      {/* Reloj superior estilo macOS Sonoma/Sequoia */}
      <div class="relative z-10 text-center mt-2">
        <p class="text-sm font-medium text-white/75 capitalize tracking-wide drop-shadow">
          {fecha}
        </p>
        <p class="text-[76px] leading-none font-extralight text-white/95 tracking-tight tabular-nums drop-shadow-[0_6px_24px_rgba(0,0,0,0.45)] mt-1">
          {hora}
        </p>
      </div>

      {/* Tarjeta de inicio de sesión estilo macOS */}
      <div
        class={`relative z-10 flex flex-col items-center gap-4 w-full max-w-[300px] ${
          error ? 'shake' : ''
        }`}
      >
        <div
          class={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold text-white border border-white/25 ring-4 ring-white/[0.06] shadow-2xl ${
            isCampus
              ? 'bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700'
              : 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800'
          }`}
        >
          {isCampus ? 'CO' : 'BN'}
        </div>

        <div class="text-center">
          <h1 class="text-lg font-semibold text-white tracking-[-0.01em] drop-shadow">
            {isCampus ? 'CampusOS' : 'Banco Nexus OS'}
          </h1>
          <p class="text-white/60 text-xs mt-0.5">
            {isCampus
              ? 'Estudiante · Aula 204'
              : 'Estación Corporativa · Entrenamiento SQL & RL'}
          </p>
        </div>

        <form onSubmit={handleUnlock} class="w-full flex flex-col items-center gap-2.5 mt-1">
          <div class="relative w-full">
            <input
              type="password"
              placeholder={isCampus ? 'Clave (SELECTme o vacío)' : 'Contraseña (nexus o vacío)'}
              value={password}
              onInput={(e) => setPassword(e.target.value)}
              class="w-full pl-4 pr-10 py-2 rounded-full bg-white/[0.12] hover:bg-white/[0.15] focus:bg-white/[0.18] backdrop-blur-xl border border-white/20 text-white placeholder-white/45 focus:outline-none focus:border-white/40 transition-all text-center text-[13px] shadow-lg"
              autoFocus
            />
            <button
              type="submit"
              class="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors"
              title={isCampus ? 'Iniciar sesión' : 'Entrar al Sistema'}
              aria-label="Desbloquear"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          {error && (
            <p class="text-red-300 text-xs font-medium bg-red-950/50 border border-red-400/30 px-3 py-1 rounded-full">
              Credenciales incorrectas
            </p>
          )}
        </form>
      </div>

      {/* Pista discreta en la base */}
      <p class="relative z-10 text-[11px] text-white/50 text-center max-w-xs">
        {isCampus
          ? 'Pista: revisa la taza de café o tu cuaderno (o deja vacío y presiona Enter).'
          : 'Pista: revisa la base de la taza (o deja vacío y presiona Enter).'}
      </p>
    </div>
  );
}
