// Capa única para hablar con el backend. Ninguna pantalla usa fetch directamente:
// todas llaman a api.get / api.post / ... y reciben el contenido de "data".
//
// Contrato (Excel de Pedro): éxito  → { "ok": true,  "data": { ... } }
//                            error  → { "ok": false, "error": { "code": "...", "message": "..." } }  (por confirmar con Pedro)
import { CONFIG } from './config.js';
import { ENDPOINTS } from './mocks.js';
import { ApiError } from './errores.js';
import { mockConEstado } from './mock-estado.js';

export { ApiError };

// ---------- Modo prueba: responde con los ejemplos del Excel ----------
function compilarRuta(ruta) {
  const nombres = [];
  const patron = ruta.replace(/:[A-Za-z]+/g, (m) => { nombres.push(m.slice(1)); return '([^/]+)'; });
  return { re: new RegExp('^' + patron + '$'), nombres };
}

// Las rutas con menos parámetros van primero, para que /servers/test gane sobre /servers/:serverId.
const RUTAS = ENDPOINTS
  .map((e) => ({ ...e, ...compilarRuta(e.ruta), nParams: (e.ruta.match(/:/g) || []).length }))
  .sort((a, b) => a.nParams - b.nParams);

function buscarEjemplo(metodo, ruta) {
  for (const e of RUTAS) {
    if (e.metodo === metodo && e.re.test(ruta)) return e;
  }
  return null;
}

async function pedirPrueba(metodo, ruta, cuerpo) {
  await new Promise((r) => setTimeout(r, CONFIG.RETRASO_PRUEBA_MS));
  const [soloRuta, query = ''] = ruta.split('?');
  const conEstado = mockConEstado(metodo, soloRuta, cuerpo, new URLSearchParams(query));
  if (conEstado !== undefined) return conEstado;
  const ejemplo = buscarEjemplo(metodo, soloRuta);
  if (!ejemplo) {
    throw new ApiError(`Modo prueba: el Excel no tiene ejemplo para ${metodo} ${soloRuta}`, { codigo: 'SIN_EJEMPLO', status: 404 });
  }
  return structuredClone(ejemplo.respuesta).data;
}

// ---------- Modo real: llama al backend ----------
async function pedirReal(metodo, ruta, cuerpo) {
  const opciones = { method: metodo, headers: {} };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  let resp;
  try {
    resp = await fetch(CONFIG.API_BASE + ruta, opciones);
  } catch {
    throw new ApiError(
      `No se pudo contactar al backend en ${CONFIG.API_BASE}. Revisa que esté corriendo y que tenga CORS activado.`,
      { codigo: 'BACKEND_NO_DISPONIBLE' },
    );
  }
  let json = null;
  try { json = await resp.json(); } catch { /* respuesta sin JSON */ }

  if (!resp.ok || (json && json.ok === false)) {
    const err = (json && json.error) || {};
    const mensaje = err.message || err.mensaje
      || (json && typeof json.detail === 'string' ? json.detail : null)
      || `Error HTTP ${resp.status}`;
    throw new ApiError(mensaje, {
      codigo: err.code || err.codigo || `HTTP_${resp.status}`,
      status: resp.status,
      detalle: err.details ?? err.detalle ?? null,
    });
  }
  return json && 'data' in json ? json.data : json;
}

function pedir(metodo, ruta, cuerpo) {
  return CONFIG.MODO_PRUEBA ? pedirPrueba(metodo, ruta, cuerpo) : pedirReal(metodo, ruta, cuerpo);
}

export const api = {
  get: (ruta) => pedir('GET', ruta),
  post: (ruta, cuerpo = {}) => pedir('POST', ruta, cuerpo),
  put: (ruta, cuerpo = {}) => pedir('PUT', ruta, cuerpo),
  patch: (ruta, cuerpo = {}) => pedir('PATCH', ruta, cuerpo),
  del: (ruta) => pedir('DELETE', ruta),
};

// Para armar rutas con nombres que escribe el usuario (bases, esquemas, roles) sin romper la URL.
export const seg = (valor) => encodeURIComponent(String(valor));
