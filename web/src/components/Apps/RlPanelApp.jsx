export default function RlPanelApp() {
  return (
    <div class="p-6 h-full flex flex-col">
      <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        📊 Panel de Auditoría RL
      </h2>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div class="p-4 bg-nexus-panel border border-nexus-border rounded-lg">
          <div class="text-xs text-nexus-muted mb-1">Algoritmo Activo</div>
          <div class="text-xl font-mono text-nexus-accent">Q-Learning</div>
        </div>
        <div class="p-4 bg-nexus-panel border border-nexus-border rounded-lg">
          <div class="text-xs text-nexus-muted mb-1">Éxito Reciente (Últimos 100)</div>
          <div class="text-xl font-mono text-green-400">87.5%</div>
        </div>
      </div>

      <div class="flex-1 bg-nexus-panel border border-nexus-border rounded-lg p-4 flex items-center justify-center relative overflow-hidden">
        <div class="absolute inset-0 flex items-center justify-center text-nexus-muted/30 text-6xl font-bold select-none">
          GRÁFICA
        </div>
        <p class="relative z-10 text-sm text-nexus-muted text-center max-w-xs">
          Visualización en vivo de la tabla Q y curvas de aprendizaje desde <code class="text-nexus-accent">web/data.js</code> y <code class="text-nexus-accent">web/rl.js</code>.
        </p>
      </div>
    </div>
  );
}