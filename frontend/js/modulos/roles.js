<<<<<<< HEAD
// Módulo 5 · Usuarios, grupos y atributos · Pruebas P06 y P07.
import { api, seg } from '../api.js';
import { h, tarjeta, tabla, chip, campo, confirmar, conCarga, mostrarResultado, mensajeError } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

const nombreTipo = (rol) => (rol.login ? 'Usuario LOGIN' : 'Grupo NOLOGIN');
const textoBool = (valor) => (valor ? 'Sí' : 'No');
const miembrosDe = (respuesta) => respuesta?.members || [];
=======
// Módulo 5 · Usuarios, grupos y atributos (E30–E37) · Pruebas P06 y P07
// Crear usuarios (LOGIN) y grupos (NOLOGIN), cambiar atributos y contraseña,
// y administrar quién pertenece a cada grupo. Todo sobre el servidor activo.
import { api, seg } from '../api.js';
import {
  h, tarjeta, tabla, chip, campo, conCarga, confirmar, avisar, mostrarResultado, mensajeError,
} from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

// Atributos que el formulario puede cambiar: [campo del JSON, palabra de PostgreSQL, explicación]
const ATRIBUTOS = [
  ['login', 'LOGIN', 'Puede iniciar sesión (usuario). Sin LOGIN es un grupo.'],
  ['inherit', 'INHERIT', 'Hereda automáticamente los permisos de los grupos a los que pertenece.'],
  ['createDb', 'CREATEDB', 'Puede crear bases de datos.'],
  ['createRole', 'CREATEROLE', 'Puede crear y administrar otros roles.'],
];
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0

export default {
  id: 'roles',
  menu: 'Usuarios y roles',
  titulo: 'Usuarios, grupos y atributos',
<<<<<<< HEAD
  descripcion: 'Crea roles, administra atributos y gestiona membresías.',
=======
  descripcion: 'Crea usuarios y grupos, cambia contraseñas y atributos, y administra membresías.',
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0

  render(contenedor) {
    let idMontado = null;

    function montar() {
<<<<<<< HEAD
      const servidor = servidorActivo();
      idMontado = servidor?.id ?? null;
      contenedor.replaceChildren();
      if (!servidor) {
=======
      const s = servidorActivo();
      idMontado = s ? s.id : null;
      contenedor.replaceChildren();
      if (!s) {
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0
        contenedor.append(tarjeta('Sin servidor activo',
          h('p', {}, 'Elige un servidor en el selector de arriba, o ve a ',
            h('a', { href: '#/conexiones' }, 'Conexiones'), ' y dale "Conectar".')));
        return;
      }
<<<<<<< HEAD
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
=======
      pantalla(s);
    }

    function pantalla(s) {
      const ruta = `/api/v1/servers/${s.id}/roles`;
      // Cuentas que DBAdmin usa para conectarse: el backend no deja modificarlas.
      const cuentasProtegidas = new Set(['postgres', s.username, s.readerUsername].filter(Boolean));
      let roles = [];
      let seleccionado = null;
      let mensajePendiente = null; // resultado que debe sobrevivir a que el detalle se vuelva a dibujar

      const esSistema = (r) => r.name.startsWith('pg_');
      const esProtegido = (r) => r.superuser || r.replication || r.bypassRls || cuentasProtegidas.has(r.name);

      // ---------- Lista de roles (E30) ----------
      const chkSistema = h('input', { type: 'checkbox' });
      const zonaLista = h('div');

      function chipsAtributos(r) {
        return h('span', { class: 'grupo-chips' },
          r.superuser ? chip('SUPERUSER', 'error') : null,
          r.createDb ? chip('CREATEDB', 'neutro') : null,
          r.createRole ? chip('CREATEROLE', 'neutro') : null,
          r.inherit ? null : chip('NOINHERIT', 'aviso'));
      }

      async function cargarRoles(elegir) {
        try {
          roles = await api.get(ruta) || [];
          if (elegir) seleccionado = elegir;
          pintarLista();
          pintarDetalle();
        } catch (e) {
          zonaLista.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
        }
      }

      function pintarLista() {
        const visibles = roles.filter((r) => chkSistema.checked || !esSistema(r));
        zonaLista.replaceChildren(tabla([
          { titulo: 'Rol', valor: (r) => h('span', { class: 'mono' }, r.name), clase: 'mono' },
          { titulo: 'Tipo', valor: (r) => (r.login ? chip('Usuario', 'info') : chip('Grupo', 'neutro')) },
          { titulo: 'Atributos', valor: chipsAtributos },
          { titulo: '', valor: (r) => (esProtegido(r) ? chip('Protegido', 'aviso') : '') },
          { titulo: '', clase: 'acciones-fila', valor: (r) => h('button', {
            class: `btn btn-chico ${seleccionado === r.name ? 'btn-primario' : ''}`,
            onclick: () => { seleccionado = r.name; pintarLista(); pintarDetalle(); },
          }, 'Ver') },
        ], visibles, { vacio: 'No hay roles.' }));
      }
      chkSistema.addEventListener('change', pintarLista);

      // ---------- Crear usuario o grupo (E31) ----------
      const inNombre = h('input', { type: 'text', maxlength: '63', placeholder: 'cajero_norte' });
      const selTipo = h('select', {},
        h('option', { value: 'usuario' }, 'Usuario (LOGIN, con contraseña)'),
        h('option', { value: 'grupo' }, 'Grupo (NOLOGIN, sin contraseña)'));
      const inPassword = h('input', { type: 'password', autocomplete: 'new-password' });
      const campoPassword = campo('Contraseña', inPassword);
      const chkInherit = h('input', { type: 'checkbox', checked: true });
      const chkCreateDb = h('input', { type: 'checkbox' });
      const chkCreateRole = h('input', { type: 'checkbox' });
      const btnCrear = h('button', { type: 'button', class: 'btn btn-primario' }, 'Crear rol');
      const resultadoCrear = h('div');

      selTipo.addEventListener('change', () => {
        campoPassword.hidden = selTipo.value === 'grupo';
        inNombre.placeholder = selTipo.value === 'grupo' ? 'farmacia_ventas' : 'cajero_norte';
      });

      btnCrear.addEventListener('click', () => conCarga(btnCrear, async () => {
        const nombre = inNombre.value.trim();
        const login = selTipo.value === 'usuario';
        if (!/^[a-z_][a-z0-9_]{0,62}$/.test(nombre)) {
          mostrarResultado(resultadoCrear, { ok: false, titulo: 'Nombre inválido', detalle: 'Usa minúsculas, números y guion bajo; empieza con letra.' });
          return;
        }
        if (login && !inPassword.value) {
          mostrarResultado(resultadoCrear, { ok: false, titulo: 'Falta la contraseña', detalle: 'Un usuario con LOGIN necesita contraseña.' });
          return;
        }
        const cuerpo = {
          confirmed: true, name: nombre, login,
          inherit: chkInherit.checked, createDb: chkCreateDb.checked, createRole: chkCreateRole.checked,
        };
        if (login) cuerpo.password = inPassword.value;
        const si = await confirmar(login ? 'Crear usuario' : 'Crear grupo',
          `Se ejecutará CREATE ROLE ${nombre} en ${s.name} (${login ? 'LOGIN' : 'NOLOGIN'}${cuerpo.inherit ? ', INHERIT' : ', NOINHERIT'}${cuerpo.createDb ? ', CREATEDB' : ''}${cuerpo.createRole ? ', CREATEROLE' : ''}). Nunca se crea como superusuario. ¿Continuar?`,
          { textoBoton: 'Crear' });
        if (!si) return;
        try {
          const r = await api.post(ruta, cuerpo);
          mostrarResultado(resultadoCrear, { ok: true, titulo: `${r.login ? 'Usuario' : 'Grupo'} "${r.name}" creado`, detalle: 'Ya aparece en la lista; abajo puedes ver su detalle.' });
          avisar(`Rol ${r.name} creado`, 'ok');
          inNombre.value = ''; inPassword.value = '';
          await cargarRoles(r.name);
        } catch (e) {
          mostrarResultado(resultadoCrear, { ok: false, titulo: 'No se creó el rol', detalle: mensajeError(e) });
        }
      }));

      // ---------- Detalle del rol: atributos (E32, E33), contraseña (E34), miembros (E35–E37) ----------
      const zonaDetalle = h('div');

      async function pintarDetalle() {
        if (!seleccionado) {
          zonaDetalle.replaceChildren(h('p', { class: 'vacio' }, 'Dale "Ver" a un rol de la lista para ver y cambiar sus atributos y miembros.'));
          return;
        }
        let r;
        try { r = await api.get(`${ruta}/${seg(seleccionado)}`); } catch (e) {
          zonaDetalle.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e)));
          return;
        }
        const protegido = esProtegido(r);
        const resultado = h('div');

        // Atributos: una casilla por atributo, se manda solo lo que cambió.
        const casillas = ATRIBUTOS.map(([clave, palabra, ayuda]) => {
          const chk = h('input', { type: 'checkbox', checked: Boolean(r[clave]), disabled: protegido });
          return { clave, palabra, chk, nodo: h('label', { class: 'interruptor casilla-atributo', title: ayuda }, chk, ` ${palabra}`, h('span', { class: 'campo-ayuda' }, ` · ${ayuda}`)) };
        });
        const btnAtributos = h('button', { type: 'button', class: 'btn', disabled: protegido }, 'Guardar atributos');
        btnAtributos.addEventListener('click', () => conCarga(btnAtributos, async () => {
          const cambios = {};
          casillas.forEach(({ clave, chk }) => { if (chk.checked !== Boolean(r[clave])) cambios[clave] = chk.checked; });
          if (!Object.keys(cambios).length) { mostrarResultado(resultado, { ok: false, titulo: 'No cambiaste ningún atributo' }); return; }
          const texto = Object.entries(cambios).map(([k, v]) => (v ? '' : 'NO') + ATRIBUTOS.find((a) => a[0] === k)[1]).join(' ');
          if (!await confirmar('Cambiar atributos', `Se ejecutará ALTER ROLE ${r.name} WITH ${texto}. ¿Continuar?`, { textoBoton: 'Aplicar' })) return;
          try {
            const nuevo = await api.patch(`${ruta}/${seg(r.name)}`, { confirmed: true, ...cambios });
            mensajePendiente = { ok: true, titulo: `Atributos de ${r.name} actualizados`, detalle: `Antes → después: ${Object.keys(cambios).map((k) => `${k}: ${r[k]} → ${nuevo[k]}`).join(' · ')}` };
            await cargarRoles(r.name);
          } catch (e) { mostrarResultado(resultado, { ok: false, titulo: 'No se cambiaron los atributos', detalle: mensajeError(e) }); }
        }));

        // Contraseña
        const inNueva = h('input', { type: 'password', autocomplete: 'new-password', disabled: protegido || !r.login });
        const btnPassword = h('button', { type: 'button', class: 'btn', disabled: protegido || !r.login }, 'Cambiar contraseña');
        btnPassword.addEventListener('click', () => conCarga(btnPassword, async () => {
          if (!inNueva.value) { mostrarResultado(resultado, { ok: false, titulo: 'Escribe la nueva contraseña' }); return; }
          if (!await confirmar('Cambiar contraseña', `Se cambiará la contraseña de ${r.name}. La anterior deja de funcionar. ¿Continuar?`, { textoBoton: 'Cambiar' })) return;
          try {
            await api.patch(`${ruta}/${seg(r.name)}/password`, { confirmed: true, password: inNueva.value });
            inNueva.value = '';
            mostrarResultado(resultado, { ok: true, titulo: `Contraseña de ${r.name} cambiada`, detalle: 'Se guardó cifrada (SCRAM-SHA-256); DBAdmin nunca la muestra.' });
          } catch (e) { mostrarResultado(resultado, { ok: false, titulo: 'No se cambió la contraseña', detalle: mensajeError(e) }); }
        }));

        // Miembros del rol (útil sobre todo en grupos)
        const zonaMiembros = h('div', {}, h('p', { class: 'vacio' }, 'Cargando miembros…'));
        const selMiembro = h('select', { disabled: protegido },
          roles.filter((x) => x.name !== r.name && !esSistema(x) && !esProtegido(x))
            .map((x) => h('option', { value: x.name }, `${x.name} (${x.login ? 'usuario' : 'grupo'})`)));
        const btnAgregar = h('button', { type: 'button', class: 'btn', disabled: protegido || !selMiembro.options.length }, 'Agregar al grupo');
        btnAgregar.addEventListener('click', () => conCarga(btnAgregar, async () => {
          const miembro = selMiembro.value;
          if (!await confirmar('Agregar miembro', `Se ejecutará GRANT ${r.name} TO ${miembro}: ${miembro} recibirá los permisos de ${r.name}. ¿Continuar?`, { textoBoton: 'Agregar' })) return;
          try {
            await api.post(`${ruta}/${seg(r.name)}/members`, { confirmed: true, member: miembro });
            mostrarResultado(resultado, { ok: true, titulo: `${miembro} ahora es miembro de ${r.name}` });
            cargarMiembros();
          } catch (e) { mostrarResultado(resultado, { ok: false, titulo: 'No se agregó el miembro', detalle: mensajeError(e) }); }
        }));

        async function cargarMiembros() {
          try {
            const lista = await api.get(`${ruta}/${seg(r.name)}/members`) || [];
            zonaMiembros.replaceChildren(tabla([
              { titulo: 'Miembro', valor: (m) => m.member, clase: 'mono' },
              { titulo: 'Otorgado por', valor: (m) => m.grantor, clase: 'mono' },
              { titulo: 'Hereda', valor: (m) => (m.inheritOption ? 'Sí' : 'No') },
              { titulo: '', clase: 'acciones-fila', valor: (m) => (protegido ? '' : h('button', {
                class: 'btn btn-chico btn-texto texto-peligro',
                onclick: async () => {
                  if (!await confirmar('Quitar miembro', `Se ejecutará REVOKE ${r.name} FROM ${m.member}. ¿Continuar?`, { textoBoton: 'Quitar', peligro: true })) return;
                  try {
                    await api.del(`${ruta}/${seg(r.name)}/members/${seg(m.member)}?confirmed=true`);
                    mostrarResultado(resultado, { ok: true, titulo: `${m.member} ya no es miembro de ${r.name}` });
                    cargarMiembros();
                  } catch (e) { mostrarResultado(resultado, { ok: false, titulo: 'No se quitó el miembro', detalle: mensajeError(e) }); }
                },
              }, 'Quitar')) },
            ], lista, { vacio: `${r.name} no tiene miembros.` }));
          } catch (e) { zonaMiembros.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e))); }
        }

        zonaDetalle.replaceChildren(
          h('div', { class: 'detalle-encabezado' },
            h('h3', { class: 'detalle-titulo' }, r.name),
            r.login ? chip('Usuario (LOGIN)', 'info') : chip('Grupo (NOLOGIN)', 'neutro'),
            protegido ? chip('Protegido: DBAdmin no lo modifica', 'aviso') : null),
          h('h4', { class: 'subtitulo' }, 'Atributos'),
          h('div', { class: 'lista-casillas' }, casillas.map((c) => c.nodo)),
          h('div', { class: 'acciones acciones-izq' }, btnAtributos),
          h('h4', { class: 'subtitulo' }, 'Contraseña'),
          r.login
            ? h('div', { class: 'acciones acciones-izq' }, inNueva, btnPassword)
            : h('p', { class: 'vacio' }, 'Los grupos (NOLOGIN) no tienen contraseña.'),
          h('h4', { class: 'subtitulo' }, `Miembros de ${r.name}`),
          zonaMiembros,
          h('div', { class: 'acciones acciones-izq' }, selMiembro, btnAgregar),
          resultado);
        if (mensajePendiente) { mostrarResultado(resultado, mensajePendiente); mensajePendiente = null; }
        cargarMiembros();
      }

      // ---------- Armado ----------
      contenedor.append(
        h('div', { class: 'rejilla-2' },
          tarjeta('Roles del servidor',
            h('div', { class: 'acciones acciones-izq' },
              h('label', { class: 'interruptor' }, chkSistema, ' Mostrar roles del sistema (pg_*)')),
            zonaLista),
          h('section', { class: 'tarjeta' },
            h('h2', { class: 'tarjeta-titulo' }, 'Crear usuario o grupo'),
            h('div', { class: 'formulario' },
              h('div', { class: 'fila-campos' }, campo('Tipo', selTipo), campo('Nombre', inNombre)),
              campoPassword,
              h('div', { class: 'lista-casillas' },
                h('label', { class: 'interruptor' }, chkInherit, ' INHERIT'),
                h('label', { class: 'interruptor' }, chkCreateDb, ' CREATEDB'),
                h('label', { class: 'interruptor' }, chkCreateRole, ' CREATEROLE')),
              h('div', { class: 'acciones' }, btnCrear),
              resultadoCrear))),
        tarjeta('Detalle del rol', zonaDetalle));

      pintarDetalle();
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0
      cargarRoles();
    }

    montar();
<<<<<<< HEAD
    const quitar = alCambiar(() => {
      const servidor = servidorActivo();
      if ((servidor?.id ?? null) !== idMontado) montar();
    });
    return quitar;
=======
    return alCambiar(() => {
      const s = servidorActivo();
      if ((s ? s.id : null) !== idMontado) montar();
    });
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0
  },
};
