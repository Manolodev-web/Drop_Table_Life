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

> **Estado Fase 1 (Multimisión):** `web/data.js` mantiene compatibilidad o migra a un arreglo `misiones[]` con esta misma estructura por cada misión marcada como `"tipo": "rl"`.

```json
// Estructura de web/data.js en Fase 1
window.DATA = {
  "version": 1,
  "misiones": [
    {
      "mision": { "id": "...", "titulo": "...", "remitente": "...", "correo": "...", "consulta_esperada": "..." },
      "piezas": ["...8 piezas...", "EJECUTAR"],
      "sql": ["...256 entradas..."],
      "rexec": ["...256 números..."],
      "exacto": ["...256 booleanos..."],
      "params": { "episodios": 4000, "alpha": 0.2, "gamma": 0.95, "eps0": 1.0, "eps_min": 0.05, "decay": 0.9985, "semillas": 20, "bloque": 100 },
      "curvas": { "qlearning": { "exito": [], "retorno": [] }, "sarsa": { "exito": [], "retorno": [] } },
      "baseline": 0.05,
      "qtables": { "qlearning": [], "sarsa": [] },
      "politica": { "qlearning": { "acciones": [], "exito": true }, "sarsa": { "acciones": [], "exito": true } }
    }
  ]
};
```

## 2. `missions/missions.json` (lo escribe Misiones, lo lee RL-Núcleo e Interfaz)

```json
{
  "version": 1,
  "esquema_sql": "missions/schema.sql",
  "misiones": [
    {
      "id": "m1_saldos_negativos",
      "acto": 2,
      "tipo": "rl",
      "tema": "JOIN + WHERE + ORDER BY",
      "clausula_tag": "join",
      "dificultad": 2,
      "sla_segundos": 120,
      "remitente": "Dirección de Riesgos",
      "titulo": "Saldos en rojo en La Paz",
      "correo": "Texto del correo del jefe...",
      "consulta_esperada": "SELECT c.nombre, c.saldo FROM clientes c JOIN sucursales s ON c.sucursal_id = s.id WHERE c.saldo < 0 AND s.ciudad = 'La Paz' ORDER BY c.saldo ASC",
      "piezas_permitidas": [
        "FROM clientes",
        "JOIN sucursales",
        "SELECT nombre",
        "SELECT saldo",
        "WHERE saldo < 0",
        "WHERE ciudad = 'La Paz'",
        "ORDER BY saldo ASC",
        "ORDER BY saldo DESC"
      ],
      "logro": { "id": "primer_join", "nombre": "Primer JOIN" }
    }
  ]
}
```

- `tipo`: `"rl"` (resuelta también por el agente RL en `rl/`) o `"solo_jugador"` (misiones avanzadas del Acto 3, ej. auditoría de PRs o triggers).
- `piezas_permitidas`: exactamente **8 strings** cuando `tipo == "rl"` (para mantener el espacio de 256 estados en el MDP tabular).

## 3. `content/lessons.json` (lo escribe Contenido, lo lee Interfaz y el Tutor Adaptativo)

```json
{
  "version": 1,
  "bloques": [
    {
      "id": "b1_fundamentos",
      "titulo": "Fundamentos de SELECT",
      "orden": 1,
      "lecciones": [
        {
          "id": "l1_select_where",
          "titulo": "Filtrar clientes con WHERE",
          "clausula_tag": "where",
          "dificultad": 1,
          "teoria_md": "Explicación breve en Markdown...",
          "ejemplo_sql": "SELECT nombre, saldo FROM clientes WHERE saldo < 0;",
          "ejercicio": {
            "enunciado": "Lista nombre y saldo de clientes con saldo mayor a 3000.",
            "consulta_esperada": "SELECT nombre, saldo FROM clientes WHERE saldo > 3000",
            "pista": "Usa el operador > dentro de WHERE."
          },
          "quiz": {
            "pregunta": "¿Qué cláusula filtra filas antes de ordenar?",
            "opciones": ["ORDER BY", "WHERE", "GROUP BY", "SELECT"],
            "correcta": 1
          }
        }
      ]
    }
  ]
}
```

- `clausula_tag`: valores recomendados `"select"`, `"where"`, `"order_by"`, `"join"`, `"group_by"`, `"subquery"`, `"ddl_index"`. El Tutor Adaptativo (Módulo 1) usa este campo para elegir la siguiente lección/ejercicio.

## 4. Eventos del navegador (entre Escena 3D, Interfaz y FX)

Se emiten con `window.dispatchEvent(new CustomEvent(nombre, { detail }))`.

| Evento | Lo emite | Lo escucha | `detail` |
|---|---|---|---|
| `nexus:monitor-click` | Escena 3D | Interfaz | — |
| `nexus:os-ready` | Interfaz | Escena 3D, FX | — |
| `nexus:mision-iniciada` | Interfaz | FX | `{ id }` |
| `nexus:mision-resuelta` | Interfaz | FX | `{ id, puntos, pasos }` |
| `nexus:logro` | Interfaz | FX | `{ id, nombre }` |

## 5. API de FX (la escribe Audio/FX, la usa Interfaz)

- `fx.play(nombre)` reproduce un sonido (`"tecla"`, `"notificacion"`, `"error"`, `"exito"`).
- `fx.animar(nombre, elemento)` aplica una animación (`"sello"`, `"logro"`, `"shake"`).
- `fx.volumen(0..1)` y `fx.silenciar(bool)`.
