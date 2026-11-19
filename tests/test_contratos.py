"""Contrato, entorno y smoke tests de RL para Banco Nexus."""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "rl"))

import env as rl_env  # noqa: E402
import train as rl_train  # noqa: E402


def _load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _mission_entries(data):
    """Acepta el contrato actual (misiones[]) y la forma legacy (misión raíz)."""
    if isinstance(data, dict) and isinstance(data.get("misiones"), list):
        return data["misiones"]
    return [data] if isinstance(data, dict) else []


def test_missions_json_contract_and_expected_sql_if_present():
    path = ROOT / "missions" / "missions.json"
    if not path.exists():
        pytest.skip("missions/missions.json aún no existe")

    data = _load_json(path)
    missions = _mission_entries(data)
    assert missions, "El archivo debe contener al menos una misión"

    schema_path = ROOT / "missions" / "schema.sql"
    for mission in missions:
        required = {"id", "acto", "tipo", "tema", "clausula_tag", "dificultad",
                    "sla_segundos", "remitente", "titulo", "correo", "consulta_esperada"}
        assert required <= mission.keys(), f"Campos faltantes en misión {mission.get('id')}"
        assert mission["tipo"] in {"rl", "solo_jugador"}
        assert isinstance(mission["dificultad"], int) and mission["dificultad"] >= 1
        assert isinstance(mission["sla_segundos"], int) and mission["sla_segundos"] > 0
        assert mission["consulta_esperada"].strip().upper().startswith("SELECT")

        if mission["tipo"] == "rl":
            piezas = mission.get("piezas_permitidas")
            assert isinstance(piezas, list) and len(piezas) == 8
            assert all(isinstance(p, str) and p.strip() for p in piezas)
            assert len(set(piezas)) == 8, "Las 8 piezas RL deben ser distintas"

        if schema_path.exists():
            con = sqlite3.connect(":memory:")
            try:
                con.executescript(schema_path.read_text(encoding="utf-8"))
                con.execute(mission["consulta_esperada"]).fetchall()
            except sqlite3.Error as exc:
                pytest.fail(f"SQL de misión {mission.get('id')} falla con schema.sql: {exc}")
            finally:
                con.close()
        else:
            # Fallback: valida que la consulta de la misión base sea ejecutable
            # en la BD de demostración del entorno. Misiones nuevas que dependan
            # de otras tablas se validan cuando schema.sql está disponible.
            if mission.get("id") == rl_env.MISION["id"]:
                con = rl_env.crear_bd()
                try:
                    con.execute(mission["consulta_esperada"]).fetchall()
                finally:
                    con.close()


def test_lessons_json_contract_if_present():
    path = ROOT / "content" / "lessons.json"
    if not path.exists():
        pytest.skip("content/lessons.json aún no existe")

    data = _load_json(path)
    assert isinstance(data, dict)
    assert isinstance(data.get("bloques"), list) and data["bloques"]

    block_ids = set()
    lesson_ids = set()
    for block in data["bloques"]:
        assert {"id", "titulo", "orden", "lecciones"} <= block.keys()
        assert block["id"] not in block_ids, "ID de bloque duplicado"
        block_ids.add(block["id"])
        assert isinstance(block["lecciones"], list) and block["lecciones"]

        for lesson in block["lecciones"]:
            required = {"id", "titulo", "clausula_tag", "dificultad", "teoria_md",
                        "ejemplo_sql", "ejercicio", "quiz"}
            assert required <= lesson.keys(), f"Campos faltantes en lección {lesson.get('id')}"
            assert lesson["id"] not in lesson_ids, "ID de lección duplicado"
            lesson_ids.add(lesson["id"])
            assert isinstance(lesson["dificultad"], int) and lesson["dificultad"] >= 1
            assert isinstance(lesson["teoria_md"], str)
            assert isinstance(lesson["ejemplo_sql"], str)
            exercise = lesson["ejercicio"]
            assert {"enunciado", "consulta_esperada", "pista"} <= exercise.keys()
            quiz = lesson["quiz"]
            assert {"pregunta", "opciones", "correcta"} <= quiz.keys()
            assert isinstance(quiz["opciones"], list) and len(quiz["opciones"]) >= 2
            assert isinstance(quiz["correcta"], int)
            assert 0 <= quiz["correcta"] < len(quiz["opciones"])


def test_environment_reset_and_step_cost():
    tables = rl_env.calcular_tablas()
    env = rl_env.BancoTabular(tables)

    assert env.reset() == 0
    assert env.s == 0 and env.t == 0

    state, reward, done, success = env.step(rl_env.COL_NOMBRE)
    assert state == 1 << rl_env.COL_NOMBRE
    assert reward == pytest.approx(-0.01)
    assert done is False
    assert success is False

    # Seleccionar la misma pieza dos veces no cambia la máscara.
    state2, reward2, done2, success2 = env.step(rl_env.COL_NOMBRE)
    assert state2 == state
    assert reward2 == pytest.approx(-0.01)
    assert done2 is False and success2 is False

    assert env.reset() == 0
    assert env.t == 0


def test_execute_is_terminal_and_uses_terminal_reward():
    tables = rl_env.calcular_tablas()
    env = rl_env.BancoTabular(tables)
    env.reset()

    _, reward, done, success = env.step(rl_env.EJECUTAR)
    assert done is True
    assert success is tables["exacto"][0]
    assert reward == pytest.approx(rl_env.COSTO_PASO + tables["rexec"][0])


def test_non_execute_step_truncates_at_max_steps():
    env = rl_env.BancoTabular(rl_env.calcular_tablas())
    env.reset()
    done = False
    for _ in range(rl_env.MAX_PASOS):
        _, reward, done, success = env.step(rl_env.COL_NOMBRE)
        assert reward == pytest.approx(rl_env.COSTO_PASO)
        assert success is False
    assert done is True


def test_q_learning_greedy_policy_solves_base_mission():
    """Smoke test determinista de convergencia; no entrena las 20 semillas."""
    tables = rl_env.calcular_tablas()
    params = dict(rl_train.PARAMS, episodios=4000, semillas=1)
    q, _, _ = rl_train.correr("qlearning", tables, params, seed=0)
    actions, success = rl_train.politica_greedy(q, tables)
    assert actions, "La política greedy debe emitir acciones"
    assert actions[-1] == rl_env.EJECUTAR, "La política debe terminar ejecutando"
    assert success, "Q-learning debe resolver la misión base con la semilla de prueba"
