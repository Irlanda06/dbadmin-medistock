<<<<<<< HEAD
// Módulo 6 · Privilegios y control de acceso · Prueba P08.
import { api, seg } from '../api.js';
import { h, tarjeta, tabla, chip, campo, confirmar, conCarga, mostrarResultado, mensajeError } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

=======
// Módulo 6 · Privilegios y control de acceso (E38–E41) · Prueba P08
// Ver quién tiene qué permiso sobre un objeto, consultar los permisos EFECTIVOS de un rol
// (incluidos los que hereda de sus grupos) y conceder o revocar comparando antes y después.
import { api, seg } from '../api.js';
import { h, tarjeta, tabla, chip, campo, conCarga, confirmar, avisar, mostrarResultado, mensajeError } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

// Qué privilegios tienen sentido para cada tipo de objeto (igual que el backend).
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0
const PERMISOS = {
  DATABASE: ['CONNECT'],
  SCHEMA: ['USAGE'],
  TABLE: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  SEQUENCE: ['USAGE'],
};
<<<<<<< HEAD
const TIPOS_OBJETO = [
  ['DATABASE', 'Base de datos'],
  ['SCHEMA', 'Esquema'],
  ['TABLE', 'Tabla o vista'],
  ['SEQUENCE', 'Secuencia'],
];
const SI_NO = (v) => (v ? 'Sí' : 'No');
=======
const TIPOS = { TABLE: 'Tabla', SCHEMA: 'Esquema', DATABASE: 'Base de datos', SEQUENCE: 'Secuencia' };
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0

export default {
  id: 'privilegios',
  menu: 'Privilegios',
  titulo: 'Privilegios y control de acceso',
<<<<<<< HEAD
  descripcion: 'Consulta permisos directos y efectivos; concede o revoca privilegios.',
=======
  descripcion: 'Concede y revoca permisos, y compara los privilegios efectivos antes y después.',
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
      const base = servidor.database;
      const urlBase = `/api/v1/servers/${servidor.id}/databases/${seg(base)}/privileges`;
      const zonaActual = h('div', {}, h('p', { class: 'vacio' }, 'Elige el objeto y consulta sus permisos.'));
      const zonaEfectivos = h('div', {}, h('p', { class: 'vacio' }, 'Consulta los permisos efectivos de un rol.'));
      const zonaCambio = h('div');
      const tipo = h('select', {}, TIPOS_OBJETO.map(([value, label]) => h('option', { value }, label)));
      const rol = h('input', { type: 'text', required: true, maxlength: '63', autocomplete: 'off', placeholder: 'por ejemplo grupo_lectura o PUBLIC' });
      const esquema = h('input', { type: 'text', maxlength: '63', autocomplete: 'off', value: 'medistock' });
      const objeto = h('input', { type: 'text', maxlength: '63', autocomplete: 'off', value: 'inventario' });
      const tipoPermiso = h('select');
      const campoEsquema = campo('Esquema', esquema);
      const campoObjeto = campo('Objeto', objeto);
      const textoServidor = h('span', { class: 'campo-ayuda' }, `Servidor: ${servidor.name} · base: ${base}`);

      function actualizarOpciones() {
        const t = tipo.value;
        tipoPermiso.replaceChildren(...PERMISOS[t].map((p) => h('option', { value: p }, p)));
        campoEsquema.hidden = t === 'DATABASE';
        campoObjeto.hidden = t === 'DATABASE' || t === 'SCHEMA';
        esquema.required = t !== 'DATABASE';
        objeto.required = t === 'TABLE' || t === 'SEQUENCE';
      }
      tipo.addEventListener('change', actualizarOpciones);
      actualizarOpciones();

      function validarDestino() {
        const t = tipo.value;
        if (!rol.value.trim()) throw new Error('Escribe el nombre del rol o PUBLIC.');
        if (t !== 'DATABASE' && !esquema.value.trim()) throw new Error('Escribe el esquema.');
        if ((t === 'TABLE' || t === 'SEQUENCE') && !objeto.value.trim()) throw new Error('Escribe el nombre del objeto.');
        return {
          objectType: t,
          role: rol.value.trim(),
          ...(t !== 'DATABASE' ? { schema: esquema.value.trim() } : {}),
          ...(t === 'TABLE' || t === 'SEQUENCE' ? { object: objeto.value.trim() } : {}),
        };
      }

      function queryDestino(destino) {
        const q = new URLSearchParams({ objectType: destino.objectType });
        if (destino.role) q.set('role', destino.role);
        if (destino.schema) q.set('schema', destino.schema);
        if (destino.object) q.set('object', destino.object);
        return q.toString();
      }

      function pintarACL(respuesta) {
        let filas = [];
        if (Array.isArray(respuesta)) filas = respuesta;
        else if (respuesta && typeof respuesta === 'object') {
          for (const [fuente, permisos] of Object.entries({
            directos: respuesta.direct,
            heredados: respuesta.inherited,
            publicos: respuesta.public,
          })) {
            for (const permiso of permisos || []) {
              filas.push(typeof permiso === 'string'
                ? { grantee: fuente === 'publicos' ? 'PUBLIC' : rol.value.trim(), privilege: permiso, source: fuente }
                : { ...permiso, source: fuente });
            }
          }
        }
        if (!filas.length) {
          zonaActual.replaceChildren(h('p', { class: 'vacio' }, 'No hay concesiones directas o públicas para este objeto.'));
          return;
        }
        zonaActual.replaceChildren(tabla([
          { titulo: 'Rol que recibe', valor: (p) => p.grantee || p.role || '—', clase: 'mono' },
          { titulo: 'Permiso', valor: (p) => p.privilege || p, clase: 'mono' },
          { titulo: 'Origen', valor: (p) => p.source || 'Concesión directa' },
          { titulo: 'Concedido por', valor: (p) => p.grantor || '—' },
          { titulo: 'Puede concederlo', valor: (p) => p.grantable === undefined ? '—' : SI_NO(p.grantable) },
        ], filas, { vacio: 'No hay concesiones para el objeto consultado.' }));
      }

      function pintarEfectivos(respuesta) {
        const efectivos = respuesta?.effective;
        const filas = Array.isArray(efectivos)
          ? efectivos.map((p) => ({ privilege: p, allowed: true }))
          : Object.entries(efectivos || {}).map(([privilege, allowed]) => ({ privilege, allowed: Boolean(allowed) }));
        const grupos = respuesta?.groups || [];
        const grants = respuesta?.grants || respuesta?.sources || [];
        zonaEfectivos.replaceChildren(
          filas.length ? tabla([
            { titulo: 'Permiso', valor: (p) => p.privilege, clase: 'mono' },
            { titulo: 'Efectivo', valor: (p) => chip(SI_NO(p.allowed), p.allowed ? 'ok' : 'neutro') },
          ], filas) : h('p', { class: 'vacio' }, 'El backend no devolvió permisos efectivos.'),
          grupos.length ? h('p', {}, h('strong', {}, 'Grupos heredados: '), grupos.join(', ')) : null,
          grants.length ? h('details', {},
            h('summary', {}, 'Ver concesiones y orígenes'),
            h('pre', { class: 'mono' }, JSON.stringify(grants, null, 2))) : null);
      }

      async function consultarActuales() {
        zonaActual.replaceChildren(h('p', { class: 'vacio' }, 'Consultando permisos…'));
        try {
          const destino = validarDestino();
          const respuesta = await api.get(`${urlBase}?${queryDestino(destino)}`);
          pintarACL(respuesta);
        } catch (e) { zonaActual.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e))); }
      }

      async function consultarEfectivos() {
        zonaEfectivos.replaceChildren(h('p', { class: 'vacio' }, 'Consultando permisos efectivos…'));
        try {
          const destino = validarDestino();
          if (destino.role.toUpperCase() === 'PUBLIC') throw new Error('PUBLIC no representa un rol individual; no tiene permisos efectivos consultables.');
          const ruta = `${urlBase}/effective?${queryDestino(destino)}`;
          const respuesta = await api.get(ruta);
          pintarEfectivos(respuesta);
        } catch (e) { zonaEfectivos.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e))); }
      }

      const botonActuales = h('button', { type: 'button', class: 'btn' }, 'Consultar permisos actuales');
      botonActuales.addEventListener('click', () => conCarga(botonActuales, consultarActuales));
      const botonEfectivos = h('button', { type: 'button', class: 'btn' }, 'Consultar permisos efectivos');
      botonEfectivos.addEventListener('click', () => conCarga(botonEfectivos, consultarEfectivos));

      const formularioCambios = h('form', { class: 'formulario' },
        h('div', { class: 'fila-campos' },
          campo('Tipo de objeto', tipo),
          campo('Rol destinatario', rol, 'Escribe el nombre de un rol existente o PUBLIC.')),
        h('div', { class: 'fila-campos' }, campoEsquema, campoObjeto),
        h('div', { class: 'fila-campos' },
          campo('Permiso', tipoPermiso),
          h('div', { class: 'acciones acciones-izq' },
            h('button', { type: 'submit', class: 'btn btn-primario' }, 'Conceder permiso'),
            h('button', { type: 'button', class: 'btn' }, 'Revocar permiso'))));
      const botones = formularioCambios.querySelectorAll('button');
      const botonConceder = botones[0];
      const botonRevocar = botones[1];

      async function cambiarPermiso(accion, boton) {
        await conCarga(boton, async () => {
          try {
            const destino = validarDestino();
            const privilegio = tipoPermiso.value;
            const etiquetaObjeto = destino.objectType === 'DATABASE' ? base
              : destino.objectType === 'SCHEMA' ? destino.schema
                : `${destino.schema}.${destino.object}`;
            const tituloAccion = accion === 'grant' ? 'Conceder permiso' : 'Revocar permiso';
            const ok = await confirmar(`${tituloAccion}: ${privilegio}`,
              `Se ${accion === 'grant' ? 'concederá' : 'revocará'} ${privilegio} para "${destino.role}" sobre ${destino.objectType} ${etiquetaObjeto} en ${servidor.name}.`,
              { textoBoton: accion === 'grant' ? 'Conceder' : 'Revocar', peligro: accion === 'revoke' });
            if (!ok) return;
            const cuerpo = { ...destino, privilege: privilegio, confirmed: true };
            const respuesta = await api.post(`${urlBase}/${accion}`, cuerpo);
            const etiqueta = accion === 'grant' ? 'Permiso concedido' : 'Permiso revocado';
            mostrarResultado(zonaCambio, {
              ok: true,
              titulo: etiqueta,
              detalle: h('div', {},
                h('p', {}, `${privilegio} · ${destino.role} · ${etiquetaObjeto}`),
                h('div', { class: 'rejilla-2' },
                  tarjeta('Antes', h('pre', { class: 'mono' }, JSON.stringify(respuesta.before, null, 2))),
                  tarjeta('Después', h('pre', { class: 'mono' }, JSON.stringify(respuesta.after, null, 2))))),
            });
            await consultarActuales();
            await consultarEfectivos();
          } catch (e) {
            mostrarResultado(zonaCambio, { ok: false, titulo: 'No se pudo cambiar el permiso', detalle: mensajeError(e) });
          }
        });
      }

      formularioCambios.addEventListener('submit', (ev) => {
        ev.preventDefault();
        cambiarPermiso('grant', botonConceder);
      });
      botonRevocar.addEventListener('click', () => cambiarPermiso('revoke', botonRevocar));

      contenedor.append(
        tarjeta(null, h('div', { class: 'barra-filtros' }, textoServidor)),
        tarjeta('Objeto y rol', formularioCambios,
          h('div', { class: 'acciones acciones-izq' }, botonActuales, botonEfectivos)),
        zonaCambio,
        h('div', { class: 'rejilla-2' },
          tarjeta('Privilegios concedidos', zonaActual),
          tarjeta('Permisos efectivos', zonaEfectivos)));
    }

    montar();
    const quitar = alCambiar(() => {
      const servidor = servidorActivo();
      if ((servidor?.id ?? null) !== idMontado) montar();
    });
    return quitar;
=======
      pantalla(s);
    }

    function pantalla(s) {
      const base = s.database;
      const rutaBase = `/api/v1/servers/${s.id}/databases/${seg(base)}`;
      const protegidas = new Set(['postgres', s.username, s.readerUsername].filter(Boolean));

      // ---------- Selección de objeto y rol ----------
      const selTipo = h('select', {}, Object.entries(TIPOS).map(([v, t]) => h('option', { value: v }, t)));
      const selEsquema = h('select');
      const selObjeto = h('select');
      const selRol = h('select');
      const selPermiso = h('select');
      const campoEsquema = campo('Esquema', selEsquema);
      const campoObjeto = campo('Objeto', selObjeto);
      const btnConceder = h('button', { type: 'button', class: 'btn btn-primario' }, 'Conceder (GRANT)');
      const btnRevocar = h('button', { type: 'button', class: 'btn btn-peligro' }, 'Revocar (REVOKE)');
      const zonaResultado = h('div');
      const zonaComparacion = h('div');
      const zonaAcl = h('div');
      const zonaEfectivos = h('div');

      // Parámetros del objeto elegido, en la forma que pide el backend.
      function objetoActual() {
        const tipo = selTipo.value;
        if (tipo === 'DATABASE') return { objectType: tipo };
        if (tipo === 'SCHEMA') return { objectType: tipo, schema: selEsquema.value };
        return { objectType: tipo, schema: selEsquema.value, object: selObjeto.value };
      }
      function nombreObjeto(o = objetoActual()) {
        return o.objectType === 'DATABASE' ? base : o.objectType === 'SCHEMA' ? o.schema : `${o.schema}.${o.object}`;
      }
      function query(extra = {}) {
        return new URLSearchParams(Object.fromEntries(Object.entries({ ...objetoActual(), ...extra }).filter(([, v]) => v))).toString();
      }

      function actualizarCampos() {
        const tipo = selTipo.value;
        campoEsquema.hidden = tipo === 'DATABASE';
        campoObjeto.hidden = tipo === 'DATABASE' || tipo === 'SCHEMA';
        selPermiso.replaceChildren(...PERMISOS[tipo].map((p) => h('option', { value: p }, p)));
      }

      async function cargarEsquemas() {
        try {
          const lista = await api.get(`${rutaBase}/schemas`);
          const nombres = (lista || []).map((x) => x.name).filter((n) => !n.startsWith('pg_') && n !== 'information_schema');
          selEsquema.replaceChildren(...nombres.map((n) => h('option', { value: n }, n)));
          if (nombres.includes('medistock')) selEsquema.value = 'medistock';
        } catch (e) { avisar(mensajeError(e), 'error'); }
      }

      async function cargarObjetos() {
        const tipo = selTipo.value;
        if (tipo !== 'TABLE' && tipo !== 'SEQUENCE') return;
        try {
          const ruta = tipo === 'TABLE' ? 'tables' : 'sequences';
          const lista = await api.get(`${rutaBase}/${ruta}?schema=${seg(selEsquema.value)}`) || [];
          selObjeto.replaceChildren(...lista.map((o) => h('option', { value: o.name }, o.name)));
          if (lista.some((o) => o.name === 'ventas')) selObjeto.value = 'ventas';
          if (!lista.length) selObjeto.replaceChildren(h('option', { value: '' }, '(sin objetos)'));
        } catch (e) { avisar(mensajeError(e), 'error'); }
      }

      async function cargarRoles() {
        try {
          const roles = (await api.get(`/api/v1/servers/${s.id}/roles`) || [])
            .filter((r) => !r.name.startsWith('pg_') && !r.superuser);
          const anterior = selRol.value;
          selRol.replaceChildren(
            ...roles.map((r) => h('option', { value: r.name, disabled: protegidas.has(r.name) },
              `${r.name} (${r.login ? 'usuario' : 'grupo'})${protegidas.has(r.name) ? ' · protegido' : ''}`)),
            h('option', { value: 'PUBLIC' }, 'PUBLIC (todos los roles)'));
          const preferido = ['farmacia_ventas', 'cajero_norte'].find((n) => roles.some((r) => r.name === n));
          selRol.value = roles.some((r) => r.name === anterior) ? anterior : (preferido || 'PUBLIC');
        } catch (e) { avisar(mensajeError(e), 'error'); }
      }

      // ---------- Privilegios actuales del objeto (E38) ----------
      async function pintarAcl() {
        zonaAcl.replaceChildren(h('p', { class: 'vacio' }, 'Cargando…'));
        try {
          const lista = await api.get(`${rutaBase}/privileges?${query()}`) || [];
          zonaAcl.replaceChildren(
            h('p', { class: 'campo-ayuda' }, `Quién tiene permisos directos sobre ${TIPOS[selTipo.value].toLowerCase()} ${nombreObjeto()}. PUBLIC significa "todos los roles".`),
            tabla([
              { titulo: 'Rol (grantee)', valor: (a) => (a.grantee === 'PUBLIC' ? chip('PUBLIC', 'aviso') : h('span', { class: 'mono' }, a.grantee)) },
              { titulo: 'Privilegio', valor: (a) => chip(a.privilege, 'info') },
              { titulo: 'Otorgado por', valor: (a) => a.grantor, clase: 'mono' },
              { titulo: 'Puede re-otorgar', valor: (a) => (a.grantable ? 'Sí' : 'No') },
            ], lista, { vacio: 'Nadie tiene permisos directos sobre este objeto (solo el dueño).' }));
        } catch (e) { zonaAcl.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e))); }
      }

      // ---------- Permisos efectivos del rol (E39) ----------
      function chipsEfectivos(efectivos) {
        return h('span', { class: 'grupo-chips' },
          Object.entries(efectivos || {}).map(([p, ok]) => chip(`${ok ? '✓' : '✗'} ${p}`, ok ? 'ok' : 'neutro')));
      }

      async function pintarEfectivos() {
        const rol = selRol.value;
        if (!rol || rol === 'PUBLIC') {
          zonaEfectivos.replaceChildren(h('p', { class: 'vacio' }, 'Elige un rol real para ver sus permisos efectivos (PUBLIC no es un rol).'));
          return;
        }
        zonaEfectivos.replaceChildren(h('p', { class: 'vacio' }, 'Cargando…'));
        try {
          const r = await api.get(`${rutaBase}/privileges/effective?${query({ role: rol })}`);
          zonaEfectivos.replaceChildren(
            h('p', { class: 'campo-ayuda' }, `Lo que ${rol} PUEDE hacer de verdad sobre ${nombreObjeto()}, sumando lo que hereda de sus grupos.`),
            chipsEfectivos(r.effective),
            h('dl', { class: 'datos', style: 'margin-top:10px' },
              h('dt', {}, 'Grupos de los que hereda'),
              h('dd', {}, r.groups && r.groups.length ? r.groups.join(', ') : 'ninguno'),
              h('dt', {}, 'Por qué'),
              h('dd', {}, r.grants && r.grants.length
                ? r.grants.map((g) => `${g.privilege} vía ${g.grantee}`).join(' · ')
                : 'no hay ningún GRANT que le aplique')));
        } catch (e) { zonaEfectivos.replaceChildren(h('div', { class: 'resultado resultado-error' }, mensajeError(e))); }
      }

      async function refrescar() { await Promise.all([pintarAcl(), pintarEfectivos()]); }

      // ---------- GRANT / REVOKE (E40, E41) con comparación ----------
      function pintarComparacion(r) {
        const antes = r.before || {};
        const despues = r.after || {};
        if (antes.effective && despues.effective) {
          const filas = Object.keys(despues.effective).map((p) => ({ p, a: antes.effective[p], d: despues.effective[p] }));
          zonaComparacion.replaceChildren(
            h('h4', { class: 'subtitulo' }, `Permisos efectivos de ${r.role} sobre ${nombreObjeto()}: antes y después`),
            tabla([
              { titulo: 'Privilegio', valor: (f) => f.p },
              { titulo: 'Antes', valor: (f) => chip(f.a ? '✓ sí' : '✗ no', f.a ? 'ok' : 'neutro') },
              { titulo: 'Después', valor: (f) => chip(f.d ? '✓ sí' : '✗ no', f.d ? 'ok' : 'neutro') },
              { titulo: '', valor: (f) => (f.a !== f.d ? chip('cambió', 'aviso') : '') },
            ], filas));
        } else {
          const texto = (lista) => (lista || []).map((g) => `${g.grantee}: ${g.privilege}`).join(' · ') || 'ninguno';
          zonaComparacion.replaceChildren(
            h('h4', { class: 'subtitulo' }, 'Permisos de PUBLIC: antes y después'),
            h('dl', { class: 'datos' },
              h('dt', {}, 'Antes'), h('dd', {}, texto(antes.grants)),
              h('dt', {}, 'Después'), h('dd', {}, texto(despues.grants))));
        }
      }

      async function cambiar(conceder, boton) {
        const o = objetoActual();
        if ((o.objectType === 'TABLE' || o.objectType === 'SEQUENCE') && !o.object) {
          mostrarResultado(zonaResultado, { ok: false, titulo: 'Elige un objeto' });
          return;
        }
        const rol = selRol.value;
        const permiso = selPermiso.value;
        const sqlTexto = conceder
          ? `GRANT ${permiso} ON ${o.objectType} ${nombreObjeto(o)} TO ${rol}`
          : `REVOKE ${permiso} ON ${o.objectType} ${nombreObjeto(o)} FROM ${rol}`;
        const si = await confirmar(conceder ? 'Conceder privilegio' : 'Revocar privilegio',
          `Se ejecutará en ${s.name}: ${sqlTexto}. ¿Continuar?`,
          { textoBoton: conceder ? 'Conceder' : 'Revocar', peligro: !conceder });
        if (!si) return;
        await conCarga(boton, async () => {
          try {
            const r = await api.post(`${rutaBase}/privileges/${conceder ? 'grant' : 'revoke'}`,
              { confirmed: true, ...o, role: rol, privilege: permiso });
            mostrarResultado(zonaResultado, { ok: true, titulo: `${conceder ? 'GRANT' : 'REVOKE'} aplicado`, detalle: sqlTexto });
            avisar(`${conceder ? 'Concedido' : 'Revocado'}: ${permiso} a ${rol}`, 'ok');
            pintarComparacion(r);
            refrescar();
          } catch (e) {
            mostrarResultado(zonaResultado, { ok: false, titulo: 'No se aplicó el cambio', detalle: mensajeError(e) });
          }
        });
      }
      btnConceder.addEventListener('click', () => cambiar(true, btnConceder));
      btnRevocar.addEventListener('click', () => cambiar(false, btnRevocar));

      // ---------- Eventos de los selectores ----------
      selTipo.addEventListener('change', async () => { actualizarCampos(); await cargarObjetos(); zonaComparacion.replaceChildren(); refrescar(); });
      selEsquema.addEventListener('change', async () => { await cargarObjetos(); refrescar(); });
      selObjeto.addEventListener('change', () => { zonaComparacion.replaceChildren(); refrescar(); });
      selRol.addEventListener('change', () => { zonaComparacion.replaceChildren(); pintarEfectivos(); });

      // ---------- Armado ----------
      contenedor.append(
        h('section', { class: 'tarjeta' },
          h('h2', { class: 'tarjeta-titulo' }, 'Objeto, rol y privilegio'),
          h('p', { class: 'campo-ayuda' }, `Servidor: ${s.name} · Base: ${base}`),
          h('div', { class: 'formulario' },
            h('div', { class: 'fila-campos fila-3' }, campo('Tipo de objeto', selTipo), campoEsquema, campoObjeto),
            h('div', { class: 'fila-campos' }, campo('Rol', selRol), campo('Privilegio', selPermiso)),
            h('div', { class: 'acciones' }, btnRevocar, btnConceder),
            zonaResultado,
            zonaComparacion)),
        h('div', { class: 'rejilla-2' },
          tarjeta('Privilegios actuales del objeto', zonaAcl),
          tarjeta('Permisos efectivos del rol', zonaEfectivos)));

      actualizarCampos();
      Promise.all([cargarEsquemas(), cargarRoles()])
        .then(cargarObjetos)
        .then(refrescar);
    }

    montar();
    return alCambiar(() => {
      const s = servidorActivo();
      if ((s ? s.id : null) !== idMontado) montar();
    });
>>>>>>> 861cbf2614548a5c533aecc3fe1e08ad4bd064d0
  },
};
