import { useEffect } from 'preact/hooks';

// Mock data basado en CONTRATOS.md
const MOCK_MISSION = {
  id: "m1_saldos_negativos",
  remitente: "Dirección de Riesgos",
  titulo: "Saldos en rojo en La Paz",
  correo: "Necesitamos un reporte urgente de todos los clientes con saldo negativo en la sucursal de La Paz, ordenados de menor a mayor saldo. Usa JOIN con la tabla de sucursales.",
  consulta_esperada: "SELECT c.nombre, c.saldo FROM clientes c JOIN sucursales s ON c.sucursal_id = s.id WHERE c.saldo < 0 AND s.ciudad = 'La Paz' ORDER BY c.saldo ASC",
  sla_segundos: 120
};

export default function MailApp() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nexus:mision-iniciada', { detail: { id: MOCK_MISSION.id } }));
  }, []);

  const handleResolver = () => {
    // Simulación de resolución exitosa
    window.dispatchEvent(new CustomEvent('nexus:mision-resuelta', { detail: { id: MOCK_MISSION.id, puntos: 100, pasos: 3 } }));
    window.dispatchEvent(new CustomEvent('nexus:logro', { detail: { id: 'primer_join', nombre: 'Primer JOIN' } }));
  };

  return (
    <div class="p-4 h-full flex flex-col">
      <div class="flex items-center gap-3 mb-4 pb-4 border-b border-nexus-border">
        <div class="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">DR</div>
        <div>
          <h3 class="font-semibold text-white">{MOCK_MISSION.titulo}</h3>
          <p class="text-xs text-nexus-muted">De: {MOCK_MISSION.remitente} • Hace 5 min</p>
        </div>
        <span class="ml-auto text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-mono">
          SLA: {MOCK_MISSION.sla_segundos}s
        </span>
      </div>
      
      <div class="flex-1 bg-nexus-panel rounded-lg p-4 text-sm text-nexus-text leading-relaxed border border-nexus-border">
        {MOCK_MISSION.correo}
        <div class="mt-4 p-3 bg-black/30 rounded border border-nexus-border font-mono text-xs text-nexus-accent">
          Objetivo: {MOCK_MISSION.consulta_esperada}
        </div>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button class="px-4 py-2 rounded bg-nexus-border hover:bg-nexus-border/80 text-sm transition-colors">Archivar</button>
        <button onClick={handleResolver} class="px-4 py-2 rounded bg-nexus-accent hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
          Marcar como Resuelta (Demo)
        </button>
      </div>
    </div>
  );
}