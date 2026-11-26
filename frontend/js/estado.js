// Estado compartido entre pantallas: lista de servidores y servidor activo.
import { api } from './api.js';

const oyentes = new Set();

export const estado = {
  servidores: [],
  servidorActivoId: leerActivo(),
  conectados: new Set(), // ids conectados en esta sesión del navegador
};

function leerActivo() {
  try { const v = localStorage.getItem('dbadmin.servidorActivo'); return v ? Number(v) : null; } catch { return null; }
}

export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
function avisarCambio() { oyentes.forEach((fn) => fn(estado)); }

export function servidorActivo() {
  return estado.servidores.find((s) => s.id === estado.servidorActivoId) || null;
}

export function elegirServidor(id) {
  estado.servidorActivoId = id ? Number(id) : null;
  try {
    if (id) localStorage.setItem('dbadmin.servidorActivo', String(id));
    else localStorage.removeItem('dbadmin.servidorActivo');
  } catch { /* el navegador puede bloquear localStorage */ }
  avisarCambio();
}

export function marcarConectado(id, conectado) {
  conectado ? estado.conectados.add(id) : estado.conectados.delete(id);
  avisarCambio();
}

export async function recargarServidores() {
  const data = await api.get('/api/v1/servers');
  estado.servidores = data.items || [];
  if (estado.servidorActivoId && !servidorActivo()) estado.servidorActivoId = null;
  avisarCambio();
  return estado.servidores;
}
