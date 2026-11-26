# DBAdmin · Frontend

HTML + CSS + JavaScript sin frameworks ni instalación. Habla con el backend solo a través de la API REST descrita en `DBAdmin_61_Endpoints_Una_Hoja.xlsx`.

## Cómo abrirlo

Los módulos de JavaScript no funcionan con doble clic en el archivo, así que hay que servir la carpeta:

```powershell
cd C:\dbadmin-medistock\frontend
python -m http.server 5173 --bind 127.0.0.1
```

Luego abrir **http://localhost:5173** en el navegador. Debe ser `localhost` y no `127.0.0.1`: el backend solo acepta peticiones (CORS) del origen que dice `FRONTEND_URL` en su `.env`, que es `http://localhost:5173`.

## Modo prueba y modo real

En `js/config.js`:

- `MODO_PRUEBA: true` → las pantallas responden con los JSON de ejemplo del Excel. No necesita backend.
- `MODO_PRUEBA: false` → llama al backend real en `API_BASE` (`http://127.0.0.1:8000`). El backend de Pedro ya tiene CORS para `http://localhost:5173`.

En modo prueba se puede simular la caída de un nodo desde la consola del navegador (F12): `simularCaida(2)`, y la recuperación con `simularCaida(2, false)`.

## Estructura

```
frontend/
├── index.html              menú lateral, encabezado y selector de servidor activo
├── css/estilos.css
├── js/
│   ├── config.js           MODO_PRUEBA y dirección del backend
│   ├── api.js              única puerta hacia el backend (api.get/post/put/patch/del)
│   ├── mocks.js            ejemplos del Excel (generado, no editar a mano)
│   ├── mock-estado.js      modo prueba con memoria para Conexiones
│   ├── estado.js           servidores y servidor activo compartidos entre pantallas
│   ├── ui.js               tablas, chips, formularios, confirmaciones, avisos
│   ├── app.js              navegación entre módulos (#/conexiones, #/respaldos…)
│   └── modulos/
│       ├── index.js        lista de pantallas del menú
│       ├── conexiones.js   Módulo 1 terminado (ejemplo a seguir)
│       └── pendiente.js    pantalla provisional de los módulos sin hacer
└── scripts/generar_mocks.py  regenera mocks.js si Pedro cambia el Excel
```

## Cómo hacer una pantalla nueva

1. Crear `js/modulos/<nombre>.js` con la misma forma que `conexiones.js`:
   `export default { id, menu, titulo, descripcion, render(contenedor) { … } }`.
2. En `js/modulos/index.js`, importarlo y ponerlo en lugar de su `pendiente(...)`.
3. Para pedir datos: `await api.get('/api/v1/...')`. Regresa directamente el contenido de `data`; si falla lanza un error con `e.message` listo para mostrar.
4. Mostrar siempre el resultado de la operación (`mostrarResultado`) y pedir confirmación en acciones sensibles (`confirmar`).
5. Insertar los datos que vienen de PostgreSQL con `h(...)` o `textContent`, nunca con `innerHTML`.

## Si Pedro cambia el Excel

```powershell
python scripts\generar_mocks.py ruta\al\DBAdmin_61_Endpoints_Una_Hoja.xlsx js\mocks.js
```
(requiere `pip install openpyxl`)
