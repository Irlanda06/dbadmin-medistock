// Módulo 6 · Privilegios y control de acceso (E38–E41) · Prueba P08
// Ver quién tiene qué permiso sobre un objeto, consultar los permisos EFECTIVOS de un rol
// (incluidos los que hereda de sus grupos) y conceder o revocar comparando antes y después.
import { api, seg } from '../api.js';
import { h, tarjeta, tabla, chip, campo, conCarga, confirmar, avisar, mostrarResultado, mensajeError } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

// Qué privilegios tienen sentido para cada tipo de objeto (igual que el backend).
const PERMISOS = {
  DATABASE: ['CONNECT'],
  SCHEMA: ['USAGE'],
  TABLE: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  SEQUENCE: ['USAGE'],
};
const TIPOS = { TABLE: 'Tabla', SCHEMA: 'Esquema', DATABASE: 'Base de datos', SEQUENCE: 'Secuencia' };

export default {
  id: 'privilegios',
  menu: 'Privilegios',
  titulo: 'Privilegios y control de acceso',
  descripcion: 'Concede y revoca permisos, y compara los privilegios efectivos antes y después.',

  render(contenedor) {
    let idMontado = null;

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
  },
};
