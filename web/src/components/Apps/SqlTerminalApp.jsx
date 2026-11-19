import { useState, useEffect, useRef } from 'preact/hooks';
import initSqlJs from 'sql.js';

let sqlJsPromise = null;

async function cargarSqlJs() {
  if (sqlJsPromise) return sqlJsPromise;
  sqlJsPromise = (async () => {
    const initFn = typeof initSqlJs === 'function' ? initSqlJs : initSqlJs?.default;
    if (typeof initFn !== 'function') {
      throw new Error('No se pudo resolver initSqlJs desde el paquete sql.js.');
    }

    const base = (import.meta.env?.BASE_URL || './').replace(/\/?$/, '/');
    const candidatos = Array.from(
      new Set([`${base}sql-wasm.wasm`, './sql-wasm.wasm', '/sql-wasm.wasm'])
    );

    let wasmBinary = null;
    const errores = [];

    for (const url of candidatos) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          errores.push(`${url} (HTTP ${res.status})`);
          continue;
        }
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        if (
          bytes.length >= 4 &&
          bytes[0] === 0x00 &&
          bytes[1] === 0x61 &&
          bytes[2] === 0x73 &&
          bytes[3] === 0x6d
        ) {
          wasmBinary = buf;
          break;
        }
        errores.push(`${url} (respuesta no WASM)`);
      } catch (e) {
        errores.push(`${url} (${e.message})`);
      }
    }

    if (wasmBinary) {
      return await initFn({ wasmBinary });
    }

    try {
      return await initFn({ locateFile: (file) => `${base}${file}` });
    } catch (e) {
      throw new Error(
        `No se pudo cargar sql-wasm.wasm (${errores.join(', ') || e.message}). Verifica que exista en web/public/sql-wasm.wasm.`
      );
    }
  })().catch((err) => {
    sqlJsPromise = null;
    throw err;
  });
  return sqlJsPromise;
}

export default function SqlTerminalApp() {
  const dbRef = useRef(null);
  const [dbReady, setDbReady] = useState(false);
  const [query, setQuery] = useState('SELECT * FROM clientes LIMIT 5;');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [initError, setInitError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setInitError(null);

    const init = async () => {
      try {
        const SQL = await cargarSqlJs();
        if (!mounted) return;
        const database = new SQL.Database();

        // Schema inicial de prueba (Banco Nexus)
        database.run(`
          CREATE TABLE IF NOT EXISTS sucursales (id INTEGER PRIMARY KEY, ciudad TEXT);
          CREATE TABLE IF NOT EXISTS clientes (id INTEGER PRIMARY KEY, nombre TEXT, saldo REAL, sucursal_id INTEGER);
          INSERT INTO sucursales VALUES (1, 'La Paz'), (2, 'Santa Cruz');
          INSERT INTO clientes VALUES (1, 'Juan Perez', -500.0, 1), (2, 'Maria Lopez', 1500.0, 2), (3, 'Carlos Ruiz', -1200.0, 1);
        `);

        dbRef.current?.close?.();
        dbRef.current = database;
        setDbReady(true);
        setLoading(false);
      } catch (err) {
        console.error('[SqlTerminalApp] Error sql.js:', err);
        if (!mounted) return;
        setInitError(err?.message || 'Error cargando sql.js. ¿Está sql-wasm.wasm en web/public/?');
        setDbReady(false);
        setLoading(false);
      }
    };
    init();

    return () => {
      mounted = false;
      dbRef.current?.close?.();
      dbRef.current = null;
    };
  }, [retryCount]);

  const executeQuery = () => {
    if (!dbRef.current) {
      setError('El motor SQL todavía no está listo.');
      return;
    }
    const limpia = (query || '').trim();
    if (!limpia) {
      setError('Escribe una consulta SQL antes de ejecutar.');
      setResults(null);
      return;
    }
    try {
      window.fx?.play?.('tecla');
      const res = dbRef.current.exec(limpia);
      setResults(res);
      setError(null);
    } catch (err) {
      setError(err.message);
      setResults(null);
    }
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  };

  if (loading) {
    return <div class="p-8 text-center text-nexus-muted">Cargando motor SQL (WASM)...</div>;
  }

  if (initError && !dbReady) {
    return (
      <div class="p-6 text-center space-y-3">
        <div class="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded">
          {initError}
        </div>
        <button
          onClick={() => setRetryCount((c) => c + 1)}
          class="px-3 py-1.5 bg-nexus-accent hover:bg-blue-600 text-white rounded text-xs font-medium"
        >
          Reintentar carga de SQL
        </button>
      </div>
    );
  }

  return (
    <div class="h-full flex flex-col">
      <div class="p-2 border-b border-nexus-border bg-nexus-panel flex gap-2">
        <textarea
          value={query}
          onInput={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          class="flex-1 bg-black/40 text-nexus-text font-mono text-sm p-2 rounded border border-nexus-border focus:border-nexus-accent focus:outline-none resize-none h-24"
          placeholder="Escribe tu consulta SQL aquí... (Ctrl+Enter para ejecutar)"
        />
        <div class="flex flex-col justify-end gap-1">
          <button
            onClick={executeQuery}
            disabled={!dbReady}
            class="px-4 py-2 bg-nexus-accent hover:bg-blue-600 disabled:opacity-50 text-white rounded font-medium text-sm transition-colors h-10"
            title="Ejecutar consulta (Ctrl+Enter)"
          >
            Ejecutar ▶
          </button>
          <span class="text-[10px] text-center text-nexus-muted font-mono">Ctrl+Enter</span>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-4">
        {error && (
          <div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded shake">
            Error de sintaxis: {error}
          </div>
        )}

        {!results && !error && (
          <div class="text-nexus-muted text-sm italic">Ejecuta una consulta para ver los resultados.</div>
        )}

        {results && results.length === 0 && (
          <div class="text-nexus-muted text-sm">Consulta ejecutada correctamente (0 filas afectadas).</div>
        )}

        {results && results.length > 0 && results.map((res, idx) => (
          <div key={idx} class="overflow-x-auto">
            <table class="w-full text-sm text-left border-collapse">
              <thead>
                <tr class="border-b border-nexus-border text-nexus-muted">
                  {res.columns.map((col) => (
                    <th key={col} class="p-2 font-medium">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {res.values.map((row, rIdx) => (
                  <tr key={rIdx} class="border-b border-nexus-border/50 hover:bg-white/5 transition-colors">
                    {row.map((val, cIdx) => (
                      <td key={cIdx} class="p-2 font-mono text-nexus-text">
                        {val === null ? '<NULL>' : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
