// Registro de pantallas: el orden de esta lista es el orden del menú lateral.
// Para agregar un módulo nuevo: crear js/modulos/<nombre>.js con la forma
// { id, menu, titulo, descripcion, render(contenedor) }, importarlo aquí y ponerlo en la lista.
// (pendiente.js sigue disponible para pantallas "en construcción", aunque ya no se usa.)
import resumen from './resumen.js';
import conexiones from './conexiones.js';
import consultas from './consultas.js';
import respaldos from './respaldos.js';
import restauraciones from './restauraciones.js';
import roles from './roles.js';
import privilegios from './privilegios.js';
import distribucion from './distribucion.js';
import sesiones from './sesiones.js';
import mantenimiento from './mantenimiento.js';
import historial from './historial.js';

export const MODULOS = [
  resumen,
  conexiones,
  consultas,
  respaldos,
  restauraciones,
  roles,
  privilegios,
  mantenimiento,
  sesiones,
  distribucion,
  historial,
];
