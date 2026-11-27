// Módulo 6 · Privilegios y control de acceso · Prueba P08.
import { api, seg } from '../api.js';
import { h, tarjeta, tabla, chip, campo, confirmar, conCarga, mostrarResultado, mensajeError } from '../ui.js';
import { servidorActivo, alCambiar } from '../estado.js';

const PERMISOS = {
  DATABASE: ['CONNECT'],
  SCHEMA: ['USAGE'],
  TABLE: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  SEQUENCE: ['USAGE'],
};
const TIPOS_OBJETO = [
  ['DATABASE', 'Base de datos'],
  ['SCHEMA', 'Esquema'],
  ['TABLE', 'Tabla o vista'],
  ['SEQUENCE', 'Secuencia'],
];
const SI_NO = (v) => (v ? 'Sí' : 'No');

export default {
  id: 'privilegios',
  menu: 'Privilegios',
  titulo: 'Privilegios y control de acceso',
  descripcion: 'Consulta permisos directos y efectivos; concede o revoca privilegios.',

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
  },
};
