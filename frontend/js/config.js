// Configuración del frontend de DBAdmin.
// MODO_PRUEBA = true  → las pantallas usan los JSON de ejemplo del Excel de Pedro (no necesita backend).
// MODO_PRUEBA = false → las pantallas llaman al backend real en API_BASE.
export const CONFIG = {
  API_BASE: 'http://127.0.0.1:8000',
  MODO_PRUEBA: false, // ya existe el backend de Pedro; ponlo en true para trabajar sin backend
  RETRASO_PRUEBA_MS: 300, // simula lo que tarda una respuesta real
};
