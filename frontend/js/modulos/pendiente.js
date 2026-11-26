// Pantalla provisional para los módulos que aún no se construyen.
// Muestra quién la hace y qué endpoints del Excel de Pedro va a usar (sirve de lista de tareas).
import { h, tarjeta, tabla, chip } from '../ui.js';
import { ENDPOINTS } from '../mocks.js';

export function pendiente({ id, menu, titulo, descripcion, responsable, moduloExcel }) {
  return {
    id, menu, titulo, descripcion,
    render(contenedor) {
      const endpoints = moduloExcel ? ENDPOINTS.filter((e) => String(e.modulo).startsWith(moduloExcel)) : [];
      contenedor.append(
        tarjeta('En construcción',
          h('p', {}, 'Responsable: ', h('strong', {}, responsable), '. ',
            'Esta pantalla todavía no está hecha; abajo están los endpoints del contrato que va a usar.')),
        endpoints.length ? tarjeta(`Endpoints del módulo (${endpoints.length})`,
          tabla([
            { titulo: 'ID', valor: (e) => e.id },
            { titulo: 'Método', valor: (e) => chip(e.metodo, e.metodo === 'GET' ? 'info' : e.metodo === 'DELETE' ? 'error' : 'aviso') },
            { titulo: 'Ruta', valor: (e) => h('code', {}, e.ruta), clase: 'mono' },
            { titulo: 'Para qué', valor: (e) => e.finalidad },
            { titulo: 'Pruebas', valor: (e) => e.pruebas },
          ], endpoints)) : null);
    },
  };
}
