// Módulo 1 · Servidores y conexiones (E01–E11) · Pruebas P01 y P13
// Registrar, editar y eliminar perfiles; probar, conectar y desconectar;
// ver versión, base, usuario, servidor y estado; detectar caída y recuperación.
import { api } from '../api.js';
import {
  h, tarjeta, tabla, chip, campo, conCarga, confirmar, avisar,
  mostrarResultado, mensajeError, fechaHora,
} from '../ui.js';
import { estado, recargarServidores, elegirServidor, marcarConectado, alCambiar, servidorActivo } from '../estado.js';

const INTERVALO_MONITOREO_MS = 5000;

// Estados que regresa E10 en el backend real: ONLINE, UNREACHABLE, AUTH_FAILED, ERROR
const ETIQUETA_ESTADO = { ONLINE: 'En línea', UNREACHABLE: 'Caído', OFFLINE: 'Caído', AUTH_FAILED: 'Acceso denegado', ERROR: 'Error' };
function chipDeEstado(st) {
  if (!st) return chip('Sin verificar', 'neutro');
  return chip(ETIQUETA_ESTADO[st.status] || st.status, st.status === 'ONLINE' ? 'ok' : 'error');
}

export default {
  id: 'conexiones',
  menu: 'Conexiones',
  titulo: 'Servidores y conexiones',
  descripcion: 'Registra los perfiles de Norte y Sur, pruébalos, conéctate y vigila su disponibilidad.',

  render(contenedor) {
    let editandoId = null;          // id del perfil que se está editando (null = registro nuevo)
    let temporizador = null;        // monitoreo automático
    const ultimoEstado = new Map(); // id → { status, checkedAt, latencyMs, motivo }
    const bitacora = [];            // cambios de estado detectados (caídas y recuperaciones)

    // ---------- Formulario ----------
    const f = {
      name: h('input', { type: 'text', maxlength: '80', placeholder: 'MediStock Norte', required: true }),
      host: h('input', { type: 'text', maxlength: '120', placeholder: '127.0.0.1', required: true }),
      port: h('input', { type: 'number', min: '1', max: '65535', placeholder: '5451', required: true }),
      database: h('input', { type: 'text', maxlength: '63', placeholder: 'medistock', required: true }),
      username: h('input', { type: 'text', maxlength: '63', placeholder: 'adminlab', required: true }),
      password: h('input', { type: 'password', autocomplete: 'new-password' }),
      readerUsername: h('input', { type: 'text', maxlength: '63', placeholder: 'dbadmin_reader' }),
      readerPassword: h('input', { type: 'password', autocomplete: 'new-password' }),
    };
    const tituloForm = h('h2', { class: 'tarjeta-titulo' }, 'Registrar perfil');
    const ayudaPassword = h('span', { class: 'campo-ayuda' }, 'Se guarda en el backend; nunca se vuelve a mostrar.');
    const ayudaLector = h('span', { class: 'campo-ayuda' }, 'Opcional al registrar; necesaria para Consultas SQL.');
    const resultadoForm = h('div');
    const btnProbar = h('button', { type: 'button', class: 'btn' }, 'Probar sin guardar');
    const btnGuardar = h('button', { type: 'submit', class: 'btn btn-primario' }, 'Guardar perfil');
    const btnCancelar = h('button', { type: 'button', class: 'btn btn-texto', hidden: true }, 'Cancelar edición');

    const formulario = h('form', { class: 'formulario', novalidate: true },
      h('div', { class: 'fila-campos' }, campo('Nombre', f.name), campo('Host', f.host)),
      h('div', { class: 'fila-campos' }, campo('Puerto', f.port), campo('Base de datos', f.database)),
      h('div', { class: 'fila-campos' }, campo('Usuario', f.username),
        h('label', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Contraseña'), f.password, ayudaPassword)),
      h('div', { class: 'fila-campos' },
        campo('Usuario de lectura', f.readerUsername, 'Lo usan el explorador y el editor SQL (solo lectura).'),
        h('label', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Contraseña de lectura'), f.readerPassword, ayudaLector)),
      h('div', { class: 'acciones' }, btnCancelar, btnProbar, btnGuardar),
      resultadoForm);

    function leerFormulario({ exigirPassword }) {
      const datos = {
        name: f.name.value.trim(),
        host: f.host.value.trim(),
        port: Number(f.port.value),
        database: f.database.value.trim(),
        username: f.username.value.trim(),
      };
      const errores = [];
      if (!datos.name) errores.push('el nombre');
      if (!datos.host || !/^[A-Za-z0-9.\-_]+$/.test(datos.host)) errores.push('un host válido (IP o nombre, sin espacios)');
      if (!Number.isInteger(datos.port) || datos.port < 1 || datos.port > 65535) errores.push('un puerto entre 1 y 65535');
      if (!datos.database) errores.push('la base de datos');
      if (!datos.username) errores.push('el usuario');
      if (f.password.value) datos.password = f.password.value;
      else if (exigirPassword) errores.push('la contraseña');
      // Usuario de lectura: en E04, omitirlo BORRA la configuración del lector, por eso siempre se manda si existe.
      const lector = f.readerUsername.value.trim();
      if (lector) {
        datos.readerUsername = lector;
        if (f.readerPassword.value) datos.readerPassword = f.readerPassword.value;
        else if (editandoId === null || !estado.servidores.find((x) => x.id === editandoId)?.readerConfigured) {
          errores.push('la contraseña del usuario de lectura');
        }
      }
      if (errores.length) throw new Error('Falta ' + errores.join(', ') + '.');
      return datos;
    }

    function limpiarFormulario() {
      editandoId = null;
      Object.values(f).forEach((i) => { i.value = ''; });
      tituloForm.textContent = 'Registrar perfil';
      f.password.placeholder = '';
      ayudaPassword.textContent = 'Se guarda en el backend; nunca se vuelve a mostrar.';
      f.readerPassword.placeholder = '';
      ayudaLector.textContent = 'Opcional al registrar; necesaria para Consultas SQL.';
      btnCancelar.hidden = true;
    }

    function cargarEnFormulario(s) {
      editandoId = s.id;
      f.name.value = s.name; f.host.value = s.host; f.port.value = s.port;
      f.database.value = s.database; f.username.value = s.username; f.password.value = '';
      f.password.placeholder = s.passwordConfigured ? '•••••• (guardada)' : '';
      ayudaPassword.textContent = 'Déjala vacía para conservar la contraseña guardada.';
      f.readerUsername.value = s.readerUsername || '';
      f.readerPassword.value = '';
      f.readerPassword.placeholder = s.readerConfigured ? '•••••• (guardada)' : '';
      ayudaLector.textContent = s.readerConfigured ? 'Déjala vacía para conservarla.' : 'Escribe usuario y contraseña de lectura.';
      tituloForm.textContent = `Editar perfil: ${s.name}`;
      btnCancelar.hidden = false;
      resultadoForm.replaceChildren();
      f.name.focus();
    }

    btnCancelar.addEventListener('click', () => { limpiarFormulario(); resultadoForm.replaceChildren(); });

    // E06 · Probar conexión no guardada
    btnProbar.addEventListener('click', () => conCarga(btnProbar, async () => {
      try {
        const datos = leerFormulario({ exigirPassword: true });
        // E06 solo acepta host, port, database, username y password (rechaza campos extra como name)
        const { name, readerUsername, readerPassword, ...credenciales } = datos;
        const r = await api.post('/api/v1/servers/test', credenciales);
        mostrarResultado(resultadoForm, {
          ok: r.reachable !== false,
          titulo: r.reachable !== false ? 'Conexión exitosa' : 'No se pudo conectar',
          detalle: `${r.version || ''} · base ${r.database || datos.database} · usuario ${r.username || datos.username}`,
        });
      } catch (e) {
        mostrarResultado(resultadoForm, { ok: false, titulo: 'La prueba falló', detalle: mensajeError(e) });
      }
    }));

    // E03 · Registrar  /  E04 · Editar
    formulario.addEventListener('submit', (ev) => {
      ev.preventDefault();
      conCarga(btnGuardar, async () => {
        try {
          const datos = leerFormulario({ exigirPassword: editandoId === null });
          const r = editandoId === null
            ? await api.post('/api/v1/servers', datos)
            : await api.put(`/api/v1/servers/${editandoId}`, datos);
          mostrarResultado(resultadoForm, {
            ok: true,
            titulo: editandoId === null ? `Perfil "${r.name}" registrado` : `Perfil "${r.name}" actualizado`,
            detalle: `${r.host}:${r.port}/${r.database} · usuario ${r.username}`,
          });
          avisar('Perfil guardado', 'ok');
          limpiarFormulario();
          await recargarServidores();
        } catch (e) {
          mostrarResultado(resultadoForm, { ok: false, titulo: 'No se guardó el perfil', detalle: mensajeError(e) });
        }
      });
    });

    // ---------- Tabla de perfiles ----------
    const zonaTabla = h('div');

    function chipEstado(s) {
      const st = ultimoEstado.get(s.id);
      const piezas = [];
      if (estado.conectados.has(s.id)) piezas.push(chip('Conectado', 'info'));
      if (st) piezas.push(chipDeEstado(st));
      if (!piezas.length) piezas.push(chip('Sin verificar', 'neutro'));
      return h('span', { class: 'grupo-chips' }, piezas);
    }

    function pintarTabla() {
      zonaTabla.replaceChildren(tabla([
        { titulo: 'Nombre', valor: (s) => h('span', {}, s.id === estado.servidorActivoId ? h('span', { class: 'punto-activo', title: 'Servidor activo' }) : null, s.name) },
        { titulo: 'Host:puerto', valor: (s) => `${s.host}:${s.port}`, clase: 'mono' },
        { titulo: 'Base', valor: (s) => s.database },
        { titulo: 'Usuario', valor: (s) => s.username },
        { titulo: 'Contraseña', valor: (s) => (s.passwordConfigured === false ? 'Sin guardar' : 'Guardada') },
        { titulo: 'Lector', valor: (s) => (s.readerConfigured ? chip(s.readerUsername || 'Configurado', 'ok') : chip('Sin lector', 'aviso')) },
        { titulo: 'Estado', valor: chipEstado },
        { titulo: 'Acciones', valor: accionesFila, clase: 'acciones-fila' },
      ], estado.servidores, { vacio: 'Todavía no hay perfiles. Registra Norte y Sur con el formulario.' }));
    }

    function accionesFila(s) {
      const conectado = estado.conectados.has(s.id);
      const bProbar = h('button', { class: 'btn btn-chico' }, 'Probar');
      const bConectar = h('button', { class: `btn btn-chico ${conectado ? '' : 'btn-primario'}` }, conectado ? 'Desconectar' : 'Conectar');
      const bEditar = h('button', { class: 'btn btn-chico btn-texto' }, 'Editar');
      const bEliminar = h('button', { class: 'btn btn-chico btn-texto texto-peligro' }, 'Eliminar');

      // E07 · Probar conexión guardada
      bProbar.addEventListener('click', () => conCarga(bProbar, async () => {
        try {
          const r = await api.post(`/api/v1/servers/${s.id}/test`);
          avisar(`${s.name}: conexión correcta (${r.version || 'PostgreSQL'})`, 'ok');
        } catch (e) { avisar(`${s.name}: ${mensajeError(e)}`, 'error'); }
      }));

      // E08 · Conectar  /  E09 · Desconectar
      bConectar.addEventListener('click', () => conCarga(bConectar, async () => {
        try {
          if (conectado) {
            await api.post(`/api/v1/servers/${s.id}/disconnect`);
            marcarConectado(s.id, false);
            if (estado.servidorActivoId === s.id) elegirServidor(null);
            avisar(`${s.name} desconectado`, 'info');
          } else {
            await api.post(`/api/v1/servers/${s.id}/connect`);
            marcarConectado(s.id, true);
            elegirServidor(s.id);
            avisar(`${s.name} conectado y elegido como servidor activo`, 'ok');
          }
        } catch (e) { avisar(`${s.name}: ${mensajeError(e)}`, 'error'); }
      }));

      bEditar.addEventListener('click', () => cargarEnFormulario(s));

      // E05 · Eliminar (con confirmación)
      bEliminar.addEventListener('click', async () => {
        const si = await confirmar('Eliminar perfil',
          `¿Eliminar el perfil "${s.name}"? Solo se borra el perfil de DBAdmin; la base de datos y el historial no se tocan.`,
          { textoBoton: 'Eliminar', peligro: true });
        if (!si) return;
        try {
          await api.del(`/api/v1/servers/${s.id}`);
          marcarConectado(s.id, false);
          if (estado.servidorActivoId === s.id) elegirServidor(null);
          if (editandoId === s.id) limpiarFormulario();
          avisar(`Perfil "${s.name}" eliminado`, 'info');
          await recargarServidores();
        } catch (e) { avisar(mensajeError(e), 'error'); }
      });

      return h('span', { class: 'grupo-botones' }, bProbar, bConectar, bEditar, bEliminar);
    }

    // ---------- Servidor activo (E11) ----------
    const zonaActivo = h('div');

    async function pintarActivo() {
      const s = servidorActivo();
      if (!s) {
        zonaActivo.replaceChildren(h('p', { class: 'vacio' }, 'No hay servidor activo. Usa "Conectar" en la tabla o el selector de arriba.'));
        return;
      }
      zonaActivo.replaceChildren(h('p', { class: 'vacio' }, `Consultando ${s.name}…`));
      try {
        const r = await api.get(`/api/v1/servers/${s.id}/info`);
        const i = r.server || r; // el backend real regresa { profile, server: {...} }
        zonaActivo.replaceChildren(h('dl', { class: 'datos' },
          h('dt', {}, 'Perfil'), h('dd', {}, s.name),
          h('dt', {}, 'Versión'), h('dd', {}, i.version || '—'),
          h('dt', {}, 'Base'), h('dd', {}, i.database || '—'),
          h('dt', {}, 'Usuario'), h('dd', {}, i.username || '—'),
          h('dt', {}, 'Servidor'), h('dd', { class: 'mono' }, `${i.serverAddress || '—'}:${i.serverPort || '—'} (desde Windows: ${s.host}:${s.port})`),
          h('dt', {}, 'Estado'), h('dd', {}, chip(i.status === 'ONLINE' ? 'En línea' : (i.status || '—'), i.status === 'ONLINE' ? 'ok' : 'error'))));
      } catch (e) {
        zonaActivo.replaceChildren(h('div', { class: 'resultado resultado-error' },
          h('strong', {}, `✗ ${s.name} no respondió`), h('div', { class: 'resultado-detalle' }, mensajeError(e))));
      }
    }

    // ---------- Monitoreo: caída y recuperación (E10) ----------
    const zonaMonitoreo = h('div');
    const zonaBitacora = h('div');
    const btnVerificar = h('button', { class: 'btn' }, 'Verificar ahora');
    const chkAuto = h('input', { type: 'checkbox' });

    async function verificarTodos() {
      await Promise.all(estado.servidores.map(async (s) => {
        let nuevo;
        try {
          const r = await api.get(`/api/v1/servers/${s.id}/status`);
          nuevo = {
            status: r.status,
            checkedAt: r.checkedAt || new Date().toISOString(),
            latencyMs: r.latencyMs ?? null,
            motivo: (r.error && r.error.message) || r.reason || null,
          };
        } catch (e) {
          nuevo = { status: 'OFFLINE', checkedAt: new Date().toISOString(), latencyMs: null, motivo: mensajeError(e) };
        }
        const previo = ultimoEstado.get(s.id);
        if (previo && previo.status !== nuevo.status) {
          bitacora.unshift({
            fecha: nuevo.checkedAt, servidor: s.name,
            evento: nuevo.status === 'ONLINE' ? 'Recuperación detectada' : 'Caída detectada',
            ok: nuevo.status === 'ONLINE', motivo: nuevo.motivo,
          });
          avisar(`${s.name}: ${nuevo.status === 'ONLINE' ? 'se recuperó' : 'dejó de responder'}`, nuevo.status === 'ONLINE' ? 'ok' : 'error');
        }
        ultimoEstado.set(s.id, nuevo);
      }));
      pintarMonitoreo();
      pintarTabla();
    }

    function pintarMonitoreo() {
      zonaMonitoreo.replaceChildren(tabla([
        { titulo: 'Servidor', valor: (s) => s.name },
        { titulo: 'Estado', valor: (s) => chipDeEstado(ultimoEstado.get(s.id)) },
        { titulo: 'Latencia', valor: (s) => { const st = ultimoEstado.get(s.id); return st && st.latencyMs != null ? `${st.latencyMs} ms` : '—'; } },
        { titulo: 'Última comprobación', valor: (s) => fechaHora(ultimoEstado.get(s.id)?.checkedAt) },
        { titulo: 'Motivo', valor: (s) => ultimoEstado.get(s.id)?.motivo || '—' },
      ], estado.servidores, { vacio: 'No hay servidores registrados.' }));
      zonaBitacora.replaceChildren(bitacora.length
        ? tabla([
          { titulo: 'Fecha y hora', valor: (b) => fechaHora(b.fecha) },
          { titulo: 'Servidor', valor: (b) => b.servidor },
          { titulo: 'Evento', valor: (b) => chip(b.evento, b.ok ? 'ok' : 'error') },
          { titulo: 'Motivo', valor: (b) => b.motivo || '—' },
        ], bitacora)
        : h('p', { class: 'vacio' }, 'Sin cambios de estado todavía. Detén un nodo (docker compose stop nodo_sur) con la vigilancia activa para verlo aquí.'));
    }

    btnVerificar.addEventListener('click', () => conCarga(btnVerificar, verificarTodos));
    chkAuto.addEventListener('change', () => {
      clearInterval(temporizador);
      temporizador = chkAuto.checked ? setInterval(verificarTodos, INTERVALO_MONITOREO_MS) : null;
      if (chkAuto.checked) verificarTodos();
    });

    // ---------- Armado de la pantalla ----------
    contenedor.append(
      tarjeta('Perfiles de conexión', zonaTabla),
      h('div', { class: 'rejilla-2' },
        h('section', { class: 'tarjeta' }, tituloForm, formulario),
        tarjeta('Servidor activo', zonaActivo)),
      tarjeta('Disponibilidad de los nodos',
        h('div', { class: 'acciones acciones-izq' }, btnVerificar,
          h('label', { class: 'interruptor' }, chkAuto, ` Vigilar cada ${INTERVALO_MONITOREO_MS / 1000} s`)),
        zonaMonitoreo,
        h('h3', { class: 'subtitulo' }, 'Caídas y recuperaciones detectadas'),
        zonaBitacora));

    const quitarOyente = alCambiar(() => { pintarTabla(); pintarActivo(); pintarMonitoreo(); });
    pintarTabla(); pintarActivo(); pintarMonitoreo();
    recargarServidores().catch((e) => avisar(`No se pudo leer la lista de servidores: ${mensajeError(e)}`, 'error'));

    // Limpieza al salir de la pantalla
    return () => { clearInterval(temporizador); quitarOyente(); };
  },
};
