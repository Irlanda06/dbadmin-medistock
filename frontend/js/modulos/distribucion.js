// Módulo 9 · Configuración y consultas distribuidas (E49–E59) · Pruebas P11, P12 y P13
// En el servidor activo (nodo LOCAL) se configura postgres_fdw para leer el inventario del
// otro nodo (REMOTO) y se crea una vista global con las dos sucursales.
//
//   Paso 1 extensión → 2 servidor remoto → 3 mapeo de usuario → 4 tabla externa → 5 vista global
//
// El nodo local llega al remoto por la red interna de Docker (nodo_sur:5432 o nodo_norte:5432),
// nunca por la IP del contenedor, que cambia en cada reinicio.
import { api, seg } from '../api.js';
import {
  h, tarjeta, tabla, chip, campo, conCarga, confirmar, avisar, mostrarResultado, mensajeError,
  tablaResultado,
} from '../ui.js';
import { estado, servidorActivo, alCambiar, recargarServidores } from '../estado.js';

const FILAS = 100; // 60 filas = 30 de Norte + 30 de Sur: caben en una página

export default {
  id: 'distribucion',
  menu: 'Distribución',
  titulo: 'Configuración y consultas distribuidas',
  descripcion: 'Configura postgres_fdw entre Norte y Sur y consulta el inventario global de las dos sucursales.',

  render(contenedor) {
    let idMontado = null;

    async function montar() {
      const s = servidorActivo();
      idMontado = s ? s.id : null;
      contenedor.replaceChildren();
      if (!s) {
        contenedor.append(tarjeta('Sin servidor activo',
          h('p', {}, 'Elige el nodo LOCAL en el selector de arriba (normalmente MediStock Norte).')));
        return;
      }
      if (!estado.servidores.length) await recargarServidores();
      const remoto = estado.servidores.find((x) => x.id !== s.id && x.host === s.host);
      if (!remoto) {
        contenedor.append(tarjeta('Falta el otro nodo',
          h('p', {}, 'Registra Norte y Sur en ', h('a', { href: '#/conexiones' }, 'Conexiones'), ' para poder conectarlos entre sí.')));
        return;
      }
      pantalla(s, remoto);
    }

    function pantalla(local, remoto) {
      const base = local.database;
      const ruta = `/api/v1/servers/${local.id}/databases/${seg(base)}/fdw`;
      const sufijo = remoto.port === 5452 ? 'sur' : 'norte';     // srv_sur / inventario_sur
      const hostDocker = remoto.port === 5452 ? 'nodo_sur' : 'nodo_norte';
      const nombres = { servidor: `srv_${sufijo}`, tabla: `inventario_${sufijo}`, vista: 'inventario_global' };

      // ---------- Encabezado: quién es local y quién remoto ----------
      const mapa = h('div', { class: 'mapa-fdw' },
        h('div', { class: 'nodo-fdw nodo-local' },
          h('strong', {}, `LOCAL · ${local.name}`),
          h('span', {}, `aquí se crean la extensión, el servidor externo, la tabla externa y la vista`)),
        h('div', { class: 'flecha-fdw' }, '── postgres_fdw ──►', h('br'), h('code', {}, `${hostDocker}:5432`)),
        h('div', { class: 'nodo-fdw' },
          h('strong', {}, `REMOTO · ${remoto.name}`),
          h('span', {}, `responde como cualquier cliente; se lee con su usuario de lectura`)));

      // ---------- Estado de cada paso ----------
      const chips = { 1: h('span'), 2: h('span'), 3: h('span'), 4: h('span'), 5: h('span') };
      const listas = { servidores: h('div'), mapeos: h('div'), tablas: h('div') };

      const hechos = {};
      let extensionCreada = false;
      function marcar(paso, hecho, texto) {
        hechos[paso] = hecho;
        chips[paso].replaceChildren(chip(texto || (hecho ? 'Hecho' : 'Pendiente'), hecho ? 'ok' : 'neutro'));
      }
      // Un paso terminado no se repite (PostgreSQL respondería "ya existe"): su botón queda desactivado.
      function actualizarBotones() {
        [p2, p3, p4, p5].forEach((p, i) => {
          const hecho = Boolean(hechos[i + 2]);
          p.btn.disabled = hecho;
          p.btn.textContent = hecho ? '✓ Ya existe' : p.texto;
        });
      }

      async function revisarEstado() {
        let servidores = [], mapeos = [], externas = [], vistas = [];
        try { servidores = await api.get(`${ruta}/servers`) || []; } catch { /* sin permisos o nodo caído */ }
        try { mapeos = await api.get(`${ruta}/user-mappings`) || []; } catch { /* sin extensión aún */ }
        try { externas = await api.get(`${ruta}/foreign-tables`) || []; } catch { /* sin extensión aún */ }
        try { vistas = await api.get(`/api/v1/servers/${local.id}/databases/${seg(base)}/views?schema=medistock`) || []; } catch { /* lector sin configurar */ }

        const srv = servidores.find((x) => x.name === inServidor.value);
        marcar(2, Boolean(srv));
        marcar(3, mapeos.some((m) => m.server === inServidor.value && m.localRole === local.username));
        marcar(4, externas.some((t) => t.schema === 'medistock' && t.name === inTabla.value));
        marcar(5, vistas.some((v) => v.name === inVista.value));
        // Leer la lista de servidores funciona aunque la extensión no exista; solo si ya hay un
        // servidor externo es seguro que la extensión está creada. Mientras, el paso 1 queda disponible
        // (CREATE EXTENSION IF NOT EXISTS no falla si ya existía).
        marcar(1, servidores.length > 0 || extensionCreada, servidores.length > 0 || extensionCreada ? 'postgres_fdw listo' : 'Pendiente');
        actualizarBotones();

        listas.servidores.replaceChildren(tabla([
          { titulo: 'Servidor externo', valor: (x) => x.name, clase: 'mono' },
          { titulo: 'Host', valor: (x) => `${x.host}:${x.port}`, clase: 'mono' },
          { titulo: 'Base', valor: (x) => x.database },
        ], servidores, { vacio: 'Todavía no hay servidores externos.' }));
        listas.mapeos.replaceChildren(tabla([
          { titulo: 'Servidor', valor: (m) => m.server, clase: 'mono' },
          { titulo: 'Rol local', valor: (m) => m.localRole, clase: 'mono' },
          { titulo: 'Entra al remoto como', valor: (m) => m.remoteUser, clase: 'mono' },
        ], mapeos, { vacio: 'Todavía no hay mapeos de usuario.' }));
        listas.tablas.replaceChildren(tabla([
          { titulo: 'Tabla externa (local)', valor: (t) => `${t.schema}.${t.name}`, clase: 'mono' },
          { titulo: 'Servidor', valor: (t) => t.server, clase: 'mono' },
          { titulo: 'Tabla remota', valor: (t) => `${t.remoteSchema}.${t.remoteTable}`, clase: 'mono' },
        ], externas, { vacio: 'Todavía no hay tablas externas.' }));
      }

      // Ejecuta un paso: confirma, llama, muestra resultado y refresca el estado.
      function botonPaso(texto, titulo, mensaje, llamada, describir) {
        const btn = h('button', { type: 'button', class: 'btn btn-primario' }, texto);
        const zona = h('div');
        // Si el objeto ya existía (CONFLICT), se informa como paso hecho, no como falla.
        const yaExiste = (e) => e.codigo === 'CONFLICT' || /already exists|ya existe/i.test(e.message);
        btn.addEventListener('click', async () => {
          if (!await confirmar(titulo, mensaje(), { textoBoton: 'Ejecutar' })) return;
          await conCarga(btn, async () => {
            try {
              const r = await llamada();
              mostrarResultado(zona, { ok: true, titulo: `${titulo}: listo`, detalle: describir(r) });
              avisar(`${titulo}: listo`, 'ok');
            } catch (e) {
              mostrarResultado(zona, yaExiste(e)
                ? { ok: true, titulo: `${titulo}: ya estaba hecho`, detalle: 'El objeto ya existía en el nodo local; no se modificó.' }
                : { ok: false, titulo: `${titulo}: falló`, detalle: explicar(e) });
            }
            revisarEstado();
          });
        });
        return { btn, zona, texto };
      }

      const inServidor = h('input', { type: 'text', value: nombres.servidor, maxlength: '63' });
      const inTabla = h('input', { type: 'text', value: nombres.tabla, maxlength: '63' });
      const inVista = h('input', { type: 'text', value: nombres.vista, maxlength: '63' });

      // Paso 1 · E49
      const p1 = botonPaso('Habilitar postgres_fdw', 'Habilitar extensión',
        () => `Se ejecutará en ${local.name}: CREATE EXTENSION IF NOT EXISTS postgres_fdw. Solo el nodo local la necesita.`,
        async () => { const r = await api.post(`${ruta}/extension`, { confirmed: true }); extensionCreada = true; return r; },
        (r) => `${r.name} versión ${r.version}`);

      // Paso 2 · E51
      const p2 = botonPaso('Crear servidor externo', 'Crear servidor externo',
        () => `Se ejecutará CREATE SERVER ${inServidor.value} FOREIGN DATA WRAPPER postgres_fdw OPTIONS (host '${hostDocker}', port '5432', dbname '${remoto.database}'). Se usa el nombre del servicio de Docker, no una IP.`,
        () => api.post(`${ruta}/servers`, { confirmed: true, name: inServidor.value.trim(), remoteServerId: remoto.id }),
        (r) => `${r.name} → ${r.host}:${r.port}/${r.database}`);

      // Paso 3 · E53
      const p3 = botonPaso('Crear mapeo de usuario', 'Crear mapeo de usuario',
        () => `Se ejecutará CREATE USER MAPPING FOR ${local.username} SERVER ${inServidor.value}: cuando ${local.username} consulte la tabla externa, entrará a ${remoto.name} como su usuario de LECTURA (${remoto.readerUsername || 'dbadmin_reader'}). La contraseña no se muestra.`,
        () => api.post(`${ruta}/user-mappings`, { confirmed: true, server: inServidor.value.trim(), remoteServerId: remoto.id }),
        (r) => `${r.localRole} → entra a ${remoto.name} como ${r.remoteUser}`);

      // Paso 4 · E55 y prueba E56
      const p4 = botonPaso('Crear tabla externa', 'Crear tabla externa',
        () => `Se ejecutará IMPORT FOREIGN SCHEMA medistock LIMIT TO (inventario) FROM SERVER ${inServidor.value} y la tabla quedará como medistock.${inTabla.value}. No copia datos: cada consulta los lee en vivo de ${remoto.name}.`,
        () => api.post(`${ruta}/foreign-tables`, {
          confirmed: true, server: inServidor.value.trim(), remoteSchema: 'medistock', remoteTable: 'inventario',
          localSchema: 'medistock', localTable: inTabla.value.trim(),
        }),
        (r) => `${r.schema}.${r.table} ⇢ ${r.remoteSchema}.${r.remoteTable} en ${r.server}`);
      const btnProbar = h('button', { type: 'button', class: 'btn' }, 'Probar tabla externa');
      btnProbar.addEventListener('click', () => conCarga(btnProbar, async () => {
        try {
          const r = await api.post(`${ruta}/test`, { schema: 'medistock', table: inTabla.value.trim() });
          mostrarResultado(p4.zona, { ok: true, titulo: `Conexión remota correcta: ${r.rowCount} filas en ${r.schema}.${r.table}`, detalle: `Los datos vienen de ${remoto.name} en este momento.` });
        } catch (e) {
          mostrarResultado(p4.zona, { ok: false, titulo: `${remoto.name} no respondió`, detalle: mensajeError(e) });
        }
      }));

      // Paso 5 · E57
      const p5 = botonPaso('Crear vista global', 'Crear vista global',
        () => `Se creará la vista medistock.${inVista.value} = inventario local (${local.name}) UNION ALL ${inTabla.value} (${remoto.name}).`,
        () => api.post(`${ruta}/views`, {
          confirmed: true, schema: 'medistock', name: inVista.value.trim(),
          localSchema: 'medistock', localTable: 'inventario', remoteSchema: 'medistock', remoteTable: inTabla.value.trim(),
        }),
        (r) => `${r.schema}.${r.view}: ${r.rowCount} filas · ${(r.byBranch || []).map((b) => `sucursal ${b.id_sucursal}: ${b.records}`).join(' · ')}`);

      // Mensajes de error con la causa probable y qué hacer.
      function explicar(e) {
        if (e.codigo === 'READER_NOT_CONFIGURED') {
          return h('span', {}, mensajeError(e), ` → El perfil de ${remoto.name} no tiene usuario de lectura. Ve a `,
            h('a', { href: '#/conexiones' }, 'Conexiones'), `, dale "Editar" a ${remoto.name} y llena "Usuario de lectura" y su contraseña.`);
        }
        if (e.codigo === 'NOT_FOUND' && !hechos[1]) {
          return `${mensajeError(e)} → Primero ejecuta el paso 1 (Habilitar postgres_fdw).`;
        }
        return mensajeError(e);
      }

      function paso(n, titulo, explicacion, campos, accion, extra) {
        return h('div', { class: 'paso-fdw' },
          h('div', { class: 'paso-fdw-titulo' }, h('span', { class: 'paso-num' }, String(n)), h('strong', {}, titulo), chips[n]),
          h('p', { class: 'campo-ayuda' }, explicacion),
          campos ? h('div', { class: 'fila-campos' }, campos) : null,
          h('div', { class: 'acciones acciones-izq' }, accion.btn, extra || null),
          accion.zona);
      }

      // ---------- Consultas distribuidas (E58, E59) ----------
      const selConsulta = h('select', {},
        h('option', { value: 'inventory' }, 'Inventario global (vista, las dos sucursales)'),
        h('option', { value: 'inventory/details' }, 'Inventario global con JOIN a medicamentos (nombre, categoría, precio)'));
      const btnConsultar = h('button', { type: 'button', class: 'btn btn-primario' }, 'Consultar');
      const zonaConsulta = h('div');
      let offset = 0;

      async function consultar() {
        zonaConsulta.replaceChildren(h('p', { class: 'vacio' }, 'Consultando los dos nodos…'));
        try {
          const q = new URLSearchParams({ schema: 'medistock', view: inVista.value.trim(), limit: String(FILAS), offset: String(offset) });
          const r = await api.get(`${ruta}/${selConsulta.value}?${q}`);
          const anterior = h('button', { class: 'btn btn-chico', disabled: offset === 0 }, '← Anterior');
          const siguiente = h('button', { class: 'btn btn-chico', disabled: !r.hasMore }, 'Siguiente →');
          anterior.addEventListener('click', () => { offset = Math.max(0, offset - FILAS); consultar(); });
          siguiente.addEventListener('click', () => { offset += FILAS; consultar(); });
          const iSuc = (r.columns || []).indexOf('id_sucursal');
          const enPagina = {};
          (r.rows || []).forEach((f) => { const k = f[iSuc]; enPagina[k] = (enPagina[k] || 0) + 1; });
          zonaConsulta.replaceChildren(
            h('div', { class: 'resultado resultado-ok' },
              h('strong', {}, `✓ ${r.total ?? r.rowCount} filas en total, de los dos nodos`),
              h('div', { class: 'resultado-detalle' },
                `Esta página: ${Object.entries(enPagina).map(([k, n]) => `sucursal ${k} (${k === '1' ? 'Norte' : k === '2' ? 'Sur' : '?'}): ${n}`).join(' · ')}`)),
            tablaResultado(r.columns || [], r.rows || [], { rowCount: r.rowCount }),
            h('div', { class: 'paginador' }, anterior, h('span', { class: 'campo-ayuda' }, `Filas ${offset + 1}–${offset + (r.rowCount || 0)} de ${r.total ?? '?'}`), siguiente));
        } catch (e) {
          // P13: si el nodo remoto está caído, el error se muestra controlado y se puede reintentar.
          const caido = ['NODE_UNAVAILABLE', 'REMOTE_UNAVAILABLE', 'FDW_ERROR'].includes(e.codigo) || /conex|connect|remot|fdw/i.test(e.message);
          zonaConsulta.replaceChildren(h('div', { class: 'resultado resultado-error' },
            h('strong', {}, caido ? `✗ ${remoto.name} no responde: la vista global no se puede completar` : '✗ La consulta falló'),
            h('div', { class: 'resultado-detalle' }, mensajeError(e)),
            h('div', { class: 'resultado-detalle' },
              caido ? `La vista necesita los dos nodos. Cuando ${remoto.name} vuelva (docker compose start ${hostDocker}), dale Reintentar.` : ''),
            h('div', { class: 'acciones acciones-izq' }, h('button', { class: 'btn btn-chico', onclick: () => consultar() }, 'Reintentar'))));
        }
      }
      btnConsultar.addEventListener('click', () => { offset = 0; conCarga(btnConsultar, consultar); });
      selConsulta.addEventListener('change', () => { offset = 0; });

      // ---------- Armado ----------
      contenedor.append(
        tarjeta('Nodos', mapa),
        h('div', { class: 'rejilla-2' },
          tarjeta('Configuración paso a paso',
            paso(1, 'Extensión postgres_fdw', 'El "traductor" que permite a PostgreSQL leer tablas de otro servidor.', null, p1),
            paso(2, 'Servidor externo', 'La dirección del nodo remoto, guardada en el nodo local.', [campo('Nombre del servidor externo', inServidor)], p2),
            paso(3, 'Mapeo de usuario', 'El "gafete": con qué usuario entra el nodo local al remoto (su usuario de solo lectura).', null, p3),
            paso(4, 'Tabla externa', 'Una tabla local que en realidad lee el inventario del nodo remoto, en vivo.', [campo('Nombre local de la tabla externa', inTabla)], p4, btnProbar),
            paso(5, 'Vista global', 'Junta el inventario local y el remoto con UNION ALL.', [campo('Nombre de la vista', inVista)], p5)),
          tarjeta('Objetos creados en el nodo local',
            h('h4', { class: 'subtitulo' }, 'Servidores externos'), listas.servidores,
            h('h4', { class: 'subtitulo' }, 'Mapeos de usuario'), listas.mapeos,
            h('h4', { class: 'subtitulo' }, 'Tablas externas'), listas.tablas,
            h('div', { class: 'acciones acciones-izq' }, h('button', { class: 'btn btn-chico', onclick: () => revisarEstado() }, 'Actualizar')))),
        tarjeta('Consultas distribuidas',
          h('div', { class: 'acciones acciones-izq' }, selConsulta, btnConsultar),
          h('p', { class: 'campo-ayuda' }, 'Para probar la caída (P13): detén el nodo remoto con "docker compose stop" y consulta otra vez.'),
          zonaConsulta));

      [inServidor, inTabla, inVista].forEach((i) => i.addEventListener('change', revisarEstado));
      revisarEstado();
    }

    montar();
    return alCambiar(() => {
      const s = servidorActivo();
      if ((s ? s.id : null) !== idMontado) montar();
    });
  },
};
