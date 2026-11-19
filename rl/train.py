"""Entrena Q-learning y SARSA tabulares para múltiples misiones y exporta web/data.js.

Uso:  python rl/train.py

Flujo:
1. Carga `missions/missions.json` y `missions/schema.sql` (fallback si no existen).
2. Filtra misiones con `"tipo": "rl"` y exactamente 8 `piezas_permitidas`.
3. Para cada misión entrena Q-learning y SARSA (varias semillas) y calcula
   baseline aleatorio + política greedy.
4. Exporta `web/data.js` con `window.DATA = { "version": 1, "misiones": [...] }`
   respetando el contrato de `docs/CONTRATOS.md`.
"""
import json
import random
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from env import (EJECUTAR, N_ACCIONES, N_ESTADOS, BancoTabular,
                 MISION_FALLBACK, calcular_tablas, cargar_todo)

PARAMS = dict(episodios=4000, alpha=0.2, gamma=0.95, eps0=1.0, eps_min=0.05,
              decay=0.9985, semillas=20, bloque=100)


def epsilon(ep, p):
    return max(p["eps_min"], p["eps0"] * p["decay"] ** ep)


def elegir(Q, s, eps, rng):
    if rng.random() < eps:
        return rng.randrange(N_ACCIONES)
    fila = Q[s * N_ACCIONES:(s + 1) * N_ACCIONES]
    m = max(fila)
    return rng.choice([i for i, v in enumerate(fila) if v == m])  # desempate aleatorio


def correr(algo, tablas, p, seed):
    rng = random.Random(seed)
    env = BancoTabular(tablas)
    Q = [0.0] * (N_ESTADOS * N_ACCIONES)
    retornos, exitos = [], []
    for ep in range(p["episodios"]):
        eps = epsilon(ep, p)
        s = env.reset()
        a = elegir(Q, s, eps, rng)
        G, ok = 0.0, False
        while True:
            s2, r, done, ok = env.step(a)
            G += r
            if done:
                objetivo = r
            else:
                a2 = elegir(Q, s2, eps, rng)
                if algo == "sarsa":
                    objetivo = r + p["gamma"] * Q[s2 * N_ACCIONES + a2]
                else:  # q-learning (off-policy)
                    objetivo = r + p["gamma"] * max(
                        Q[s2 * N_ACCIONES:(s2 + 1) * N_ACCIONES])
            i = s * N_ACCIONES + a
            Q[i] += p["alpha"] * (objetivo - Q[i])
            if done:
                break
            s, a = s2, a2
        retornos.append(G)
        exitos.append(1.0 if ok else 0.0)
    return Q, retornos, exitos


def politica_greedy(Q, tablas, max_pasos=20):
    env = BancoTabular(tablas)
    s, acciones = env.reset(), []
    for _ in range(max_pasos):
        fila = Q[s * N_ACCIONES:(s + 1) * N_ACCIONES]
        a = fila.index(max(fila))
        acciones.append(a)
        s, r, done, ok = env.step(a)
        if done:
            return acciones, ok
    return acciones, False


def baseline_aleatorio(tablas, n=20000, seed=123):
    rng, env, ok_total = random.Random(seed), BancoTabular(tablas), 0
    for _ in range(n):
        env.reset()
        while True:
            _, _, done, ok = env.step(rng.randrange(N_ACCIONES))
            if done:
                ok_total += ok
                break
    return ok_total / n


def promedio_bloques(series, bloque):
    n = len(series[0]) // bloque
    return [round(statistics.mean(x for s in series for x in s[b * bloque:(b + 1) * bloque]), 4)
            for b in range(n)]


def _mision_exportable(mision):
    """Subconjunto de la misión que se publica en data.js (contrato)."""
    return {
        "id": mision["id"],
        "titulo": mision.get("titulo", ""),
        "remitente": mision.get("remitente", ""),
        "correo": mision.get("correo", ""),
        "consulta_esperada": mision["consulta_esperada"],
    }


def entrenar_mision(mision, schema_sql, schema_dict, p):
    print(f"\n== Misión: {mision['id']} ==")
    tablas = calcular_tablas(mision, schema_sql, schema_dict)
    piezas = list(mision["piezas_permitidas"]) + ["EJECUTAR"]
    print(f"   Filas esperadas por la misión: {tablas['filas_esperadas']}")

    datos = {
        "mision": _mision_exportable(mision),
        "piezas": piezas,
        "sql": tablas["sql"],
        "rexec": tablas["rexec"],
        "exacto": tablas["exacto"],
        "params": p,
        "curvas": {},
        "qtables": {},
        "politica": {},
    }

    base = baseline_aleatorio(tablas)
    datos["baseline"] = round(base, 4)
    print(f"   Baseline aleatorio: {base:.2%} de éxito")

    for algo in ("qlearning", "sarsa"):
        exitos, retornos, finales = [], [], 0
        for seed in range(p["semillas"]):
            Q, ret, ex = correr(algo, tablas, p, seed)
            exitos.append(ex)
            retornos.append(ret)
            acciones, ok = politica_greedy(Q, tablas)
            finales += ok
            if seed == 0:
                datos["qtables"][algo] = [round(q, 3) for q in Q]
                datos["politica"][algo] = {"acciones": acciones, "exito": ok}
        datos["curvas"][algo] = {
            "exito": promedio_bloques(exitos, p["bloque"]),
            "retorno": promedio_bloques(retornos, p["bloque"]),
        }
        ult = datos["curvas"][algo]["exito"][-1]
        print(f"   {algo:10s} éxito final (últ. bloque, entrenando con eps): {ult:.1%}"
              f" | política greedy correcta en {finales}/{p['semillas']} semillas")
        print(f"      política semilla 0: "
              f"{[piezas[a] if 0 <= a < len(piezas) else a for a in datos['politica'][algo]['acciones']]}")

    return datos


def main():
    p = PARAMS
    misiones, schema_sql, schema_dict = cargar_todo()

    # Sólo misiones resueltas por RL y con exactamente 8 piezas.
    misiones_rl = [
        m for m in misiones
        if m.get("tipo", "rl") == "rl"
        and isinstance(m.get("piezas_permitidas"), list)
        and len(m.get("piezas_permitidas", [])) == 8
    ]
    if not misiones_rl:
        print("No hay misiones tipo 'rl' válidas; usando la misión de ejemplo (fallback).")
        misiones_rl = [MISION_FALLBACK]

    salida = {"version": 1, "misiones": []}
    for mision in misiones_rl:
        datos = entrenar_mision(mision, schema_sql, schema_dict, p)
        salida["misiones"].append(datos)

    out_path = Path(__file__).resolve().parent.parent / "web" / "data.js"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        "window.DATA = " + json.dumps(salida, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"\nDatos exportados a {out_path} ({out_path.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()