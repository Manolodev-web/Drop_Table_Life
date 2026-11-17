# Contratos entre módulos

Lo que un agente produce y otro consume. **Cambiar un formato requiere avisar al orquestador.**

## 1. `web/data.js` (lo escribe RL-Núcleo, lo leen Interfaz y Contenido)

Archivo generado por `python rl/train.py`. Define `window.DATA` con:

| Campo | Tipo | Significado |
|---|---|---|
| `mision` | objeto | `id`, `titulo`, `remitente`, `correo`, `consulta_esperada` |
| `piezas` | string[9] | Nombres de las 8 piezas de consulta + `EJECUTAR` |
| `sql` | (string\|null)[256] | SQL que corresponde a cada estado (máscara de bits) |
| `rexec` | number[256] | Recompensa terminal al ejecutar en ese estado |
| `exacto` | boolean[256] | Si ejecutar en ese estado resuelve la misión |
| `params` | objeto | Hiperparámetros: `episodios`, `alpha`, `gamma`, `eps0`, `eps_min`, `decay`, `semillas`, `bloque` |
| `curvas` | objeto | `qlearning` y `sarsa`, cada uno con `exito[]` y `retorno[]` por bloque de episodios |
| `baseline` | number | Éxito del agente aleatorio (0 a 1) |
| `qtables` | objeto | Tabla Q (aplanada, 256 x 9) de la semilla 0, por algoritmo |
| `politica` | objeto | Acciones de la política greedy y si resuelve la misión |

**Estado:** máscara de 8 bits (bit i = pieza i elegida). **Acciones:** 0 a 7 piezas, 8 = ejecutar.

> Pendiente (fase 1): al soportar varias misiones, `data.js` pasará a contener un arreglo `misiones[]` con esta misma estructura por cada una. RL-Núcleo y Misiones lo acuerdan con el orquestador antes de cambiarlo.

## 2. `missions/missions.json` (lo escribe Misiones, lo lee RL-Núcleo e Interfaz)

```json
{
  "id": "m1_saldos_negativos",
  "acto": 2,
  "tema": "JOIN + WHERE + ORDER BY",
  "dificultad": 2,
  "remitente": "Dirección de Riesgos",
  "titulo": "Saldos en rojo en La Paz",
  "correo": "texto del correo del jefe",
  "consulta_esperada": "SELECT ...",
  "piezas_permitidas": ["FROM clientes", "JOIN sucursales"],
  "logro": { "id": "primer_join", "nombre": "Primer JOIN" }
}
```

## 3. Eventos del navegador (entre Escena 3D, Interfaz y FX)

Se emiten con `window.dispatchEvent(new CustomEvent(nombre, { detail }))`.

| Evento | Lo emite | Lo escucha | `detail` |
|---|---|---|---|
| `nexus:monitor-click` | Escena 3D | Interfaz | — |
| `nexus:os-ready` | Interfaz | Escena 3D, FX | — |
| `nexus:mision-iniciada` | Interfaz | FX | `{ id }` |
| `nexus:mision-resuelta` | Interfaz | FX | `{ id, puntos, pasos }` |
| `nexus:logro` | Interfaz | FX | `{ id, nombre }` |

## 4. API de FX (la escribe Audio/FX, la usa Interfaz)

- `fx.play(nombre)` reproduce un sonido (`"tecla"`, `"notificacion"`, `"error"`, `"exito"`).
- `fx.animar(nombre, elemento)` aplica una animación (`"sello"`, `"logro"`, `"shake"`).
- `fx.volumen(0..1)` y `fx.silenciar(bool)`.
