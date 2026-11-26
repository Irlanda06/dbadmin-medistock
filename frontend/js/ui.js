// Piezas de interfaz reutilizables por todos los módulos.
// Regla de seguridad: los datos que vienen de PostgreSQL se insertan como TEXTO (nunca innerHTML),
// así un nombre de tabla o un valor raro no puede inyectar HTML en la página.

// h('button', { class: 'btn', onclick: fn }, 'Texto') → crea el elemento
export function h(tag, props = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of hijos.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function tarjeta(titulo, ...contenido) {
  return h('section', { class: 'tarjeta' },
    titulo ? h('h2', { class: 'tarjeta-titulo' }, titulo) : null,
    ...contenido);
}

// tipo: 'ok' | 'error' | 'aviso' | 'neutro' | 'info'
export function chip(texto, tipo = 'neutro') {
  return h('span', { class: `chip chip-${tipo}` }, texto);
}

// columnas: [{ titulo, valor: (fila) => texto o nodo, clase? }]
export function tabla(columnas, filas, { vacio = 'Sin datos para mostrar.' } = {}) {
  if (!filas || filas.length === 0) return h('p', { class: 'vacio' }, vacio);
  return h('div', { class: 'tabla-contenedor' },
    h('table', { class: 'tabla' },
      h('thead', {}, h('tr', {}, columnas.map((c) => h('th', {}, c.titulo)))),
      h('tbody', {}, filas.map((f) => h('tr', {}, columnas.map((c) => h('td', { class: c.clase || null }, c.valor(f))))))));
}

// Resultado de una consulta SQL: columnas = ['a','b'], filas = [[1,2], ...]
export function tablaResultado(columns, rows, { rowCount, truncated } = {}) {
  const cols = columns.map((nombre, i) => ({ titulo: nombre, valor: (f) => formatoCelda(f[i]) }));
  return h('div', {},
    tabla(cols, rows, { vacio: 'La consulta no regresó filas.' }),
    h('p', { class: 'pie-tabla' },
      `${rowCount ?? rows.length} fila(s)`,
      truncated ? ' · resultado recortado por el límite' : ''));
}

export function formatoCelda(v) {
  if (v === null || v === undefined) return h('span', { class: 'nulo' }, 'NULL');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function fechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? String(iso) : d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'medium' });
}

// Recuadro con el resultado de la última operación (la regla común del proyecto: éxito o error visible).
export function mostrarResultado(contenedor, { ok, titulo, detalle }) {
  contenedor.replaceChildren(
    h('div', { class: `resultado ${ok ? 'resultado-ok' : 'resultado-error'}` },
      h('strong', {}, ok ? '✓ ' : '✗ ', titulo),
      detalle ? h('div', { class: 'resultado-detalle' }, detalle) : null));
}

export function mensajeError(e) {
  const codigo = e && e.codigo ? ` [${e.codigo}]` : '';
  return `${(e && e.message) || 'Error desconocido'}${codigo}`;
}

// Avisos flotantes (toast)
export function avisar(texto, tipo = 'info') {
  let zona = document.getElementById('avisos');
  if (!zona) { zona = h('div', { id: 'avisos' }); document.body.append(zona); }
  const a = h('div', { class: `aviso aviso-${tipo}` }, texto);
  zona.append(a);
  setTimeout(() => a.remove(), 4500);
}

// Confirmación antes de acciones sensibles. Devuelve una promesa con true/false.
export function confirmar(titulo, mensaje, { textoBoton = 'Confirmar', peligro = false } = {}) {
  return new Promise((resolver) => {
    const dlg = h('dialog', { class: 'dialogo' },
      h('h3', {}, titulo),
      h('p', {}, mensaje),
      h('div', { class: 'acciones' },
        h('button', { class: 'btn', onclick: () => cerrar(false) }, 'Cancelar'),
        h('button', { class: `btn ${peligro ? 'btn-peligro' : 'btn-primario'}`, onclick: () => cerrar(true) }, textoBoton)));
    function cerrar(valor) { dlg.close(); dlg.remove(); resolver(valor); }
    dlg.addEventListener('cancel', () => cerrar(false));
    document.body.append(dlg);
    dlg.showModal();
  });
}

// Desactiva el botón mientras corre la operación, para que la interfaz no se congele ni se repitan clics.
export async function conCarga(boton, fn) {
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Procesando…';
  try { return await fn(); } finally { boton.disabled = false; boton.textContent = textoOriginal; }
}

// Campo de formulario con etiqueta
export function campo(etiqueta, input, ayuda) {
  return h('label', { class: 'campo' },
    h('span', { class: 'campo-etiqueta' }, etiqueta),
    input,
    ayuda ? h('span', { class: 'campo-ayuda' }, ayuda) : null);
}
