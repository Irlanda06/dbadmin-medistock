// Modo prueba "con memoria" para el módulo de Conexiones (E01–E11).
// Los ejemplos fijos del Excel siempre devuelven lo mismo; aquí se guardan los perfiles
// en memoria para que registrar, editar y eliminar se vean reflejados en la tabla.
// Devuelve undefined cuando la ruta no le toca, y entonces api.js usa el ejemplo del Excel.
import { ApiError } from './errores.js';

let servidores = [
  { id: 1, name: 'MediStock Norte', host: '127.0.0.1', port: 5451, database: 'medistock', username: 'adminlab', passwordConfigured: true },
  { id: 2, name: 'MediStock Sur', host: '127.0.0.1', port: 5452, database: 'medistock', username: 'adminlab', passwordConfigured: true },
];
let siguienteId = 3;

// En modo prueba se puede simular la caída de un nodo desde la consola del navegador:
//   simularCaida(2)  → Sur aparece OFFLINE      simularCaida(2, false) → vuelve a ONLINE
const caidos = new Set();
window.simularCaida = (id, caido = true) => { caido ? caidos.add(id) : caidos.delete(id); return `Servidor ${id}: ${caido ? 'OFFLINE' : 'ONLINE'}`; };

const publico = (s) => ({ ...s });
const noDisponible = (s) => new ApiError(`El nodo ${s.name} no responde en ${s.host}:${s.port}.`, { codigo: 'NODE_UNAVAILABLE', status: 503 });

function datosPerfil(c) {
  return { name: c.name, host: c.host, port: Number(c.port), database: c.database, username: c.username };
}

export function mockConEstado(metodo, ruta, cuerpo) {
  if (ruta === '/api/v1/servers') {
    if (metodo === 'GET') return { items: servidores.map(publico), total: servidores.length };
    if (metodo === 'POST') {
      if (servidores.some((s) => s.name === cuerpo.name)) {
        throw new ApiError(`Ya existe un perfil llamado "${cuerpo.name}".`, { codigo: 'PROFILE_EXISTS', status: 409 });
      }
      const nuevo = { id: siguienteId++, ...datosPerfil(cuerpo), passwordConfigured: Boolean(cuerpo.password) };
      servidores.push(nuevo);
      return publico(nuevo);
    }
  }

  const m = ruta.match(/^\/api\/v1\/servers\/(\d+)(\/[a-z]+)?$/);
  if (!m) return undefined;
  const id = Number(m[1]);
  const sub = m[2] || '';
  const s = servidores.find((x) => x.id === id);
  if (!s) throw new ApiError('Servidor no encontrado.', { codigo: 'NOT_FOUND', status: 404 });

  const info = {
    version: 'PostgreSQL 18 (modo prueba)', database: s.database, username: s.username,
    serverAddress: `172.20.0.${id + 1}`, serverPort: 5432, status: 'ONLINE',
  };

  if (sub === '' && metodo === 'GET') return publico(s);
  if (sub === '' && metodo === 'PUT') {
    Object.assign(s, datosPerfil(cuerpo));
    if (cuerpo.password) s.passwordConfigured = true;
    return publico(s);
  }
  if (sub === '' && metodo === 'DELETE') {
    servidores = servidores.filter((x) => x.id !== id);
    return { id, deleted: true };
  }
  if (sub === '/status' && metodo === 'GET') {
    const caido = caidos.has(id);
    return {
      serverId: id, status: caido ? 'OFFLINE' : 'ONLINE', checkedAt: new Date().toISOString(),
      latencyMs: caido ? null : 4 + Math.round(Math.random() * 8),
      ...(caido ? { reason: 'connection refused' } : {}),
    };
  }
  if (caidos.has(id) && ['/test', '/connect', '/info'].includes(sub)) throw noDisponible(s);
  if (sub === '/test' && metodo === 'POST') return { reachable: true, ...info };
  if (sub === '/connect' && metodo === 'POST') return { serverId: id, connected: true, ...info };
  if (sub === '/disconnect' && metodo === 'POST') return { serverId: id, connected: false };
  if (sub === '/info' && metodo === 'GET') return info;
  return undefined;
}
