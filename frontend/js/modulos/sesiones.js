// Módulo 8 · Sesiones y bloqueos (E46–E48) · Prueba P10
// Muestra quién está conectado (pg_stat_activity) y, si una sesión espera a otra,
// cuál es el PID BLOQUEADO y cuál el PID BLOQUEADOR (pg_blocking_pids).
import { api } from '../api.js';
import { h, tarjeta, tabla, chip, avisar, mensajeError } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

const INTERVALO_MS = 3000;

const ESTADOS = {
  active: ['Ejecutando', 'info'],
  idle: ['Inactiva', 'neutro'],
  'idle in transaction': ['Transacción abierta', 'aviso'],
  'idle in transaction (aborted)': ['Transacción abortada', 'error'],
};

function duracion(seg) {
  if (seg === null || seg === undefined) return '—';
  if (seg < 60) return `${seg.toFixed(1)} s`;
  const m = Math.floor(seg / 60);
  return `${m} min ${Math.round(seg % 60)} s`;
}

function consultaCorta(q, max = 90) {
  if (!q) return '—';
  const limpia = q.replace(/\s+/g, ' ').trim();
  return limpia.length > max ? limpia.slice(0, max) + '…' : limpia;
}

export default {
  id: 'sesiones',
  menu: 'Sesiones y bloqueos',
  titulo: 'Sesiones y bloqueos',
  descripcion: 'Consulta pg_stat_activity e identifica qué sesión bloquea a cuál.',

  render(contenedor) {
    let idMontado = null;
    let temporizador = null;

    function montar() {
      clearInterval(temporizador);
      const s = servidorActivo();
      idMontado = s ? s.id : null;
      contenedor.replaceChildren();
      if (!s) {
        contenedor.append(tarjeta('Sin servidor activo',
          h('p', {}, 'Elige un servidor en el selector de arriba, o ve a ',
            h('a', { href: '#/conexiones' }, 'Conexiones'), ' y dale "Conectar".')));
        return;
      }
      pantalla(s);
    }

    function pantalla(s) {
      const zonaBloqueos = h('div');
      const zonaSesiones = h('div');
      const zonaDetalle = h('div');
      const chkAuto = h('input', { type: 'checkbox', checked: true });
      const chkSoloBase = h('input', { type: 'checkbox', checked: true });
      const marcaHora = h('span', { class: 'campo-ayuda' });
      let involucrados = new Map(); // pid → 'bloqueado' | 'bloqueador'

      // ---------- Bloqueos (E48) ----------
      async function cargarBloqueos() {
        const lista = await api.get(`/api/v1/servers/${s.id}/locks`) || [];
        involucrados = new Map();
        lista.forEach((b) => { involucrados.set(b.blockedPid, 'bloqueado'); if (!involucrados.has(b.blockingPid)) involucrados.set(b.blockingPid, 'bloqueador'); });
        if (!lista.length) {
          zonaBloqueos.replaceChildren(h('div', { class: 'resultado resultado-ok' },
            h('strong', {}, '✓ Sin bloqueos'),
            h('div', { class: 'resultado-detalle' }, 'Ninguna sesión está esperando a otra en este momento.')));
          return;
        }
        zonaBloqueos.replaceChildren(
          h('div', { class: 'resultado resultado-error' },
            h('strong', {}, `✗ ${lista.length} sesión(es) bloqueada(s)`),
            h('div', { class: 'resultado-detalle' }, 'La sesión de la izquierda no puede avanzar hasta que la de la derecha termine su transacción (COMMIT o ROLLBACK).')),
          ...lista.map((b) => h('div', { class: 'cadena-bloqueo' },
            h('div', { class: 'caja-bloqueo caja-bloqueada' },
              h('div', {}, chip('BLOQUEADO', 'error'), h('strong', { class: 'mono' }, ` PID ${b.blockedPid}`), ` · ${b.blockedUser || '—'}`),
              h('div', { class: 'campo-ayuda' }, `esperando ${duracion(b.waitQuerySeconds)} · ${b.waitEvent || 'lock'}`),
              h('code', {}, consultaCorta(b.blockedQuery, 140))),
            h('div', { class: 'flecha-bloqueo' }, 'espera a ►'),
            h('div', { class: 'caja-bloqueo caja-bloqueadora' },
              h('div', {}, chip('BLOQUEADOR', 'aviso'), h('strong', { class: 'mono' }, ` PID ${b.blockingPid}`), ` · ${b.blockingUser || '—'}`),
              h('div', { class: 'campo-ayuda' }, 'tiene la transacción abierta; su última consulta fue:'),
              h('code', {}, consultaCorta(b.blockingQuery, 140))))));
      }

      // ---------- Sesiones (E46) y detalle (E47) ----------
      async function cargarSesiones() {
        let lista = await api.get(`/api/v1/servers/${s.id}/sessions`) || [];
        if (chkSoloBase.checked) lista = lista.filter((x) => x.database === s.database);
        zonaSesiones.replaceChildren(tabla([
          { titulo: 'PID', valor: (x) => h('span', { class: 'mono' }, String(x.pid)) },
          { titulo: '', valor: (x) => (involucrados.get(x.pid) === 'bloqueado' ? chip('Bloqueada', 'error')
            : involucrados.get(x.pid) === 'bloqueador' ? chip('Bloqueadora', 'aviso') : '') },
          { titulo: 'Usuario', valor: (x) => x.username || '—', clase: 'mono' },
          { titulo: 'Base', valor: (x) => x.database || '—' },
          { titulo: 'Aplicación', valor: (x) => x.applicationName || '—' },
          { titulo: 'Estado', valor: (x) => { const [t, tipo] = ESTADOS[x.state] || [x.state || '—', 'neutro']; return chip(t, tipo); } },
          { titulo: 'Espera', valor: (x) => (x.waitEventType ? `${x.waitEventType}: ${x.waitEvent}` : '—') },
          { titulo: 'Transacción', valor: (x) => duracion(x.transactionDurationSeconds) },
          { titulo: 'Consulta', valor: (x) => h('code', {}, consultaCorta(x.query)) },
          { titulo: '', clase: 'acciones-fila', valor: (x) => h('button', { class: 'btn btn-chico', onclick: () => verDetalle(x.pid) }, 'Ver') },
        ], lista, { vacio: 'No hay sesiones de clientes en esta base.' }));
      }

      async function verDetalle(pid) {
        try {
          const x = await api.get(`/api/v1/servers/${s.id}/sessions/${pid}`);
          const campos = [
            ['PID', x.pid], ['Usuario', x.username], ['Base', x.database], ['Aplicación', x.applicationName],
            ['Cliente', x.clientAddress], ['Estado', x.state], ['Evento de espera', x.waitEventType ? `${x.waitEventType}: ${x.waitEvent}` : null],
            ['Duración de la consulta', duracion(x.queryDurationSeconds)], ['Duración de la transacción', duracion(x.transactionDurationSeconds)],
          ];
          zonaDetalle.replaceChildren(
            h('dl', { class: 'datos' }, campos.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v ?? '—')])),
            h('h4', { class: 'subtitulo' }, 'Consulta completa'),
            h('pre', { class: 'mono bloque-sql' }, x.query || '—'));
        } catch (e) {
          zonaDetalle.replaceChildren(h('div', { class: 'resultado resultado-error' }, `La sesión ${pid} ya no existe o no se pudo leer: ${mensajeError(e)}`));
        }
      }

      async function actualizar() {
        try {
          await cargarBloqueos();      // primero bloqueos, para marcar las filas de sesiones
          await cargarSesiones();
          marcaHora.textContent = `Actualizado: ${new Date().toLocaleTimeString('es-MX')}`;
        } catch (e) {
          avisar(`No se pudieron leer las sesiones: ${mensajeError(e)}`, 'error');
        }
      }

      function programar() {
        clearInterval(temporizador);
        temporizador = chkAuto.checked ? setInterval(actualizar, INTERVALO_MS) : null;
      }
      chkAuto.addEventListener('change', programar);
      chkSoloBase.addEventListener('change', actualizar);

      // ---------- Guía para provocar el bloqueo en la demo ----------
      const guia = h('ol', { class: 'guia-pasos' },
        h('li', {}, 'En pgAdmin abre DOS Query Tool sobre ', h('strong', {}, `${s.name} → ${s.database}`), '.'),
        h('li', {}, h('strong', {}, 'Sesión A'), ' (deja la transacción abierta, sin COMMIT):',
          h('pre', { class: 'mono bloque-sql' }, 'BEGIN;\nUPDATE medistock.inventario\n   SET existencia = existencia\n WHERE id_medicamento = 1;')),
        h('li', {}, h('strong', {}, 'Sesión B'), ' (se queda "esperando", el spinner no termina):',
          h('pre', { class: 'mono bloque-sql' }, 'UPDATE medistock.inventario\n   SET existencia = existencia\n WHERE id_medicamento = 1;')),
        h('li', {}, 'Aquí arriba aparece: PID de B ', h('strong', {}, 'BLOQUEADO'), ' → espera a → PID de A ', h('strong', {}, 'BLOQUEADOR'), '.'),
        h('li', {}, 'En la sesión A ejecuta ', h('code', {}, 'ROLLBACK;'), ': B termina al instante y el bloqueo desaparece. ',
          h('span', { class: 'campo-ayuda' }, '(SET existencia = existencia no cambia ningún dato.)')));

      contenedor.append(
        tarjeta('Bloqueos', h('div', { class: 'acciones acciones-izq' },
          h('button', { class: 'btn btn-chico', onclick: () => actualizar() }, 'Actualizar ahora'),
          h('label', { class: 'interruptor' }, chkAuto, ` Actualizar cada ${INTERVALO_MS / 1000} s`),
          marcaHora), zonaBloqueos),
        tarjeta('Sesiones activas',
          h('div', { class: 'acciones acciones-izq' }, h('label', { class: 'interruptor' }, chkSoloBase, ` Solo la base ${s.database}`)),
          zonaSesiones),
        h('div', { class: 'rejilla-2' },
          tarjeta('Detalle de la sesión', zonaDetalle.childElementCount ? zonaDetalle
            : (zonaDetalle.append(h('p', { class: 'vacio' }, 'Dale "Ver" a una sesión.')), zonaDetalle)),
          tarjeta('Cómo provocar un bloqueo (P10)', guia)));

      actualizar();
      programar();
    }

    montar();
    const quitar = alCambiar(() => {
      const s = servidorActivo();
      if ((s ? s.id : null) !== idMontado) montar();
    });
    return () => { clearInterval(temporizador); quitar(); };
  },
};
