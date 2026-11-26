// Módulo 2 · Consulta SQL y exploración (E12–E20) · Pruebas P02 y P12
// Explorar esquemas, tablas, vistas, secuencias y catálogos; ver columnas y datos;
// ejecutar consultas de SOLO LECTURA. El backend usa el usuario de lectura del perfil.
import { api, seg } from '../api.js';
import { h, tarjeta, tabla, chip, conCarga, mensajeError, tablaResultado, avisar } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

const EJEMPLOS = [
  {
    titulo: 'Inventario con nombres',
    sql: `SELECT i.id_sucursal, m.nombre AS medicamento, m.categoria,
       i.existencia, i.punto_reorden
FROM medistock.inventario AS i
JOIN medistock.medicamentos AS m USING (id_medicamento)
ORDER BY i.existencia DESC`,
  },
  {
    titulo: 'Ventas por estado',
    sql: `SELECT estado, COUNT(*) AS ventas
FROM medistock.ventas
GROUP BY estado
ORDER BY estado`,
  },
  {
    titulo: 'Importe por categoría',
    sql: `SELECT m.categoria,
       SUM(d.cantidad) AS piezas,
       SUM(d.cantidad * d.precio_unitario) AS importe
FROM medistock.detalle_ventas AS d
JOIN medistock.ventas AS v USING (id_venta)
JOIN medistock.medicamentos AS m USING (id_medicamento)
WHERE v.estado = 'PAGADA'
GROUP BY m.categoria
ORDER BY importe DESC`,
  },
  {
    titulo: 'Movimientos recientes',
    sql: `SELECT id_movimiento, id_medicamento, tipo, cantidad, fecha
FROM medistock.movimientos_inventario
ORDER BY fecha DESC
LIMIT 20`,
  },
  {
    titulo: 'Intento de escritura (debe bloquearse)',
    sql: `DELETE FROM medistock.ventas WHERE id_venta = 1001`,
  },
];

const TIPOS = {
  tables: { etiqueta: 'Tablas', ruta: 'tables' },
  views: { etiqueta: 'Vistas', ruta: 'views' },
  sequences: { etiqueta: 'Secuencias', ruta: 'sequences' },
  catalogs: { etiqueta: 'Catálogos del sistema', ruta: 'catalogs' },
};
const NOMBRE_KIND = { r: 'tabla', p: 'tabla particionada', f: 'tabla externa', v: 'vista', m: 'vista materializada', S: 'secuencia' };
const FILAS_POR_PAGINA = 25;

export default {
  id: 'consultas',
  menu: 'Consultas SQL',
  titulo: 'Consulta SQL y exploración',
  descripcion: 'Explora esquemas, tablas y vistas, y ejecuta consultas de solo lectura.',

  render(contenedor) {
    let idMontado = null;

    function montar() {
      const s = servidorActivo();
      idMontado = s ? s.id : null;
      contenedor.replaceChildren();
      if (!s) {
        contenedor.append(tarjeta('Sin servidor activo',
          h('p', {}, 'Elige un servidor en el selector de arriba, o ve a ',
            h('a', { href: '#/conexiones' }, 'Conexiones'), ' y dale "Conectar".')));
        return;
      }
      if (s.readerConfigured === false) {
        contenedor.append(h('div', { class: 'resultado resultado-error' },
          h('strong', {}, `✗ ${s.name} no tiene usuario de lectura`),
          h('div', { class: 'resultado-detalle' },
            'Este módulo consulta con un usuario de solo lectura. Ve a ',
            h('a', { href: '#/conexiones' }, 'Conexiones'),
            ', dale "Editar" al perfil y llena "Usuario de lectura" y "Contraseña de lectura".')));
      }
      pantalla(s);
    }

    function pantalla(s) {
      let base = s.database;
      let esquema = 'medistock';
      let tipo = 'tables';
      let seleccionado = null; // { schema, name, kind }
      let offset = 0;

      // ---------- Barra superior: base y esquema ----------
      const selBase = h('select', {}, h('option', { value: base }, base));
      const selEsquema = h('select', {}, h('option', { value: esquema }, esquema));
      const barra = h('div', { class: 'barra-filtros' },
        h('label', { class: 'campo campo-linea' }, h('span', { class: 'campo-etiqueta' }, 'Base de datos'), selBase),
        h('label', { class: 'campo campo-linea' }, h('span', { class: 'campo-etiqueta' }, 'Esquema'), selEsquema),
        h('span', { class: 'campo-ayuda' }, `Servidor: ${s.name} · consultas con el usuario de lectura`));

      // E12 · Bases de datos
      api.get(`/api/v1/servers/${s.id}/databases`).then((lista) => {
        const nombres = (lista || []).map((d) => d.name || d).filter(Boolean);
        if (!nombres.length) return;
        selBase.replaceChildren(...nombres.map((n) => h('option', { value: n }, n)));
        selBase.value = nombres.includes(base) ? base : nombres[0];
        base = selBase.value;
      }).catch(() => { /* si falla, se queda la base del perfil */ });

      // E13 · Esquemas
      async function cargarEsquemas() {
        try {
          const lista = await api.get(`/api/v1/servers/${s.id}/databases/${seg(base)}/schemas`);
          const nombres = (lista || []).map((x) => x.name)
            .filter((n) => !n.startsWith('pg_toast') && n !== 'information_schema' && n !== 'pg_catalog');
          if (nombres.length) {
            selEsquema.replaceChildren(...nombres.map((n) => h('option', { value: n }, n)));
            esquema = nombres.includes(esquema) ? esquema : nombres[0];
            selEsquema.value = esquema;
          }
        } catch (e) { avisar(`No se pudieron leer los esquemas: ${mensajeError(e)}`, 'error'); }
      }

      selBase.addEventListener('change', async () => {
        base = selBase.value; seleccionado = null; pintarDetalle();
        await cargarEsquemas(); cargarObjetos();
      });
      selEsquema.addEventListener('change', () => { esquema = selEsquema.value; seleccionado = null; pintarDetalle(); cargarObjetos(); });

      // ---------- Explorador: lista de objetos (E14–E17) ----------
      const pestañas = h('div', { class: 'segmentado' });
      const zonaObjetos = h('div', { class: 'lista-objetos' });

      function pintarPestañas() {
        pestañas.replaceChildren(...Object.entries(TIPOS).map(([clave, t]) =>
          h('button', {
            type: 'button', class: `seg-btn ${clave === tipo ? 'activo' : ''}`,
            onclick: () => { tipo = clave; pintarPestañas(); cargarObjetos(); },
          }, t.etiqueta)));
      }

      async function cargarObjetos() {
        zonaObjetos.replaceChildren(h('p', { class: 'vacio' }, 'Cargando…'));
        try {
          const ruta = `/api/v1/servers/${s.id}/databases/${seg(base)}/${TIPOS[tipo].ruta}`;
          const lista = await api.get(tipo === 'catalogs' ? ruta : `${ruta}?schema=${seg(esquema)}`);
          if (!lista || !lista.length) {
            zonaObjetos.replaceChildren(h('p', { class: 'vacio' }, `No hay ${TIPOS[tipo].etiqueta.toLowerCase()} en ${tipo === 'catalogs' ? 'el sistema' : esquema}.`));
            return;
          }
          zonaObjetos.replaceChildren(...lista.map((o) => h('button', {
            type: 'button',
            class: `objeto ${seleccionado && seleccionado.schema === o.schema && seleccionado.name === o.name ? 'activo' : ''}`,
            onclick: () => { seleccionado = o; offset = 0; cargarObjetos(); pintarDetalle(); },
          },
          h('span', { class: 'objeto-nombre' }, tipo === 'catalogs' ? `${o.schema}.${o.name}` : o.name),
          h('span', { class: 'objeto-tipo' }, NOMBRE_KIND[o.kind] || o.kind || ''))));
        } catch (e) {
          zonaObjetos.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        }
      }

      // ---------- Detalle del objeto: columnas (E18) y datos (E19) ----------
      const zonaDetalle = h('div');

      async function pintarDetalle() {
        if (!seleccionado) {
          zonaDetalle.replaceChildren(h('p', { class: 'vacio' }, 'Elige una tabla, vista o secuencia de la lista para ver sus columnas y datos.'));
          return;
        }
        const o = seleccionado;
        const base_ruta = `/api/v1/servers/${s.id}/databases/${seg(base)}/objects/${seg(o.schema)}/${seg(o.name)}`;
        const zonaCols = h('div', {}, h('p', { class: 'vacio' }, 'Cargando columnas…'));
        const zonaDatos = h('div', {}, h('p', { class: 'vacio' }, 'Cargando datos…'));
        zonaDetalle.replaceChildren(
          h('div', { class: 'detalle-encabezado' },
            h('h3', { class: 'detalle-titulo' }, `${o.schema}.${o.name}`),
            chip(NOMBRE_KIND[o.kind] || 'objeto', 'info'),
            o.owner ? h('span', { class: 'campo-ayuda' }, `dueño: ${o.owner}`) : null),
          h('h4', { class: 'subtitulo' }, 'Columnas'), zonaCols,
          h('h4', { class: 'subtitulo' }, 'Datos'), zonaDatos);

        api.get(`${base_ruta}/columns`).then((cols) => {
          zonaCols.replaceChildren(tabla([
            { titulo: '#', valor: (c) => c.position },
            { titulo: 'Columna', valor: (c) => c.name, clase: 'mono' },
            { titulo: 'Tipo', valor: (c) => c.type, clase: 'mono' },
            { titulo: 'Nulos', valor: (c) => (c.nullable ? 'Sí' : 'No') },
            { titulo: 'Valor por defecto', valor: (c) => c.default ?? '—', clase: 'mono' },
          ], cols || []));
        }).catch((e) => zonaCols.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e))));

        try {
          const r = await api.get(`${base_ruta}/data?limit=${FILAS_POR_PAGINA}&offset=${offset}`);
          const anterior = h('button', { class: 'btn btn-chico', disabled: offset === 0 }, '← Anterior');
          const siguiente = h('button', { class: 'btn btn-chico', disabled: !r.hasMore }, 'Siguiente →');
          anterior.addEventListener('click', () => { offset = Math.max(0, offset - FILAS_POR_PAGINA); pintarDetalle(); });
          siguiente.addEventListener('click', () => { offset += FILAS_POR_PAGINA; pintarDetalle(); });
          zonaDatos.replaceChildren(
            tablaResultado(r.columns || [], r.rows || [], { rowCount: r.rowCount }),
            h('div', { class: 'paginador' }, anterior,
              h('span', { class: 'campo-ayuda' }, `Filas ${offset + 1}–${offset + (r.rowCount || 0)}`), siguiente));
        } catch (e) {
          zonaDatos.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        }
      }

      // ---------- Editor SQL (E20) ----------
      const editor = h('textarea', { class: 'editor-sql', rows: '9', spellcheck: 'false' });
      editor.value = EJEMPLOS[0].sql;
      const limite = h('input', { type: 'number', min: '1', max: '1000', value: '100', class: 'input-chico' });
      const btnEjecutar = h('button', { class: 'btn btn-primario' }, 'Ejecutar  (Ctrl + Enter)');
      const zonaResultado = h('div');

      const ejemplos = h('div', { class: 'grupo-chips' },
        h('span', { class: 'campo-ayuda' }, 'Ejemplos:'),
        EJEMPLOS.map((ej) => h('button', {
          type: 'button', class: 'btn btn-chico',
          onclick: () => { editor.value = ej.sql; editor.focus(); },
        }, ej.titulo)));

      async function ejecutar() {
        const sql = editor.value.trim();
        if (!sql) { zonaResultado.replaceChildren(h('p', { class: 'vacio' }, 'Escribe una consulta.')); return; }
        const lim = Math.min(1000, Math.max(1, Number(limite.value) || 100));
        const inicio = performance.now();
        try {
          const r = await api.post(`/api/v1/servers/${s.id}/databases/${seg(base)}/query`, { sql, limit: lim });
          const ms = Math.round(performance.now() - inicio);
          zonaResultado.replaceChildren(
            h('div', { class: 'resultado resultado-ok' },
              h('strong', {}, '✓ Consulta ejecutada'),
              h('div', { class: 'resultado-detalle' },
                `${r.rowCount} fila(s) en ${ms} ms · base ${base} · servidor ${s.name}`,
                r.hasMore ? ` · hay más filas: se mostraron las primeras ${r.limit}` : '')),
            tablaResultado(r.columns || [], r.rows || [], { rowCount: r.rowCount, truncated: r.hasMore }));
        } catch (e) {
          const bloqueada = e.codigo === 'READ_ONLY_VIOLATION';
          zonaResultado.replaceChildren(h('div', { class: 'resultado resultado-error' },
            h('strong', {}, bloqueada ? '✗ Consulta bloqueada: el editor es de solo lectura' : '✗ La consulta falló'),
            h('div', { class: 'resultado-detalle' }, mensajeError(e))));
        }
      }

      btnEjecutar.addEventListener('click', () => conCarga(btnEjecutar, ejecutar));
      editor.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); btnEjecutar.click(); }
      });

      // ---------- Armado ----------
      contenedor.append(
        tarjeta(null, barra),
        h('div', { class: 'rejilla-explorador' },
          tarjeta('Objetos', pestañas, zonaObjetos),
          tarjeta('Detalle del objeto', zonaDetalle)),
        tarjeta('Editor SQL (solo lectura)',
          ejemplos, editor,
          h('div', { class: 'acciones acciones-izq acciones-editor' },
            btnEjecutar,
            h('label', { class: 'interruptor' }, 'Máximo de filas ', limite),
            h('span', { class: 'campo-ayuda' }, 'Solo se aceptan SELECT. INSERT, UPDATE, DELETE, DROP y similares se rechazan.')),
          zonaResultado));

      pintarPestañas();
      pintarDetalle();
      cargarEsquemas().then(cargarObjetos);
    }

    montar();
    // Si cambia el servidor activo (selector de arriba), se vuelve a armar la pantalla.
    const quitar = alCambiar(() => {
      const s = servidorActivo();
      if ((s ? s.id : null) !== idMontado) montar();
    });
    return quitar;
  },
};
