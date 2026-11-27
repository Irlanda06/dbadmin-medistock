// Módulo 5 · Usuarios, grupos y atributos · Pruebas P06 y P07.
import { api, seg } from '../api.js';
import { h, tarjeta, tabla, chip, campo, confirmar, conCarga, mostrarResultado, mensajeError } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

const nombreTipo = (rol) => (rol.login ? 'Usuario LOGIN' : 'Grupo NOLOGIN');
const textoBool = (valor) => (valor ? 'Sí' : 'No');
const miembrosDe = (respuesta) => respuesta?.members || [];

export default {
  id: 'roles',
  menu: 'Usuarios y roles',
  titulo: 'Usuarios, grupos y atributos',
  descripcion: 'Crea roles, administra atributos y gestiona membresías.',

  render(contenedor) {
    let idMontado = null;

    function montar() {
      const servidor = servidorActivo();
      idMontado = servidor?.id ?? null;
      contenedor.replaceChildren();
      if (!servidor) {
        contenedor.append(tarjeta('Sin servidor activo',
          h('p', {}, 'Elige un servidor en el selector de arriba, o ve a ',
            h('a', { href: '#/conexiones' }, 'Conexiones'), ' y dale "Conectar".')));
        return;
      }
      pantalla(servidor);
    }

    function pantalla(servidor) {
      let roles = [];
      let rolActivo = null;
      let miembros = [];
      const zonaResultado = h('div');
      const zonaRoles = h('div', {}, h('p', { class: 'vacio' }, 'Cargando roles…'));
      const zonaDetalle = h('div', {}, h('p', { class: 'vacio' }, 'Elige un usuario o grupo para consultar sus atributos.'));
      const textoServidor = h('span', { class: 'campo-ayuda' }, `Servidor: ${servidor.name} · base ${servidor.database}`);

      function mostrarResultadoOperacion(ok, titulo, detalle = '') {
        mostrarResultado(zonaResultado, { ok, titulo, detalle });
      }

      function pintarRoles() {
        if (!roles.length) {
          zonaRoles.replaceChildren(h('p', { class: 'vacio' }, 'No se encontraron usuarios ni grupos.'));
          return;
        }
        zonaRoles.replaceChildren(tabla([
          { titulo: 'Nombre', valor: (r) => r.name, clase: 'mono' },
          { titulo: 'Tipo', valor: (r) => chip(nombreTipo(r), r.login ? 'info' : 'neutro') },
          { titulo: 'Hereda', valor: (r) => textoBool(r.inherit) },
          { titulo: 'Crear bases', valor: (r) => textoBool(r.createDb) },
          { titulo: 'Crear roles', valor: (r) => textoBool(r.createRole) },
          { titulo: 'Superusuario', valor: (r) => textoBool(r.superuser) },
          { titulo: 'Acción', valor: (r) => h('button', {
            type: 'button', class: 'btn btn-chico',
            onclick: () => cargarDetalle(r.name),
          }, rolActivo?.name === r.name ? 'Seleccionado' : 'Ver / editar') },
        ], roles));
      }

      async function cargarRoles({ conservar = true } = {}) {
        zonaRoles.replaceChildren(h('p', { class: 'vacio' }, 'Cargando roles…'));
        try {
          const respuesta = await api.get(`/api/v1/servers/${servidor.id}/roles`);
          roles = Array.isArray(respuesta) ? respuesta : (respuesta?.items || []);
          const nombreAnterior = conservar ? rolActivo?.name : null;
          rolActivo = nombreAnterior ? roles.find((r) => r.name === nombreAnterior) || null : null;
          pintarRoles();
          if (rolActivo) await cargarDetalle(rolActivo.name);
          else zonaDetalle.replaceChildren(h('p', { class: 'vacio' }, 'Elige un usuario o grupo para consultar sus atributos.'));
        } catch (e) {
          roles = [];
          zonaRoles.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        }
      }

      function casilla(etiqueta, valor = false) {
        const input = h('input', { type: 'checkbox' });
        input.checked = Boolean(valor);
        return { input, nodo: h('label', { class: 'interruptor' }, input, ` ${etiqueta}`) };
      }

      async function cargarDetalle(nombre) {
        zonaDetalle.replaceChildren(h('p', { class: 'vacio' }, 'Cargando atributos…'));
        try {
          const rutaRol = `/api/v1/servers/${servidor.id}/roles/${seg(nombre)}`;
          rolActivo = await api.get(rutaRol);
          miembros = [];
          if (!rolActivo.login) {
            try {
              const r = await api.get(`${rutaRol}/members`);
              miembros = miembrosDe(r);
            } catch (e) {
              miembros = [];
              zonaResultado.replaceChildren(h('div', { class: 'resultado resultado-error' },
                h('strong', {}, 'No se pudieron cargar las membresías'),
                h('div', { class: 'resultado-detalle' }, mensajeError(e))));
            }
          }
          pintarRoles();
          pintarDetalle();
        } catch (e) {
          zonaDetalle.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        }
      }

      function pintarDetalle() {
        if (!rolActivo) return;
        const hereda = casilla('Heredar privilegios', rolActivo.inherit);
        const crearDb = casilla('Puede crear bases de datos', rolActivo.createDb);
        const crearRole = casilla('Puede crear roles', rolActivo.createRole);
        const formularioAtributos = h('div', { class: 'formulario' }, hereda.nodo, crearDb.nodo, crearRole.nodo);
        const botonAtributos = h('button', { type: 'button', class: 'btn btn-primario' }, 'Guardar atributos');
        botonAtributos.addEventListener('click', () => conCarga(botonAtributos, async () => {
          const cambios = {};
          if (hereda.input.checked !== Boolean(rolActivo.inherit)) cambios.inherit = hereda.input.checked;
          if (crearDb.input.checked !== Boolean(rolActivo.createDb)) cambios.createDb = crearDb.input.checked;
          if (crearRole.input.checked !== Boolean(rolActivo.createRole)) cambios.createRole = crearRole.input.checked;
          if (!Object.keys(cambios).length) {
            mostrarResultadoOperacion(true, 'Sin cambios', 'Los atributos conservan sus valores actuales.');
            return;
          }
          const ok = await confirmar('Modificar atributos del rol',
            `Se actualizarán los atributos permitidos de "${rolActivo.name}" en ${servidor.name}.`);
          if (!ok) return;
          try {
            await api.patch(`/api/v1/servers/${servidor.id}/roles/${seg(rolActivo.name)}`, { ...cambios, confirmed: true });
            mostrarResultadoOperacion(true, 'Atributos actualizados', `Rol: ${rolActivo.name}`);
            await cargarRoles();
          } catch (e) { mostrarResultadoOperacion(false, 'No se pudieron actualizar los atributos', mensajeError(e)); }
        }));

        const password = h('input', { type: 'password', autocomplete: 'new-password', required: true, minlength: '8' });
        const formularioPassword = h('form', { class: 'formulario' },
          campo('Nueva contraseña', password, 'Se envía al servidor para cambiar la contraseña; no se muestra ni se registra en el historial de esta pantalla.'),
          h('div', { class: 'acciones acciones-izq' },
            h('button', { type: 'submit', class: 'btn' }, 'Cambiar contraseña')));
        formularioPassword.addEventListener('submit', (ev) => {
          ev.preventDefault();
          const boton = formularioPassword.querySelector('button');
          conCarga(boton, async () => {
            if (!password.value) { mostrarResultadoOperacion(false, 'Falta la contraseña', 'Escribe una contraseña nueva.'); return; }
            const ok = await confirmar('Cambiar contraseña', `Se cambiará la contraseña del rol "${rolActivo.name}" en ${servidor.name}.`, { peligro: true });
            if (!ok) return;
            try {
              await api.patch(`/api/v1/servers/${servidor.id}/roles/${seg(rolActivo.name)}/password`, { password: password.value, confirmed: true });
              password.value = '';
              mostrarResultadoOperacion(true, 'Contraseña cambiada', `Rol: ${rolActivo.name}`);
            } catch (e) { mostrarResultadoOperacion(false, 'No se pudo cambiar la contraseña', mensajeError(e)); }
          });
        });

        const contenido = [
          h('p', {}, chip(nombreTipo(rolActivo), rolActivo.login ? 'info' : 'neutro')),
          h('dl', { class: 'datos' },
            h('dt', {}, 'Nombre'), h('dd', { class: 'mono' }, rolActivo.name),
            h('dt', {}, 'LOGIN'), h('dd', {}, textoBool(rolActivo.login)),
            h('dt', {}, 'Hereda'), h('dd', {}, textoBool(rolActivo.inherit)),
            h('dt', {}, 'Puede crear bases'), h('dd', {}, textoBool(rolActivo.createDb)),
            h('dt', {}, 'Puede crear roles'), h('dd', {}, textoBool(rolActivo.createRole)),
            h('dt', {}, 'Superusuario'), h('dd', {}, textoBool(rolActivo.superuser))),
          h('h3', { class: 'subtitulo' }, 'Atributos permitidos'),
          formularioAtributos,
          h('div', { class: 'acciones acciones-izq' }, botonAtributos),
          h('h3', { class: 'subtitulo' }, 'Cambiar contraseña'),
          formularioPassword,
        ];

        if (!rolActivo.login) {
          const miembro = h('select', {},
            h('option', { value: '' }, 'Elige un usuario LOGIN'),
            roles.filter((r) => r.login && r.name !== rolActivo.name)
              .map((r) => h('option', { value: r.name }, r.name)));
          const botonAgregar = h('button', { type: 'button', class: 'btn btn-primario' }, 'Agregar miembro');
          botonAgregar.addEventListener('click', () => conCarga(botonAgregar, async () => {
            if (!miembro.value) { mostrarResultadoOperacion(false, 'Elige un miembro', 'Selecciona un usuario LOGIN para agregarlo al grupo.'); return; }
            const ok = await confirmar('Agregar miembro al grupo', `Se agregará "${miembro.value}" a "${rolActivo.name}" en ${servidor.name}.`);
            if (!ok) return;
            try {
              await api.post(`/api/v1/servers/${servidor.id}/roles/${seg(rolActivo.name)}/members`, { member: miembro.value, confirmed: true });
              mostrarResultadoOperacion(true, 'Miembro agregado', `${miembro.value} pertenece ahora a ${rolActivo.name}.`);
              await cargarDetalle(rolActivo.name);
            } catch (e) { mostrarResultadoOperacion(false, 'No se pudo agregar el miembro', mensajeError(e)); }
          }));
          const filasMiembros = miembros.map((m) => {
            const nombreMiembro = typeof m === 'string' ? m : m.name;
            return { name: nombreMiembro, adminOption: typeof m === 'object' && Boolean(m.adminOption) };
          });
          contenido.push(
            h('h3', { class: 'subtitulo' }, 'Miembros del grupo'),
            tabla([
              { titulo: 'Usuario', valor: (m) => m.name, clase: 'mono' },
              { titulo: 'Opción de administrador', valor: (m) => textoBool(m.adminOption) },
              { titulo: 'Acción', valor: (m) => h('button', {
                type: 'button', class: 'btn btn-chico',
                onclick: async (ev) => {
                  const boton = ev.currentTarget;
                  await conCarga(boton, async () => {
                    const ok = await confirmar('Retirar miembro', `Se quitará "${m.name}" del grupo "${rolActivo.name}".`, { peligro: true });
                    if (!ok) return;
                    try {
                      await api.del(`/api/v1/servers/${servidor.id}/roles/${seg(rolActivo.name)}/members/${seg(m.name)}`);
                      mostrarResultadoOperacion(true, 'Miembro retirado', `${m.name} ya no pertenece a ${rolActivo.name}.`);
                      await cargarDetalle(rolActivo.name);
                    } catch (e) { mostrarResultadoOperacion(false, 'No se pudo retirar el miembro', mensajeError(e)); }
                  });
                },
              }, 'Retirar') },
            ], filasMiembros, { vacio: 'Este grupo todavía no tiene miembros.' }),
            h('div', { class: 'fila-campos' },
              campo('Agregar usuario', miembro),
              h('div', { class: 'acciones acciones-izq' }, botonAgregar)));
        }
        zonaDetalle.replaceChildren(...contenido);
      }

      const nombre = h('input', { type: 'text', required: true, maxlength: '63', autocomplete: 'off' });
      const login = casilla('Crear usuario LOGIN (desmarca para grupo NOLOGIN)', true);
      const passwordNuevo = h('input', { type: 'password', autocomplete: 'new-password' });
      const inheritNuevo = casilla('Heredar privilegios', true);
      const createDbNuevo = casilla('Puede crear bases de datos');
      const createRoleNuevo = casilla('Puede crear roles');
      function actualizarCampoPassword() {
        passwordNuevo.required = login.input.checked;
        passwordNuevo.disabled = !login.input.checked;
      }
      login.input.addEventListener('change', actualizarCampoPassword);
      actualizarCampoPassword();
      const formularioCrear = h('form', { class: 'formulario' },
        h('div', { class: 'fila-campos' },
          campo('Nombre del rol', nombre, 'Usa un nombre de usuario o grupo válido en PostgreSQL.'),
          campo('Contraseña', passwordNuevo, 'Requerida para un usuario LOGIN; no se necesita para un grupo NOLOGIN.')),
        login.nodo, inheritNuevo.nodo, createDbNuevo.nodo, createRoleNuevo.nodo,
        h('div', { class: 'acciones acciones-izq' }, h('button', { type: 'submit', class: 'btn btn-primario' }, 'Crear usuario o grupo')));
      formularioCrear.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const boton = formularioCrear.querySelector('button');
        conCarga(boton, async () => {
          const nuevoNombre = nombre.value.trim();
          if (!nuevoNombre || (login.input.checked && !passwordNuevo.value)) {
            mostrarResultadoOperacion(false, 'Revisa los datos', 'El nombre y, para usuarios LOGIN, la contraseña son obligatorios.');
            return;
          }
          const ok = await confirmar('Crear usuario o grupo',
            `Se creará "${nuevoNombre}" como ${login.input.checked ? 'usuario LOGIN' : 'grupo NOLOGIN'} en ${servidor.name}.`);
          if (!ok) return;
          try {
            await api.post(`/api/v1/servers/${servidor.id}/roles`, {
              name: nuevoNombre,
              login: login.input.checked,
              password: login.input.checked ? passwordNuevo.value : '',
              inherit: inheritNuevo.input.checked,
              createDb: createDbNuevo.input.checked,
              createRole: createRoleNuevo.input.checked,
              confirmed: true,
            });
            nombre.value = ''; passwordNuevo.value = '';
            mostrarResultadoOperacion(true, 'Rol creado', `${nuevoNombre} quedó registrado en ${servidor.name}.`);
            await cargarRoles({ conservar: false });
            await cargarDetalle(nuevoNombre);
          } catch (e) { mostrarResultadoOperacion(false, 'No se pudo crear el rol', mensajeError(e)); }
        });
      });

      const botonActualizar = h('button', { type: 'button', class: 'btn' }, 'Actualizar lista');
      botonActualizar.addEventListener('click', () => conCarga(botonActualizar, () => cargarRoles()));
      contenedor.append(
        tarjeta(null, h('div', { class: 'barra-filtros' }, textoServidor,
          h('div', { class: 'acciones acciones-izq' }, botonActualizar))),
        zonaResultado,
        tarjeta('Crear usuario o grupo', formularioCrear),
        h('div', { class: 'rejilla-2' },
          tarjeta('Usuarios y grupos', zonaRoles),
          tarjeta('Atributos y membresías', zonaDetalle)));
      cargarRoles();
    }

    montar();
    const quitar = alCambiar(() => {
      const servidor = servidorActivo();
      if ((servidor?.id ?? null) !== idMontado) montar();
    });
    return quitar;
  },
};
