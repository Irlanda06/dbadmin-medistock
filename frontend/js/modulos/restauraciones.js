// Módulo 4 · Restauraciones verificadas (E25–E29) · Prueba P05
// Restaura un respaldo exitoso en una base NUEVA de prueba (nunca sobre medistock)
// y verifica qué tablas quedaron y cuántas filas tiene cada una.
import { api } from '../api.js';
import {
  h, tarjeta, tabla, campo, conCarga, confirmar, avisar, mostrarResultado, mensajeError,
  fechaHora, esperarHasta, chipOperacion, formatoBytes, marcaTiempo, parametrosRuta,
} from '../ui.js';
import { estado, recargarServidores } from '../estado.js';

const NOMBRE_VALIDO = /^[a-z_][a-z0-9_]{0,62}$/;

export default {
  id: 'restauraciones',
  menu: 'Restauraciones',
  titulo: 'Restauraciones verificadas',
  descripcion: 'Restaura un respaldo en una base nueva de prueba y verifica tablas y recuentos.',

  render(contenedor) {
    let vivo = true;
    let temporizadorLista = null;
    let respaldos = [];

    const selRespaldo = h('select');
    const selDestino = h('select');
    const inBase = h('input', { type: 'text', maxlength: '63', value: `medistock_prueba_${marcaTiempo()}` });
    const btnValidar = h('button', { type: 'button', class: 'btn' }, 'Validar');
    const btnRestaurar = h('button', { type: 'button', class: 'btn btn-primario' }, 'Restaurar');
    const zonaResultado = h('div');
    const zonaVerificacion = h('div');

    const nombreServidor = (id) => estado.servidores.find((s) => s.id === id)?.name || `#${id}`;
    const describirRespaldo = (r) => {
      const alcance = r.scope === 'DATABASE' ? r.database : r.scope === 'SCHEMA' ? `esquema ${r.schema}` : `${r.schema}.${r.table}`;
      return `#${r.id} · ${nombreServidor(r.serverId)} · ${alcance} · ${r.format} · ${formatoBytes(r.sizeBytes)} · ${fechaHora(r.createdAt)}`;
    };

    function leer() {
      const base = inBase.value.trim();
      if (!selRespaldo.value) throw new Error('No hay respaldos exitosos. Genera uno en Respaldos.');
      if (!NOMBRE_VALIDO.test(base)) throw new Error('Nombre de base inválido: usa minúsculas, números y guion bajo (empieza con letra).');
      if (['medistock', 'postgres', 'template0', 'template1'].includes(base)) throw new Error('Esa es una base operativa: usa un nombre nuevo de prueba.');
      return { backupId: Number(selRespaldo.value), targetServerId: Number(selDestino.value), targetDatabase: base };
    }

    // E25 · Validar sin ejecutar
    btnValidar.addEventListener('click', () => conCarga(btnValidar, async () => {
      try {
        const cuerpo = leer();
        const r = await api.post('/api/v1/restores/validate', cuerpo);
        mostrarResultado(zonaResultado, {
          ok: true, titulo: 'Validación correcta: se puede restaurar',
          detalle: `La base ${r.targetDatabase} no existe en ${nombreServidor(r.targetServerId)} y el archivo coincide con su SHA-256.${r.warning ? ' ⚠ ' + r.warning : ''}`,
        });
      } catch (e) {
        mostrarResultado(zonaResultado, { ok: false, titulo: 'No pasó la validación', detalle: mensajeError(e) });
      }
    }));

    // E26 · Restaurar → esperar → E29 verificación
    btnRestaurar.addEventListener('click', () => conCarga(btnRestaurar, async () => {
      let cuerpo;
      try { cuerpo = leer(); } catch (e) { mostrarResultado(zonaResultado, { ok: false, titulo: 'Revisa los datos', detalle: e.message }); return; }
      const respaldo = respaldos.find((r) => r.id === cuerpo.backupId);
      const si = await confirmar('Restaurar respaldo',
        `Se creará la base NUEVA "${cuerpo.targetDatabase}" en ${nombreServidor(cuerpo.targetServerId)} y se cargará el respaldo #${cuerpo.backupId} (${respaldo ? respaldo.fileName : ''}). La base medistock no se toca. ¿Continuar?`,
        { textoBoton: 'Restaurar' });
      if (!si) return;
      try {
        const creada = await api.post('/api/v1/restores', { ...cuerpo, confirmed: true });
        const final = await esperarHasta(() => api.get(`/api/v1/restores/${creada.id}`), {
          alAvanzar: (r) => mostrarResultado(zonaResultado, { ok: true, titulo: `Restauración #${r.id}: ${r.status === 'RUNNING' ? 'cargando datos…' : 'en cola…'}` }),
        });
        if (final.status === 'SUCCEEDED') {
          mostrarResultado(zonaResultado, { ok: true, titulo: `Restauración #${final.id} terminada en ${final.targetDatabase}` });
          avisar('Restauración verificada', 'ok');
          mostrarVerificacion(final);
          inBase.value = `medistock_prueba_${marcaTiempo()}`;
        } else {
          let op = null;
          try { op = await api.get(`/api/v1/history/${final.operationId}`); } catch { /* opcional */ }
          mostrarResultado(zonaResultado, {
            ok: false, titulo: `La restauración #${final.id} falló`,
            detalle: `${op ? `${op.errorMessage} [${op.errorCode}]` : 'Revisa el historial.'}${final.verification?.warning ? ' · ' + final.verification.warning : ''}`,
          });
        }
        cargarLista();
      } catch (e) {
        mostrarResultado(zonaResultado, { ok: false, titulo: 'No se pudo iniciar la restauración', detalle: mensajeError(e) });
      }
    }));

    function mostrarVerificacion(rest) {
      const v = rest.verification;
      if (!v || !v.tables) {
        zonaVerificacion.replaceChildren(h('p', { class: 'vacio' }, 'Esta restauración no tiene verificación (no terminó con éxito).'));
        return;
      }
      zonaVerificacion.replaceChildren(
        h('div', { class: 'detalle-encabezado' },
          h('h3', { class: 'detalle-titulo' }, v.database),
          h('span', { class: 'campo-ayuda' }, `restauración #${rest.id} · ${nombreServidor(rest.targetServerId)} · ${v.tableCount} tabla(s)`)),
        tabla([
          { titulo: 'Esquema', valor: (t) => t.schema, clase: 'mono' },
          { titulo: 'Tabla', valor: (t) => t.name, clase: 'mono' },
          { titulo: 'Filas restauradas', valor: (t) => t.rowCount },
        ], v.tables));
    }

    // ---------- Lista de restauraciones (E27) ----------
    const zonaLista = h('div');
    async function cargarLista() {
      clearTimeout(temporizadorLista);
      try {
        const pagina = await api.get('/api/v1/restores?limit=50');
        const items = Array.isArray(pagina) ? pagina : (pagina.items || []);
        zonaLista.replaceChildren(tabla([
          { titulo: '#', valor: (r) => r.id },
          { titulo: 'Fecha', valor: (r) => fechaHora(r.createdAt) },
          { titulo: 'Respaldo', valor: (r) => `#${r.backupId}` },
          { titulo: 'Destino', valor: (r) => nombreServidor(r.targetServerId) },
          { titulo: 'Base nueva', valor: (r) => r.targetDatabase, clase: 'mono' },
          { titulo: 'Estado', valor: (r) => chipOperacion(r.status) },
          { titulo: 'Verificación', clase: 'acciones-fila', valor: (r) => (r.status === 'SUCCEEDED'
            ? h('button', {
              class: 'btn btn-chico',
              onclick: async () => {
                try { const v = await api.get(`/api/v1/restores/${r.id}/verification`); mostrarVerificacion({ ...r, verification: v.verification }); } catch (e) { avisar(mensajeError(e), 'error'); }
              },
            }, 'Ver tablas')
            : '—') },
        ], items, { vacio: 'Todavía no hay restauraciones.' }));
        if (vivo && items.some((r) => r.status === 'QUEUED' || r.status === 'RUNNING')) temporizadorLista = setTimeout(cargarLista, 2000);
      } catch (e) {
        zonaLista.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
      }
    }

    // ---------- Carga inicial ----------
    async function iniciar() {
      if (!estado.servidores.length) await recargarServidores();
      selDestino.replaceChildren(...estado.servidores.map((s) => h('option', { value: String(s.id) }, s.name)));
      const pagina = await api.get('/api/v1/backups?status=SUCCEEDED&limit=100');
      respaldos = Array.isArray(pagina) ? pagina : (pagina.items || []);
      selRespaldo.replaceChildren(...(respaldos.length
        ? respaldos.map((r) => h('option', { value: String(r.id) }, describirRespaldo(r)))
        : [h('option', { value: '' }, 'No hay respaldos exitosos todavía')]));
      const pedido = parametrosRuta().backup;
      if (pedido && respaldos.some((r) => String(r.id) === pedido)) selRespaldo.value = pedido;
      // Por defecto, restaurar en el OTRO nodo (respaldo de Norte → prueba en Sur).
      const r = respaldos.find((x) => String(x.id) === selRespaldo.value);
      const otro = r && estado.servidores.find((s) => s.id !== r.serverId);
      if (otro) selDestino.value = String(otro.id);
    }

    contenedor.append(
      h('div', { class: 'rejilla-2' },
        h('section', { class: 'tarjeta' },
          h('h2', { class: 'tarjeta-titulo' }, 'Nueva restauración'),
          h('div', { class: 'formulario' },
            campo('Respaldo', selRespaldo, 'Solo aparecen respaldos que terminaron con éxito.'),
            h('div', { class: 'fila-campos' },
              campo('Servidor destino', selDestino),
              campo('Base nueva de prueba', inBase, 'Debe NO existir; se crea vacía y se carga el respaldo.')),
            h('div', { class: 'acciones' }, btnValidar, btnRestaurar),
            zonaResultado)),
        tarjeta('Verificación de la base restaurada',
          zonaVerificacion.childElementCount ? zonaVerificacion : (zonaVerificacion.append(h('p', { class: 'vacio' }, 'Aquí aparecen las tablas y sus filas al terminar una restauración.')), zonaVerificacion))),
      tarjeta('Restauraciones realizadas',
        h('div', { class: 'acciones acciones-izq' }, h('button', { class: 'btn btn-chico', onclick: () => cargarLista() }, 'Actualizar')),
        zonaLista));

    iniciar().catch((e) => avisar(mensajeError(e), 'error'));
    cargarLista();
    return () => { vivo = false; clearTimeout(temporizadorLista); };
  },
};
