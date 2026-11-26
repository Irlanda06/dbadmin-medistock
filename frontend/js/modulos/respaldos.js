// Módulo 3 · Respaldos configurables (E21–E24) · Pruebas P03 y P04
// Elegir servidor, base, alcance (base, esquema o tabla), formato (custom o plain) y archivo.
// El backend corre pg_dump en segundo plano; aquí se espera el resultado y se muestra el archivo real.
import { api, seg } from '../api.js';
import { CONFIG } from '../config.js';
import {
  h, tarjeta, tabla, chip, campo, conCarga, confirmar, avisar, mostrarResultado, mensajeError,
  fechaHora, esperarHasta, chipOperacion, formatoBytes, slug, marcaTiempo,
} from '../ui.js';
import { estado, servidorActivo, recargarServidores } from '../estado.js';

const ALCANCES = { DATABASE: 'Base completa', SCHEMA: 'Un esquema', TABLE: 'Una tabla' };
const FORMATOS = { CUSTOM: 'Custom (.dump) — se restaura con pg_restore', PLAIN: 'Plain SQL (.sql) — texto legible' };

export default {
  id: 'respaldos',
  menu: 'Respaldos',
  titulo: 'Respaldos configurables',
  descripcion: 'Genera respaldos reales con pg_dump eligiendo servidor, alcance, formato y archivo.',

  render(contenedor) {
    let vivo = true;
    let temporizadorLista = null;

    // ---------- Formulario ----------
    const selServidor = h('select');
    const inBase = h('input', { type: 'text', value: 'medistock', maxlength: '63' });
    const selAlcance = h('select', {}, Object.entries(ALCANCES).map(([v, t]) => h('option', { value: v }, t)));
    const selEsquema = h('select');
    const selTabla = h('select');
    const selFormato = h('select', {}, Object.entries(FORMATOS).map(([v, t]) => h('option', { value: v }, t)));
    const inArchivo = h('input', { type: 'text', maxlength: '120' });
    const inCarpeta = h('input', { type: 'text', maxlength: '200', placeholder: '(opcional) p. ej. practicas' });
    const campoEsquema = campo('Esquema', selEsquema);
    const campoTabla = campo('Tabla', selTabla);
    const btnGenerar = h('button', { type: 'button', class: 'btn btn-primario' }, 'Generar respaldo');
    const zonaResultado = h('div');

    function servidorElegido() { return estado.servidores.find((s) => s.id === Number(selServidor.value)) || null; }
    const extension = () => (selFormato.value === 'CUSTOM' ? '.dump' : '.sql');

    function nombreSugerido() {
      const s = servidorElegido();
      const objeto = selAlcance.value === 'DATABASE' ? inBase.value
        : selAlcance.value === 'SCHEMA' ? selEsquema.value : selTabla.value;
      return `${slug(s ? s.name : 'servidor')}_${slug(objeto || 'respaldo')}_${marcaTiempo()}${extension()}`;
    }

    function actualizarVisibles() {
      campoEsquema.hidden = selAlcance.value === 'DATABASE';
      campoTabla.hidden = selAlcance.value !== 'TABLE';
      inArchivo.value = nombreSugerido();
    }

    function llenarServidores() {
      const activo = servidorActivo();
      selServidor.replaceChildren(...estado.servidores.map((s) => h('option', { value: String(s.id) }, `${s.name} (${s.host}:${s.port})`)));
      if (activo) selServidor.value = String(activo.id);
      const s = servidorElegido();
      if (s) inBase.value = s.database;
    }

    // Esquemas (E13) y tablas (E14) del servidor elegido, para no escribirlos a mano.
    async function cargarEsquemas() {
      const s = servidorElegido();
      if (!s) return;
      try {
        const lista = await api.get(`/api/v1/servers/${s.id}/databases/${seg(inBase.value)}/schemas`);
        const nombres = (lista || []).map((x) => x.name).filter((n) => !n.startsWith('pg_') && n !== 'information_schema');
        selEsquema.replaceChildren(...nombres.map((n) => h('option', { value: n }, n)));
        if (nombres.includes('medistock')) selEsquema.value = 'medistock';
      } catch {
        selEsquema.replaceChildren(h('option', { value: 'medistock' }, 'medistock'));
      }
      await cargarTablas();
    }
    async function cargarTablas() {
      const s = servidorElegido();
      if (!s || !selEsquema.value) return;
      try {
        const lista = await api.get(`/api/v1/servers/${s.id}/databases/${seg(inBase.value)}/tables?schema=${seg(selEsquema.value)}`);
        selTabla.replaceChildren(...(lista || []).map((t) => h('option', { value: t.name }, t.name)));
        if ((lista || []).some((t) => t.name === 'inventario')) selTabla.value = 'inventario';
      } catch {
        selTabla.replaceChildren(h('option', { value: 'inventario' }, 'inventario'));
      }
      actualizarVisibles();
    }

    selServidor.addEventListener('change', () => { const s = servidorElegido(); if (s) inBase.value = s.database; cargarEsquemas(); });
    inBase.addEventListener('change', cargarEsquemas);
    selAlcance.addEventListener('change', actualizarVisibles);
    selEsquema.addEventListener('change', cargarTablas);
    selTabla.addEventListener('change', () => { inArchivo.value = nombreSugerido(); });
    selFormato.addEventListener('change', () => { inArchivo.value = inArchivo.value.replace(/\.(dump|sql)$/i, '') + extension(); });

    // E21 · Crear respaldo → esperar → mostrar resultado
    btnGenerar.addEventListener('click', () => conCarga(btnGenerar, async () => {
      const s = servidorElegido();
      if (!s) { mostrarResultado(zonaResultado, { ok: false, titulo: 'Elige un servidor', detalle: 'Registra Norte y Sur en Conexiones.' }); return; }
      const cuerpo = {
        confirmed: true,
        serverId: s.id,
        database: inBase.value.trim(),
        scope: selAlcance.value,
        format: selFormato.value,
        fileName: inArchivo.value.trim() || undefined,
        directory: inCarpeta.value.trim() || undefined,
      };
      if (cuerpo.scope !== 'DATABASE') cuerpo.schema = selEsquema.value;
      if (cuerpo.scope === 'TABLE') cuerpo.table = selTabla.value;

      const objeto = cuerpo.scope === 'DATABASE' ? `la base ${cuerpo.database}`
        : cuerpo.scope === 'SCHEMA' ? `el esquema ${cuerpo.schema}` : `la tabla ${cuerpo.schema}.${cuerpo.table}`;
      const si = await confirmar('Generar respaldo',
        `Se respaldará ${objeto} de ${s.name} en formato ${cuerpo.format} como "${cuerpo.fileName || 'nombre automático'}". ¿Continuar?`,
        { textoBoton: 'Generar' });
      if (!si) return;

      try {
        const creado = await api.post('/api/v1/backups', cuerpo);
        const final = await esperarHasta(() => api.get(`/api/v1/backups/${creado.id}`), {
          alAvanzar: (r) => mostrarResultado(zonaResultado, { ok: true, titulo: `Respaldo #${r.id}: ${r.status === 'RUNNING' ? 'pg_dump en ejecución…' : 'en cola…'}` }),
        });
        let operacion = null;
        try { operacion = await api.get(`/api/v1/history/${final.operationId}`); } catch { /* opcional */ }
        if (final.status === 'SUCCEEDED') {
          mostrarResultado(zonaResultado, {
            ok: true,
            titulo: `Respaldo #${final.id} generado: ${final.fileName} (${formatoBytes(final.sizeBytes)})`,
            detalle: h('div', {},
              h('div', {}, 'Archivo en el servidor de DBAdmin: ', h('code', {}, final.filePath || '—')),
              operacion?.result?.sha256 ? h('div', {}, 'SHA-256: ', h('code', {}, operacion.result.sha256)) : null,
              h('div', { class: 'grupo-botones', style: 'margin-top:8px' },
                enlaceDescarga(final), h('a', { class: 'btn btn-chico', href: `#/restauraciones?backup=${final.id}` }, 'Restaurar en base de prueba →'))),
          });
          avisar(`Respaldo #${final.id} listo`, 'ok');
        } else {
          mostrarResultado(zonaResultado, {
            ok: false, titulo: `El respaldo #${final.id} falló`,
            detalle: operacion ? `${operacion.errorMessage || 'Sin detalle'} [${operacion.errorCode || 'ERROR'}]` : 'Revisa el historial.',
          });
        }
        inArchivo.value = nombreSugerido();
        cargarLista();
      } catch (e) {
        mostrarResultado(zonaResultado, { ok: false, titulo: 'No se pudo iniciar el respaldo', detalle: mensajeError(e) });
      }
    }));

    function enlaceDescarga(r) {
      if (CONFIG.MODO_PRUEBA || r.status !== 'SUCCEEDED') return null;
      return h('a', { class: 'btn btn-chico', href: `${CONFIG.API_BASE}/api/v1/backups/${r.id}/download`, download: r.fileName }, 'Descargar');
    }

    // ---------- Lista de respaldos (E22) ----------
    const filtroEstado = h('select', {}, h('option', { value: '' }, 'Todos los estados'),
      ...['SUCCEEDED', 'FAILED', 'RUNNING', 'QUEUED'].map((v) => h('option', { value: v }, v)));
    const zonaLista = h('div');
    filtroEstado.addEventListener('change', () => cargarLista());

    async function cargarLista() {
      clearTimeout(temporizadorLista);
      try {
        const q = filtroEstado.value ? `&status=${filtroEstado.value}` : '';
        const pagina = await api.get(`/api/v1/backups?limit=50${q}`);
        const items = Array.isArray(pagina) ? pagina : (pagina.items || []);
        const nombreServidor = (id) => estado.servidores.find((s) => s.id === id)?.name || `#${id}`;
        zonaLista.replaceChildren(tabla([
          { titulo: '#', valor: (r) => r.id },
          { titulo: 'Fecha', valor: (r) => fechaHora(r.createdAt) },
          { titulo: 'Servidor', valor: (r) => nombreServidor(r.serverId) },
          { titulo: 'Alcance', valor: (r) => (r.scope === 'DATABASE' ? r.database : r.scope === 'SCHEMA' ? `esquema ${r.schema}` : `${r.schema}.${r.table}`) },
          { titulo: 'Formato', valor: (r) => chip(r.format, r.format === 'CUSTOM' ? 'info' : 'neutro') },
          { titulo: 'Archivo', valor: (r) => r.fileName, clase: 'mono' },
          { titulo: 'Tamaño', valor: (r) => formatoBytes(r.sizeBytes) },
          { titulo: 'Estado', valor: (r) => chipOperacion(r.status) },
          { titulo: 'Acciones', clase: 'acciones-fila', valor: (r) => (r.status === 'SUCCEEDED'
            ? h('span', { class: 'grupo-botones' }, enlaceDescarga(r),
              h('a', { class: 'btn btn-chico btn-texto', href: `#/restauraciones?backup=${r.id}` }, 'Restaurar'))
            : '—') },
        ], items, { vacio: 'Todavía no hay respaldos.' }));
        // Mientras haya alguno en proceso, se actualiza solo.
        if (vivo && items.some((r) => r.status === 'QUEUED' || r.status === 'RUNNING')) {
          temporizadorLista = setTimeout(cargarLista, 2000);
        }
      } catch (e) {
        zonaLista.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
      }
    }

    // ---------- Armado ----------
    contenedor.append(
      h('section', { class: 'tarjeta' },
        h('h2', { class: 'tarjeta-titulo' }, 'Nuevo respaldo'),
        h('div', { class: 'formulario' },
          h('div', { class: 'fila-campos fila-3' }, campo('Servidor origen', selServidor), campo('Base de datos', inBase), campo('Alcance', selAlcance)),
          h('div', { class: 'fila-campos fila-3' }, campoEsquema, campoTabla, campo('Formato', selFormato)),
          h('div', { class: 'fila-campos' },
            campo('Nombre del archivo', inArchivo, 'Solo letras, números, guion y punto; debe terminar en .dump (custom) o .sql (plain).'),
            campo('Subcarpeta dentro de storage/backups', inCarpeta)),
          h('div', { class: 'acciones' }, btnGenerar),
          zonaResultado)),
      tarjeta('Respaldos generados',
        h('div', { class: 'acciones acciones-izq' }, filtroEstado,
          h('button', { class: 'btn btn-chico', onclick: () => cargarLista() }, 'Actualizar')),
        zonaLista));

    (estado.servidores.length ? Promise.resolve() : recargarServidores())
      .then(() => { llenarServidores(); actualizarVisibles(); return cargarEsquemas(); })
      .catch((e) => avisar(mensajeError(e), 'error'));
    cargarLista();

    return () => { vivo = false; clearTimeout(temporizadorLista); };
  },
};
