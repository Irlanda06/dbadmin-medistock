// Panel principal (Resumen): lo primero que se ve al abrir DBAdmin.
// Estado de los nodos (E10), totales del historial (E60) y la actividad reciente,
// más accesos directos a cada módulo con la prueba que cubre.
import { api } from '../api.js';
import { h, tarjeta, tabla, chip, fechaHora, chipOperacion, mensajeError } from '../ui.js';
import { estado, recargarServidores, servidorActivo, alCambiar } from '../estado.js';

const NOMBRES_TIPO = {
  BACKUP: 'Respaldo', RESTORE: 'Restauración', CREATE_ROLE: 'Crear rol', UPDATE_ROLE: 'Modificar rol',
  CHANGE_PASSWORD: 'Cambiar contraseña', ADD_ROLE_MEMBER: 'Agregar miembro', REMOVE_ROLE_MEMBER: 'Quitar miembro',
  GRANT: 'Conceder privilegio', REVOKE: 'Revocar privilegio', ANALYZE: 'Analyze', VACUUM: 'Vacuum',
  CREATE_EXTENSION: 'Crear extensión', CREATE_FOREIGN_SERVER: 'Crear servidor externo',
  CREATE_USER_MAPPING: 'Crear mapeo de usuario', CREATE_FOREIGN_TABLE: 'Crear tabla externa',
  CREATE_DISTRIBUTED_VIEW: 'Crear vista distribuida', SERVER_TEST: 'Probar conexión',
  SERVER_CONNECT: 'Conectar', SERVER_DISCONNECT: 'Desconectar', SQL_QUERY: 'Consulta SQL',
};

const ACCESOS = [
  ['conexiones', 'Conexiones', 'Perfiles, conexión y disponibilidad', 'P01 · P13'],
  ['consultas', 'Consultas SQL', 'Explorador y editor de solo lectura', 'P02'],
  ['respaldos', 'Respaldos', 'pg_dump por base, esquema o tabla', 'P03 · P04'],
  ['restauraciones', 'Restauraciones', 'Restaurar y verificar en base nueva', 'P05'],
  ['roles', 'Usuarios y roles', 'Usuarios, grupos, atributos y membresías', 'P06 · P07'],
  ['privilegios', 'Privilegios', 'GRANT / REVOKE con antes y después', 'P08'],
  ['mantenimiento', 'Mantenimiento', 'ANALYZE y VACUUM (ANALYZE)', 'P09'],
  ['sesiones', 'Sesiones y bloqueos', 'pg_stat_activity y bloqueadores', 'P10'],
  ['distribucion', 'Distribución', 'postgres_fdw e inventario global', 'P11 · P12 · P13'],
  ['historial', 'Historial', 'Operaciones registradas y persistentes', 'P14'],
];

export default {
  id: 'resumen',
  menu: 'Resumen',
  titulo: 'Panel principal',
  descripcion: 'Estado de los nodos de MediStock, actividad reciente y acceso a cada módulo.',

  render(contenedor) {
    const zonaNodos = h('div', { class: 'rejilla-nodos' }, h('p', { class: 'vacio' }, 'Comprobando nodos…'));
    const zonaCifras = h('div', { class: 'rejilla-cifras' });
    const zonaActividad = h('div', {}, h('p', { class: 'vacio' }, 'Cargando actividad…'));

    // ---------- Estado de los nodos (E10) ----------
    async function cargarNodos() {
      if (!estado.servidores.length) await recargarServidores();
      if (!estado.servidores.length) {
        zonaNodos.replaceChildren(h('p', { class: 'vacio' }, 'No hay servidores registrados. Empieza en ',
          h('a', { href: '#/conexiones' }, 'Conexiones'), '.'));
        return;
      }
      const activo = servidorActivo();
      const tarjetas = await Promise.all(estado.servidores.map(async (s) => {
        let st;
        try { st = await api.get(`/api/v1/servers/${s.id}/status`); } catch (e) { st = { status: 'UNREACHABLE', error: { message: mensajeError(e) } }; }
        const ok = st.status === 'ONLINE';
        return h('div', { class: `nodo-resumen ${ok ? 'nodo-ok' : 'nodo-caido'}` },
          h('div', { class: 'nodo-resumen-titulo' },
            h('strong', {}, s.name),
            chip(ok ? 'En línea' : 'Caído', ok ? 'ok' : 'error'),
            activo && activo.id === s.id ? chip('Activo', 'info') : null),
          h('div', { class: 'mono campo-ayuda' }, `${s.host}:${s.port} / ${s.database}`),
          h('div', { class: 'campo-ayuda' }, ok ? (st.version || st.server?.version || 'PostgreSQL') : (st.error?.message || 'No responde')),
          h('div', { class: 'campo-ayuda' }, `Lector: ${s.readerConfigured ? s.readerUsername : 'sin configurar'}`));
      }));
      zonaNodos.replaceChildren(...tarjetas);
    }

    // ---------- Cifras y actividad reciente (E60) ----------
    async function contar(filtro) {
      const r = await api.get(`/api/v1/history?limit=1${filtro}`);
      return r.total ?? 0;
    }

    async function cargarActividad() {
      try {
        const [total, fallidas, respaldos, restauraciones, recientes] = await Promise.all([
          contar(''), contar('&status=FAILED'), contar('&operationType=BACKUP&status=SUCCEEDED'),
          contar('&operationType=RESTORE&status=SUCCEEDED'), api.get('/api/v1/history?limit=8'),
        ]);
        const cifra = (valor, etiqueta, enlace, tipo = '') => h('a', { class: `cifra ${tipo}`, href: enlace },
          h('span', { class: 'cifra-valor' }, String(valor)), h('span', { class: 'cifra-etiqueta' }, etiqueta));
        zonaCifras.replaceChildren(
          cifra(total, 'operaciones registradas', '#/historial'),
          cifra(respaldos, 'respaldos exitosos', '#/respaldos'),
          cifra(restauraciones, 'restauraciones verificadas', '#/restauraciones'),
          cifra(fallidas, 'operaciones fallidas', '#/historial', fallidas ? 'cifra-alerta' : ''));
        zonaActividad.replaceChildren(tabla([
          { titulo: 'Fecha', valor: (r) => fechaHora(r.createdAt) },
          { titulo: 'Operación', valor: (r) => NOMBRES_TIPO[r.operationType] || r.operationType },
          { titulo: 'Servidor', valor: (r) => r.serverName || '—' },
          { titulo: 'Objeto', valor: (r) => r.targetObject || '—', clase: 'mono' },
          { titulo: 'Estado', valor: (r) => chipOperacion(r.status) },
        ], recientes.items || [], { vacio: 'Todavía no hay operaciones.' }),
        h('p', { class: 'pie-tabla' }, h('a', { href: '#/historial' }, 'Ver historial completo →')));
      } catch (e) {
        zonaActividad.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
      }
    }

    // ---------- Accesos a los módulos ----------
    const accesos = h('div', { class: 'rejilla-accesos' },
      ACCESOS.map(([id, nombre, texto, pruebas]) => h('a', { class: 'acceso', href: `#/${id}` },
        h('strong', {}, nombre), h('span', { class: 'campo-ayuda' }, texto), h('span', { class: 'acceso-pruebas' }, pruebas))));

    contenedor.append(
      tarjeta('Nodos del laboratorio', zonaNodos,
        h('div', { class: 'acciones acciones-izq' }, h('button', { class: 'btn btn-chico', onclick: () => cargarNodos() }, 'Comprobar de nuevo'))),
      zonaCifras,
      h('div', { class: 'rejilla-2' },
        tarjeta('Actividad reciente', zonaActividad),
        tarjeta('Módulos', accesos)));

    cargarNodos().catch(() => {});
    cargarActividad();
    return alCambiar(() => { cargarNodos().catch(() => {}); });
  },
};
