# Registro de Decisiones · Banco Nexus (`DROP TABLE Life;`)

> Una línea por decisión. Cualquier IA nueva debe leer este archivo antes de proponer cambios de arquitectura.

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-17 | **Despliegue 100% estático en Vercel (plan gratuito / Hobby).** | Vercel Free no soporta servidores WebSocket persistentes ni paquetes Python + PyTorch en serverless. Todo el juego corre en el navegador. |
| 2026-11-17 | **Stack Frontend: Vite + Preact + Three.js clásico + Tailwind CSS.** | Mucho más liviano y rápido de compilar que Next.js + React Three Fiber; evita problemas de SSR/hidratación con WebGL y WASM. |
| 2026-11-17 | **Motor SQL en navegador: `sql.js` (SQLite WASM) en `public/`.** | Pesa ~1 MB y arranca al instante (vs. PGlite que es mucho más pesado). Cubre `SELECT`, `JOIN`, `GROUP BY`, subconsultas, llaves foráneas, índices y triggers básicos. |
| 2026-11-17 | **Motor RL: entrenamiento offline en Python (`rl/`) + ejecución/visualización en vivo en JS (`web/rl.js`).** | `rl/train.py` entrena Q-learning y SARSA (con opción de envolver `env.py` en `gymnasium.Env`) y exporta `web/data.js`. El navegador no depende de un backend Python. |
| 2026-11-17 | **Tutor Adaptativo (Módulo 1): Bandit ligero en JS.** | Evalúa en qué cláusulas SQL falla más el estudiante (`WHERE`, `JOIN`, `GROUP BY`, etc.) y selecciona el siguiente ejercicio localmente sin servidor. |
| 2026-11-17 | **Concurrencia/Deadlocks (Módulo 3): simulación lógica en JS.** | `sql.js` es monohilo en el navegador; los picos de tráfico, latencia y bloqueos se simulan en el estado del juego para mantener determinismo para el RL y fluidez en web. |
| 2026-11-17 | **Referencia visual `halloween.dev` y pedagógica `aprendesql.dev`.** | Escena 3D minimalista (≤ 5 MB) como puerta de entrada al SO 2D; lecciones SQL cortas, progresivas y ejecutables al instante en el navegador. |
