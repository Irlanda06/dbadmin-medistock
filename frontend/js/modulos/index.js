// Registro de pantallas. Para agregar un módulo nuevo:
//   1. Crear js/modulos/<nombre>.js copiando la forma de conexiones.js (id, menu, titulo, descripcion, render).
//   2. Importarlo aquí y poner el objeto en lugar de su pendiente(...).
import conexiones from './conexiones.js';
import consultas from './consultas.js';
import { pendiente } from './pendiente.js';

export const MODULOS = [
  pendiente({ id: 'resumen', menu: 'Resumen', titulo: 'Panel principal', responsable: 'Ivie',
    descripcion: 'Estado de los servidores, acciones rápidas y actividad reciente.' }),
  conexiones,
  consultas,
  pendiente({ id: 'respaldos', menu: 'Respaldos', titulo: 'Respaldos configurables', responsable: 'Goreti', moduloExcel: '03',
    descripcion: 'Genera respaldos con pg_dump eligiendo alcance, formato y archivo.' }),
  pendiente({ id: 'restauraciones', menu: 'Restauraciones', titulo: 'Restauraciones verificadas', responsable: 'Goreti', moduloExcel: '04',
    descripcion: 'Restaura un respaldo en una base nueva de prueba y verifica tablas y recuentos.' }),
  pendiente({ id: 'roles', menu: 'Usuarios y roles', titulo: 'Usuarios, grupos y atributos', responsable: 'Goreti', moduloExcel: '05',
    descripcion: 'Crea usuarios y grupos, cambia contraseñas y atributos, administra membresías.' }),
  pendiente({ id: 'privilegios', menu: 'Privilegios', titulo: 'Privilegios y control de acceso', responsable: 'Goreti', moduloExcel: '06',
    descripcion: 'Concede y revoca permisos y compara los privilegios antes y después.' }),
  pendiente({ id: 'mantenimiento', menu: 'Mantenimiento', titulo: 'Mantenimiento', responsable: 'Ivie', moduloExcel: '07',
    descripcion: 'Ejecuta ANALYZE o VACUUM (ANALYZE) sobre una tabla y registra el resultado.' }),
  pendiente({ id: 'sesiones', menu: 'Sesiones y bloqueos', titulo: 'Sesiones y bloqueos', responsable: 'Ivie', moduloExcel: '08',
    descripcion: 'Consulta pg_stat_activity e identifica quién bloquea a quién.' }),
  pendiente({ id: 'distribucion', menu: 'Distribución', titulo: 'Configuración y consultas distribuidas', responsable: 'Ivie', moduloExcel: '09',
    descripcion: 'Configura postgres_fdw entre Norte y Sur y consulta el inventario global.' }),
  pendiente({ id: 'historial', menu: 'Historial', titulo: 'Historial y seguimiento', responsable: 'Ivie', moduloExcel: '10',
    descripcion: 'Consulta y filtra el historial persistente de operaciones.' }),
];
