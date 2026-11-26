// Arranque de DBAdmin: menú lateral, selector de servidor activo y navegación entre módulos (#/modulo).
import { CONFIG } from './config.js';
import { MODULOS } from './modulos/index.js';
import { h, avisar, mensajeError } from './ui.js';
import { estado, alCambiar, elegirServidor, recargarServidores, servidorActivo } from './estado.js';

const menu = document.getElementById('menu');
const contenido = document.getElementById('contenido');
const titulo = document.getElementById('titulo');
const descripcion = document.getElementById('descripcion');
const selector = document.getElementById('selector-servidor');
const indicadorModo = document.getElementById('modo');

let limpiezaActual = null;

function pintarMenu(idActivo) {
  menu.replaceChildren(...MODULOS.map((m) =>
    h('a', { href: `#/${m.id}`, class: `menu-item ${m.id === idActivo ? 'activo' : ''}` }, m.menu)));
}

function pintarSelector() {
  const activo = servidorActivo();
  selector.replaceChildren(
    h('option', { value: '' }, estado.servidores.length ? 'Elegir servidor activo…' : 'Sin servidores registrados'),
    ...estado.servidores.map((s) => {
      const op = h('option', { value: String(s.id) }, `${s.name} · ${s.database}${estado.conectados.has(s.id) ? ' (conectado)' : ''}`);
      if (activo && activo.id === s.id) op.selected = true;
      return op;
    }));
}

function navegar() {
  const id = (location.hash.replace(/^#\//, '') || 'resumen').split('?')[0];
  const modulo = MODULOS.find((m) => m.id === id) || MODULOS[0];
  if (limpiezaActual) { try { limpiezaActual(); } catch { /* nada */ } limpiezaActual = null; }
  pintarMenu(modulo.id);
  titulo.textContent = modulo.titulo;
  descripcion.textContent = modulo.descripcion || '';
  contenido.replaceChildren();
  try {
    const limpieza = modulo.render(contenido);
    if (typeof limpieza === 'function') limpiezaActual = limpieza;
  } catch (e) {
    contenido.append(h('div', { class: 'resultado resultado-error' }, `Error al abrir la pantalla: ${e.message}`));
    console.error(e);
  }
}

selector.addEventListener('change', () => elegirServidor(selector.value || null));
alCambiar(pintarSelector);
window.addEventListener('hashchange', navegar);

indicadorModo.textContent = CONFIG.MODO_PRUEBA ? 'Modo prueba (datos del Excel)' : `Backend: ${CONFIG.API_BASE}`;
indicadorModo.className = `modo ${CONFIG.MODO_PRUEBA ? 'modo-prueba' : 'modo-real'}`;

navegar();
recargarServidores().catch((e) => avisar(`No se pudo leer la lista de servidores: ${mensajeError(e)}`, 'error'));
