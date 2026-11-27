// Módulo 7 · Mantenimiento (E13, E14, E42–E45) · Prueba P09
import { api, seg } from '../api.js';
import {
  h, tarjeta, tabla, chipOperacion, campo, conCarga, confirmar,
  mostrarResultado, mensajeError, fechaHora, avisar,
} from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

const PAGINA_HISTORIAL = 20;

function etiquetaOperacion(tipo) {
  return tipo === 'VACUUM' ? 'VACUUM (ANALYZE)' : (tipo || '—');
}

function cuadroEstadisticas(registro, vacio) {
  if (!registro) return h('p', { class: 'vacio' }, vacio);
  const filas = [
    { campo: 'Esquema', valor: registro.schema },
    { campo: 'Tabla', valor: registro.name },
    { campo: 'Filas vivas estimadas', valor: registro.estimatedLiveRows },
    { campo: 'Filas muertas estimadas', valor: registro.estimatedDeadRows },
    { campo: 'Último VACUUM', valor: fechaHora(registro.lastVacuum) },
    { campo: 'Último autovacuum', valor: fechaHora(registro.lastAutovacuum) },
    { campo: 'Último ANALYZE', valor: fechaHora(registro.lastAnalyze) },
    { campo: 'Último autoanalyze', valor: fechaHora(registro.lastAutoanalyze) },
    { campo: 'Veces analizada', valor: registro.analyzeCount ?? 0 },
    { campo: 'Veces vacuum', valor: registro.vacuumCount ?? 0 },
  ];
  return h('dl', { class: 'datos' }, filas.map((f) => [h('dt', {}, f.campo), h('dd', {}, f.valor ?? '—')]));
}

export default {
  id: 'mantenimiento',
  menu: 'Mantenimiento',
  titulo: 'Mantenimiento',
  descripcion: 'Actualiza las estadísticas de tablas con ANALYZE o VACUUM (ANALYZE).',

  render(contenedor) {
    let idMontado = null;
    let vivo = true;

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
      pantalla(s);
    }

    function pantalla(s) {
      const base = s.database;
      const selEsquema = h('select', { required: true }, h('option', { value: 'medistock' }, 'medistock'));
      const selTabla = h('select', { required: true }, h('option', { value: 'ventas' }, 'ventas'));
      const selOperacion = h('select', {},
        h('option', { value: 'ANALYZE' }, 'ANALYZE'),
        h('option', { value: 'VACUUM' }, 'VACUUM (ANALYZE)'));
      const btnEjecutar = h('button', { type: 'button', class: 'btn btn-primario' }, 'Ejecutar mantenimiento');
      const zonaAntes = h('div', {}, h('p', { class: 'vacio' }, 'Selecciona una tabla para consultar sus estadísticas.'));
      const zonaDespues = h('div', {}, h('p', { class: 'vacio' }, 'Las estadísticas posteriores aparecerán al terminar una operación.'));
      const zonaResultado = h('div');
      const zonaHistorial = h('div', {}, h('p', { class: 'vacio' }, 'Cargando mantenimientos…'));
      const notaFilas = h('p', { class: 'campo-ayuda' },
        'Antes del primer ANALYZE, PostgreSQL puede mostrar 0 filas vivas estimadas aunque la tabla tenga registros.');

      function rutaBase() {
        return `/api/v1/servers/${s.id}/databases/${seg(base)}`;
      }

      async function cargarEsquemas() {
        selEsquema.disabled = true;
        try {
          const lista = await api.get(`${rutaBase()}/schemas`);
          if (!vivo || idMontado !== s.id) return;
          const nombres = (lista || []).map((x) => x.name)
            .filter((n) => n && !n.startsWith('pg_') && n !== 'information_schema');
          selEsquema.replaceChildren(...nombres.map((n) => h('option', { value: n }, n)));
          selEsquema.value = nombres.includes('medistock') ? 'medistock' : (nombres[0] || '');
          if (selEsquema.value) await cargarTablas();
          else {
            selTabla.replaceChildren();
            zonaAntes.replaceChildren(h('p', { class: 'vacio' }, 'No hay esquemas disponibles.'));
          }
        } catch (e) {
          zonaAntes.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        } finally { selEsquema.disabled = false; }
      }

      async function cargarTablas() {
        const esquema = selEsquema.value;
        if (!esquema) return;
        selTabla.disabled = true;
        try {
          const lista = await api.get(`${rutaBase()}/tables?schema=${seg(esquema)}`);
          if (!vivo || idMontado !== s.id) return;
          const nombres = (lista || []).map((x) => x.name).filter(Boolean);
          selTabla.replaceChildren(...nombres.map((n) => h('option', { value: n }, n)));
          selTabla.value = nombres.includes('ventas') ? 'ventas' : (nombres[0] || '');
          zonaDespues.replaceChildren(h('p', { class: 'vacio' }, 'Las estadísticas posteriores aparecerán al terminar una operación.'));
          if (selTabla.value) await cargarEstadisticasAntes();
          else zonaAntes.replaceChildren(h('p', { class: 'vacio' }, `No hay tablas en ${esquema}.`));
        } catch (e) {
          zonaAntes.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        } finally { selTabla.disabled = false; }
      }

      async function cargarEstadisticasAntes() {
        if (!selEsquema.value || !selTabla.value) return;
        zonaAntes.replaceChildren(h('p', { class: 'vacio' }, 'Consultando estadísticas…'));
        try {
          const q = new URLSearchParams({ schema: selEsquema.value, table: selTabla.value });
          const lista = await api.get(`${rutaBase()}/maintenance/statistics?${q}`);
          if (!vivo || idMontado !== s.id) return;
          zonaAntes.replaceChildren(cuadroEstadisticas((lista || [])[0], 'El backend no devolvió estadísticas para esta tabla.'));
        } catch (e) {
          zonaAntes.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        }
      }

      async function cargarHistorial() {
        zonaHistorial.replaceChildren(h('p', { class: 'vacio' }, 'Cargando mantenimientos…'));
        try {
          const pagina = await api.get(`/api/v1/servers/${s.id}/maintenance/history?limit=${PAGINA_HISTORIAL}&offset=0`);
          if (!vivo || idMontado !== s.id) return;
          const items = Array.isArray(pagina) ? pagina : (pagina.items || []);
          zonaHistorial.replaceChildren(tabla([
            { titulo: 'Fecha', valor: (r) => fechaHora(r.createdAt) },
            { titulo: 'Tipo', valor: (r) => etiquetaOperacion(r.operationType) },
            { titulo: 'Objeto', valor: (r) => r.targetObject || '—', clase: 'mono' },
            { titulo: 'Usuario', valor: (r) => r.executedBy || '—' },
            { titulo: 'Estado', valor: (r) => chipOperacion(r.status) },
          ], items, { vacio: 'Todavía no hay mantenimientos registrados.' }));
        } catch (e) {
          zonaHistorial.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        }
      }

      btnEjecutar.addEventListener('click', () => conCarga(btnEjecutar, async () => {
        const esquema = selEsquema.value;
        const tablaElegida = selTabla.value;
        const operacion = selOperacion.value;
        if (!esquema || !tablaElegida) {
          mostrarResultado(zonaResultado, { ok: false, titulo: 'Falta elegir una tabla', detalle: 'Selecciona esquema y tabla.' });
          return;
        }
        const titulo = operacion === 'ANALYZE' ? 'Ejecutar ANALYZE' : 'Ejecutar VACUUM (ANALYZE)';
        const explicacion = operacion === 'ANALYZE'
          ? 'ANALYZE actualiza las estadísticas que usa el optimizador de consultas.'
          : 'VACUUM (ANALYZE) recupera espacio reutilizable y actualiza las estadísticas de la tabla.';
        const si = await confirmar(titulo,
          `${explicacion}\n\nServidor: ${s.name} · Base: ${base} · Tabla: ${esquema}.${tablaElegida}`,
          { textoBoton: 'Ejecutar' });
        if (!si) return;

        zonaResultado.replaceChildren();
        zonaDespues.replaceChildren(h('p', { class: 'vacio' }, 'Operación en curso…'));
        try {
          const endpoint = operacion === 'ANALYZE' ? 'analyze' : 'vacuum';
          const resultado = await api.post(`${rutaBase()}/maintenance/${endpoint}`, {
            confirmed: true, schema: esquema, table: tablaElegida,
          });
          const estadisticas = resultado.statistics || [];
          zonaDespues.replaceChildren(cuadroEstadisticas(estadisticas[0], 'La operación terminó, pero no devolvió estadísticas.'));
          mostrarResultado(zonaResultado, {
            ok: true,
            titulo: `${etiquetaOperacion(resultado.operation || operacion)} completado en ${esquema}.${tablaElegida}`,
            detalle: h('span', {},
              resultado.description || 'Operación finalizada.',
              resultado.completedAt ? ` · ${fechaHora(resultado.completedAt)}` : ''),
          });
          avisar(`${etiquetaOperacion(resultado.operation || operacion)} completado`, 'ok');
          await cargarHistorial();
        } catch (e) {
          zonaDespues.replaceChildren(h('p', { class: 'vacio' }, 'No hay estadísticas posteriores porque la operación falló.'));
          mostrarResultado(zonaResultado, { ok: false, titulo: 'No se pudo completar el mantenimiento', detalle: mensajeError(e) });
        }
      }));

      selEsquema.addEventListener('change', () => {
        zonaAntes.replaceChildren(h('p', { class: 'vacio' }, 'Cargando tablas…'));
        cargarTablas();
      });
      selTabla.addEventListener('change', () => {
        zonaDespues.replaceChildren(h('p', { class: 'vacio' }, 'Las estadísticas posteriores aparecerán al terminar una operación.'));
        cargarEstadisticasAntes();
      });

      contenedor.append(
        tarjeta('Ejecutar mantenimiento',
          h('p', { class: 'campo-ayuda' }, `Servidor: ${s.name} · Base: ${base}`),
          h('div', { class: 'formulario' },
            h('div', { class: 'fila-campos fila-3' },
              campo('Esquema', selEsquema), campo('Tabla', selTabla), campo('Operación', selOperacion)),
            notaFilas,
            h('div', { class: 'acciones' }, btnEjecutar),
            zonaResultado)),
        h('div', { class: 'rejilla-2' },
          tarjeta('Estadísticas antes', zonaAntes),
          tarjeta('Estadísticas después', zonaDespues)),
        tarjeta('Mantenimientos realizados', zonaHistorial));

      cargarEsquemas();
      cargarHistorial();
    }

    montar();
    const quitarOyente = alCambiar(() => {
      const s = servidorActivo();
      if ((s ? s.id : null) !== idMontado) montar();
    });
    return () => { vivo = false; quitarOyente(); };
  },
};
