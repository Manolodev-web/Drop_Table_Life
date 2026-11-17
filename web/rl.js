// Motor de RL tabular para el navegador. Replica rl/env.py y rl/train.py.
// Funciona en el navegador (window.RL) y en Node (module.exports) para pruebas.
(function (root) {
  const N_ACC = 9, N_EST = 256, EJECUTAR = 8, COSTO_PASO = -0.01, MAX_PASOS = 20;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class Entorno {
    constructor(data) { this.rexec = data.rexec; this.exacto = data.exacto; this.reset(); }
    reset() { this.s = 0; this.t = 0; return this.s; }
    // Devuelve { s, r, done, ok }
    step(a) {
      this.t++;
      if (a === EJECUTAR) {
        return { s: this.s, r: COSTO_PASO + this.rexec[this.s], done: true, ok: this.exacto[this.s] };
      }
      this.s |= 1 << a;
      return { s: this.s, r: COSTO_PASO, done: this.t >= MAX_PASOS, ok: false };
    }
  }

  class Agente {
    constructor(data, algo, params, seed) {
      this.data = data; this.algo = algo; this.p = params;
      this.rng = mulberry32(seed || 1);
      this.env = new Entorno(data);
      this.Q = new Float64Array(N_EST * N_ACC);
      this.ep = 0; this.historial = [];
    }
    epsilon() { return Math.max(this.p.eps_min, this.p.eps0 * Math.pow(this.p.decay, this.ep)); }
    mejor(s, aleatorio) {
      const base = s * N_ACC; let m = -Infinity, cand = [];
      for (let i = 0; i < N_ACC; i++) {
        const v = this.Q[base + i];
        if (v > m) { m = v; cand = [i]; } else if (v === m) cand.push(i);
      }
      return aleatorio ? cand[Math.floor(this.rng() * cand.length)] : cand[0];
    }
    maxQ(s) { let m = -Infinity; for (let i = 0; i < N_ACC; i++) m = Math.max(m, this.Q[s * N_ACC + i]); return m; }
    elegir(s, eps) {
      return this.rng() < eps ? Math.floor(this.rng() * N_ACC) : this.mejor(s, true);
    }
    // Ejecuta un episodio completo de entrenamiento.
    episodio() {
      const { alpha, gamma } = this.p, eps = this.epsilon();
      let s = this.env.reset(), a = this.elegir(s, eps), G = 0, ok = false;
      for (;;) {
        const r = this.env.step(a); G += r.r; ok = r.ok;
        let objetivo, a2 = null;
        if (r.done) objetivo = r.r;
        else {
          a2 = this.elegir(r.s, eps);
          objetivo = r.r + gamma * (this.algo === "sarsa" ? this.Q[r.s * N_ACC + a2] : this.maxQ(r.s));
        }
        const i = s * N_ACC + a;
        this.Q[i] += alpha * (objetivo - this.Q[i]);
        if (r.done) break;
        s = r.s; a = a2;
      }
      this.ep++; this.historial.push(ok ? 1 : 0);
      return { G, ok };
    }
    // Exito medio de los ultimos n episodios de entrenamiento.
    exitoReciente(n) {
      const h = this.historial.slice(-n);
      return h.length ? h.reduce((x, y) => x + y, 0) / h.length : 0;
    }
    // Sigue la politica greedy desde el estado vacio. Devuelve la secuencia de pasos.
    politica() {
      const env = new Entorno(this.data), pasos = [];
      let s = env.reset();
      for (let k = 0; k < MAX_PASOS; k++) {
        const a = this.mejor(s, false), q = Array.from(this.Q.slice(s * N_ACC, (s + 1) * N_ACC));
        const r = env.step(a);
        pasos.push({ estado: s, accion: a, q, recompensa: r.r, terminado: r.done, ok: r.ok, sql: this.data.sql[r.s] });
        s = r.s;
        if (r.done) break;
      }
      return pasos;
    }
    valorEstados() { const v = new Array(N_EST); for (let s = 0; s < N_EST; s++) v[s] = this.maxQ(s); return v; }
    cargarQ(arr) { this.Q.set(arr); }
  }

  const API = { Agente, Entorno, mulberry32, N_ACC, N_EST, EJECUTAR };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.RL = API;
})(typeof window !== "undefined" ? window : globalThis);
