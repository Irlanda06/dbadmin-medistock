// Registro de pantallas. Para agregar un módulo nuevo:
//   1. Crear js/modulos/<nombre>.js copiando la forma de conexiones.js (id, menu, titulo, descripcion, render).
//   2. Importarlo aquí y poner el objeto en lugar de su pendiente(...).
import conexiones from './conexiones.js';
import consultas from './consultas.js';
import respaldos from './respaldos.js';
import restauraciones from './restauraciones.js';
import roles from './roles.js';
import privilegios from './privilegios.js';
import distribucion from './distribucion.js';
import mantenimiento from './mantenimiento.js';
import historial from './historial.js';
import { pendiente } from './pendiente.js';

export const MODULOS = [
  pendiente({ id: 'resumen', menu: 'Resumen', titulo: 'Panel principal', responsable: 'Ivie',
    descripcion: 'Estado de los servidores, acciones rápidas y actividad reciente.' }),
  conexiones,
  consultas,
  respaldos,
  restauraciones,
  roles,
  privilegios,
  mantenimiento,
  pendiente({ id: 'sesiones', menu: 'Sesiones y bloqueos', titulo: 'Sesiones y bloqueos', responsable: 'Ivie', moduloExcel: '08',
    descripcion: 'Consulta pg_stat_activity e identifica quién bloquea a quién.' }),
  distribucion,
  historial,
];
