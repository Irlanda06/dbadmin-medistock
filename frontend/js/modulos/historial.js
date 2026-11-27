// Módulo 10 · Historial y seguimiento (E60–E61) · Prueba P14
import { api } from '../api.js';
import {
  h, tarjeta, tabla, chipOperacion, conCarga, mensajeError, fechaHora,
} from '../ui.js';
import { estado, recargarServidores } from '../estado.js';

const LIMITE = 20;

const NOMBRES_OPERACION = {
  BACKUP: 'Respaldo', RESTORE: 'Restauración', CREATE_ROLE: 'Crear rol',
  UPDATE_ROLE: 'Modificar rol', CHANGE_PASSWORD: 'Cambiar contraseña',
  ADD_ROLE_MEMBER: 'Agregar miembro', REMOVE_ROLE_MEMBER: 'Quitar miembro',
  GRANT: 'Conceder privilegio', REVOKE: 'Revocar privilegio', ANALYZE: 'Analyze',
  VACUUM: 'Vacuum', CREATE_EXTENSION: 'Crear extensión',
  CREATE_FOREIGN_SERVER: 'Crear servidor externo', CREATE_USER_MAPPING: 'Crear mapeo de usuario',
  CREATE_FOREIGN_TABLE: 'Crear tabla externa', CREATE_DISTRIBUTED_VIEW: 'Crear vista distribuida',
  SERVER_TEST: 'Probar conexión', SERVER_CONNECT: 'Conectar', SERVER_DISCONNECT: 'Desconectar',
  SQL_QUERY: 'Consulta SQL',
};

const TIPOS = Object.entries(NOMBRES_OPERACION);

function fechaUtc(texto) {
  if (!texto) return null;
  const valor = String(texto);
  const tieneZona = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(valor);
  return new Date(tieneZona ? valor : `${valor.replace(' ', 'T')}Z`);
}

function duracion(inicio, fin) {
  if (!inicio || !fin) return '—';
  const desde = fechaUtc(inicio).getTime();
  const hasta = fechaUtc(fin).getTime();
  if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return '—';
  return `${Math.max(0, (hasta - desde) / 1000).toFixed(1)} s`;
}

function nombreTipo(tipo) { return NOMBRES_OPERACION[tipo] || tipo || '—'; }

export default {
  id: 'historial',
  menu: 'Historial',
  titulo: 'Historial y seguimiento',
  descripcion: 'Consulta las operaciones registradas y revisa sus resultados.',

  render(contenedor) {
    let offset = 0;
    let filtroServidor = '';
    let filtroTipo = '';
    let filtroEstado = '';
    let hasMore = false;
    let vivo = true;

    const selServidor = h('select', {}, h('option', { value: '' }, 'Todos'));
    const selTipo = h('select', {}, h('option', { value: '' }, 'Todos'),
      TIPOS.map(([valor, nombre]) => h('option', { value: valor }, nombre)));
    const selEstado = h('select', {}, h('option', { value: '' }, 'Todos'),
      ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'].map((v) => h('option', { value: v }, v)));
    const btnActualizar = h('button', { type: 'button', class: 'btn btn-primario' }, 'Actualizar');
    const btnAnterior = h('button', { type: 'button', class: 'btn btn-chico', disabled: true }, '← Anterior');
    const btnSiguiente = h('button', { type: 'button', class: 'btn btn-chico', disabled: true }, 'Siguiente →');
    const textoPagina = h('span', { class: 'campo-ayuda' }, 'Página 1');
    const zonaTabla = h('div', {}, h('p', { class: 'vacio' }, 'Cargando historial…'));
    const zonaDetalle = h('div');
    const zonaPaginador = h('div', { class: 'paginador' }, btnAnterior, textoPagina, btnSiguiente);

    function llenarServidores() {
      const previo = selServidor.value || filtroServidor;
      selServidor.replaceChildren(h('option', { value: '' }, 'Todos'),
        ...estado.servidores.map((s) => h('option', { value: String(s.id) }, s.name)));
      if (estado.servidores.some((s) => String(s.id) === previo)) selServidor.value = previo;
    }

    function rutaHistorial() {
      const q = new URLSearchParams({ limit: String(LIMITE), offset: String(offset) });
      if (filtroServidor) q.set('serverId', filtroServidor);
      if (filtroTipo) q.set('operationType', filtroTipo);
      if (filtroEstado) q.set('status', filtroEstado);
      return `/api/v1/history?${q}`;
    }

    async function verDetalle(id) {
      zonaDetalle.replaceChildren(tarjeta('Detalle de operación', h('p', { class: 'vacio' }, `Cargando operación #${id}…`)));
      try {
        const r = await api.get(`/api/v1/history/${id}`);
        if (!vivo) return;
        const campos = [
          ['ID', r.id], ['ID de servidor', r.serverId], ['Servidor', r.serverName], ['Base', r.database],
          ['Tipo', nombreTipo(r.operationType)], ['Objeto', r.targetObject],
          ['Usuario', r.executedBy], ['Estado', r.status],
          ['Creada', fechaHora(r.createdAt)], ['Iniciada', fechaHora(r.startedAt)],
          ['Finalizada', fechaHora(r.finishedAt)], ['Duración', duracion(r.startedAt, r.finishedAt)],
        ];
        if (r.status !== 'FAILED') {
          campos.push(['Código de error', r.errorCode], ['Mensaje de error', r.errorMessage]);
        }
        const contenido = [h('dl', { class: 'datos' }, campos.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v ?? '—')]))];
        if (r.status === 'FAILED') {
          contenido.push(h('div', { class: 'resultado resultado-error' },
            h('strong', {}, 'La operación falló'),
            h('div', { class: 'resultado-detalle' }, `Código: ${r.errorCode || '—'}`),
            h('div', { class: 'resultado-detalle' }, r.errorMessage || 'Sin mensaje de error.')));
        }
        if (r.result !== null && r.result !== undefined) {
          contenido.push(h('h3', { class: 'subtitulo' }, 'Resultado'),
            h('pre', { class: 'mono' }, JSON.stringify(r.result, null, 2)));
        } else {
          contenido.push(h('dl', { class: 'datos' }, h('dt', {}, 'Resultado'), h('dd', {}, '—')));
        }
        zonaDetalle.replaceChildren(tarjeta(`Detalle de operación #${r.id}`, ...contenido));
      } catch (e) {
        zonaDetalle.replaceChildren(tarjeta('Detalle de operación',
          h('div', { class: 'resultado resultado-error' }, mensajeError(e))));
      }
    }

    async function cargar() {
      zonaTabla.replaceChildren(h('p', { class: 'vacio' }, 'Cargando historial…'));
      try {
        if (!estado.servidores.length) await recargarServidores();
        if (!vivo) return;
        llenarServidores();
        const pagina = await api.get(rutaHistorial());
        if (!vivo) return;
        const items = pagina.items || [];
        hasMore = Boolean(pagina.hasMore);
        zonaTabla.replaceChildren(tabla([
          { titulo: '#', valor: (r) => r.id },
          { titulo: 'Fecha', valor: (r) => fechaHora(r.createdAt) },
          { titulo: 'Tipo', valor: (r) => nombreTipo(r.operationType) },
          { titulo: 'Servidor', valor: (r) => r.serverName || '—' },
          { titulo: 'Base', valor: (r) => r.database || '—' },
          { titulo: 'Objeto', valor: (r) => r.targetObject || '—', clase: 'mono' },
          { titulo: 'Usuario', valor: (r) => r.executedBy || '—' },
          { titulo: 'Estado', valor: (r) => chipOperacion(r.status) },
          { titulo: 'Duración', valor: (r) => duracion(r.startedAt, r.finishedAt) },
          { titulo: 'Detalle', valor: (r) => h('button', {
            type: 'button', class: 'btn btn-chico btn-texto', onclick: () => verDetalle(r.id),
          }, 'Ver'), clase: 'acciones-fila' },
        ], items, { vacio: 'No hay operaciones para estos filtros.' }));
        const desde = items.length ? offset + 1 : 0;
        const hasta = offset + items.length;
        textoPagina.textContent = `${desde}–${hasta} · ${pagina.total ?? 'total desconocido'}`;
        btnAnterior.disabled = offset === 0;
        btnSiguiente.disabled = !hasMore;
      } catch (e) {
        zonaTabla.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        btnAnterior.disabled = offset === 0;
        btnSiguiente.disabled = true;
        textoPagina.textContent = 'No se pudo cargar la página';
      }
    }

    btnActualizar.addEventListener('click', () => conCarga(btnActualizar, async () => {
      filtroServidor = selServidor.value;
      filtroTipo = selTipo.value;
      filtroEstado = selEstado.value;
      offset = 0;
      await cargar();
    }));
    btnAnterior.addEventListener('click', async () => {
      if (offset === 0) return;
      offset = Math.max(0, offset - LIMITE);
      await cargar();
    });
    btnSiguiente.addEventListener('click', async () => {
      if (!hasMore) return;
      offset += LIMITE;
      await cargar();
    });

    contenedor.append(
      tarjeta('Filtrar historial',
        h('div', { class: 'fila-campos fila-3' },
          h('label', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Servidor'), selServidor),
          h('label', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Tipo de operación'), selTipo),
          h('label', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Estado'), selEstado)),
        h('div', { class: 'acciones' }, btnActualizar)),
      tarjeta('Operaciones registradas', zonaTabla, zonaPaginador),
      zonaDetalle,
      tarjeta('Persistencia', h('p', {}, 'El historial se guarda en SQLite en el backend (storage/dbadmin.db): se conserva aunque se cierre DBAdmin.')));

    cargar();
    return () => { vivo = false; };
  },
};
