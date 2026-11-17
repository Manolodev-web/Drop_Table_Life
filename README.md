# Banco Nexus

Juego educativo de SQL ambientado en un banco, donde un agente de **aprendizaje por refuerzo** (Q-learning y SARSA tabulares) aprende a resolver las mismas misiones que el jugador.

## Prototipo de viabilidad (fase 0)

Un solo escenario: construir esta consulta pieza a pieza.

> Clientes de la sucursal La Paz con saldo negativo, ordenados del más endeudado al menos endeudado.

Formulación como MDP (ver `rl/env.py`):

- **Estado:** máscara de 8 bits con las piezas de consulta ya elegidas (256 estados).
- **Acciones:** 8 piezas (`FROM`, `JOIN`, `SELECT nombre`, `SELECT saldo`, `WHERE saldo < 0`, `WHERE ciudad = 'La Paz'`, `ORDER BY ASC/DESC`) + `EJECUTAR`.
- **Recompensa:** -0.01 por paso; al ejecutar: -0.5 si la consulta es inválida, +1 si el resultado es exacto, parcial según el solapamiento de filas.

### Resultados (20 semillas, 4000 episodios)

| Agente | Éxito |
|---|---|
| Aleatorio | 4.9 % |
| Q-learning | ~95 % (política final correcta en 20/20 semillas) |
| SARSA | ~95 % (política final correcta en 20/20 semillas) |

## Cómo ejecutarlo

```bash
# 1. Entrenar y exportar datos (solo necesita Python 3 estándar)
python rl/train.py

# 2. Abrir el prototipo: doble clic en web/index.html (no requiere servidor)
```

El prototipo entrena al agente **en vivo en el navegador**, muestra la curva de aprendizaje frente a las de Python, el mapa de valores V(s) de los 256 estados (la ecuación de Bellman propagándose) y reproduce la política aprendida.

## Estructura

```
rl/        Entorno y entrenamiento (Python)
web/       Prototipo: index.html, rl.js, data.js (generado)
missions/  Catálogo de misiones y base de datos (fase 1)
content/   Lecciones del acto 1 (fase 3)
docs/      AGENTES.md (reparto de trabajo) y CONTRATOS.md (formatos entre módulos)
```

## Cómo se trabaja

Lee `docs/AGENTES.md` y `docs/CONTRATOS.md` antes de tocar nada.
