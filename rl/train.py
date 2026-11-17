"""Entrena Q-learning y SARSA tabulares y exporta web/data.js.

Uso:  python rl/train.py
"""
import json
import random
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from env import (EJECUTAR, MISION, N_ACCIONES, N_ESTADOS, PIEZAS, BancoTabular,
                 calcular_tablas)

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
                    objetivo = r + p["gamma"] * max(Q[s2 * N_ACCIONES:(s2 + 1) * N_ACCIONES])
            i = s * N_ACCIONES + a
            Q[i] += p["alpha"] * (objetivo - Q[i])
            if done:
                break
            s, a = s2, a2
        retornos.append(G)
        exitos.append(1.0 if ok else 0.0)
    return Q, retornos, exitos


def politica_greedy(Q, tablas):
    env = BancoTabular(tablas)
    s, acciones = env.reset(), []
    for _ in range(20):
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


def main():
    p = PARAMS
    tablas = calcular_tablas()
    print(f"Filas esperadas por la mision: {tablas['filas_esperadas']}")
    datos = {"mision": MISION, "piezas": PIEZAS, "params": p, **tablas, "curvas": {}, "qtables": {},
             "politica": {}}
    base = baseline_aleatorio(tablas)
    datos["baseline"] = round(base, 4)
    print(f"Baseline aleatorio: {base:.2%} de exito")

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
        print(f"{algo:10s} exito final (ult. bloque, entrenando con eps): {ult:.1%} | "
              f"politica greedy correcta en {finales}/{p['semillas']} semillas")
        print("   politica semilla 0:", [PIEZAS[a] for a in datos["politica"][algo]["acciones"]])

    salida = Path(__file__).parent.parent / "web" / "data.js"
    salida.write_text("window.DATA = " + json.dumps(datos, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"Datos exportados a {salida} ({salida.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
