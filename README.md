# DBAdmin · Panel de administración de PostgreSQL

Aplicación web para administrar PostgreSQL 18 sin escribir los comandos a mano: conexiones, consultas de solo lectura, respaldos, restauraciones, usuarios y roles, privilegios, mantenimiento, sesiones y bloqueos, distribución con `postgres_fdw` e historial.

Se prueba sobre **MediStock**, una cadena de farmacias con dos sucursales, cada una en un nodo de Docker: **Norte** (sucursal 1) y **Sur** (sucursal 2).

Proyecto final de *Administración de Bases de Datos* · CUCEI, Universidad de Guadalajara · Mtro. Arturo Guzmán Vázquez.

## Arquitectura

Tres partes independientes que se comunican por una API REST con JSON. Solo el backend habla con PostgreSQL.

```
  Navegador ──► frontend/ (localhost:5173) ──► backend/ (127.0.0.1:8000) ──► MediStock Norte (127.0.0.1:5451)
                HTML + JS sin frameworks       FastAPI · 61 endpoints          MediStock Sur   (127.0.0.1:5452)
                                               historial en SQLite                  │
                                               pg_dump / pg_restore / psql          └─ Norte ► Sur por postgres_fdw
                                                                                       (red interna: nodo_sur:5432)
```

```
dbadmin-medistock/
├── compose.yaml               nodos Norte y Sur (PostgreSQL 18)
├── MediaStock_BaseDatos.sql   esquema y datos de MediStock (se carga en cada nodo)
├── db/
│   └── 01_usuario_lectura.sql usuario de solo lectura dbadmin_reader
├── backend/                   API FastAPI (router → service → gateway por módulo)
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
├── frontend/                  pantallas del panel (ver frontend/README.md)
├── consola-pedro/             consola técnica del backend (alternativa al frontend)
└── app/                       versión inicial del backend; ya no se usa
```

## Requisitos

| Programa | Versión | Para qué |
| --- | --- | --- |
| Windows 10/11 con PowerShell | — | Los comandos de esta guía son de PowerShell |
| Docker Desktop | Compose v2 | Nodos Norte y Sur |
| Python | 3.11 o superior | Backend y servidor del frontend |
| Herramientas cliente de PostgreSQL | **18** | `pg_dump`, `pg_restore` y `psql` para respaldos y restauraciones |
| Git | — | Clonar el repositorio |

El backend busca `pg_dump` en el `PATH` y, si no lo encuentra, en `C:\Program Files\PostgreSQL\18\bin`. Debe ser versión 18, igual que los nodos.

```powershell
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --version   # debe decir 18.x
```

## Instalación (una sola vez)

### 1. Clonar

```powershell
git clone https://github.com/Irlanda06/dbadmin-medistock.git C:\dbadmin-medistock
cd C:\dbadmin-medistock
```

### 2. Levantar los nodos

Abre Docker Desktop y espera a que diga que está corriendo.

```powershell
docker compose up -d
docker compose ps        # nodo_norte y nodo_sur deben estar "healthy"
```

> Si los puertos 5451 o 5452 ya están ocupados por otro proyecto, cambia solo el lado izquierdo en `compose.yaml` (por ejemplo `127.0.0.1:5461:5432`) y usa ese puerto al registrar el perfil.

### 3. Cargar MediStock en cada nodo

Es el mismo archivo para los dos nodos; solo cambia la palabra `NORTE` por `SUR`.

```powershell
# Norte (sucursal 1)
Get-Content .\MediaStock_BaseDatos.sql -Raw |
  docker compose exec -T nodo_norte psql -U adminlab -d medistock -v ON_ERROR_STOP=1

# Sur (sucursal 2)
(Get-Content .\MediaStock_BaseDatos.sql -Raw).Replace("'NORTE', true", "'SUR', true") |
  docker compose exec -T nodo_sur psql -U adminlab -d medistock -v ON_ERROR_STOP=1
```

También se puede abrir el archivo en pgAdmin y ejecutarlo en cada nodo, como indica su encabezado. El script no borra nada: si el esquema ya existe, se detiene.

Comprobación (debe dar 30 en cada nodo):

```powershell
docker compose exec nodo_norte psql -U adminlab -d medistock -c "SELECT count(*) FROM medistock.inventario;"
docker compose exec nodo_sur   psql -U adminlab -d medistock -c "SELECT count(*) FROM medistock.inventario;"
```

### 4. Crear el usuario de lectura en cada nodo

`dbadmin_reader` es el usuario con el que trabajan el editor SQL y el mapeo de `postgres_fdw`. Sin él, esas pantallas responden `READER_NOT_CONFIGURED`.

```powershell
docker compose cp .\db\01_usuario_lectura.sql nodo_norte:/tmp/lector.sql
docker compose exec nodo_norte psql -U adminlab -d medistock -v ON_ERROR_STOP=1 -f /tmp/lector.sql

docker compose cp .\db\01_usuario_lectura.sql nodo_sur:/tmp/lector.sql
docker compose exec nodo_sur psql -U adminlab -d medistock -v ON_ERROR_STOP=1 -f /tmp/lector.sql
```

Al final de cada ejecución debe aparecer una fila con `lectura = t` y `escritura = f`.

### 5. Preparar el backend

```powershell
cd C:\dbadmin-medistock\backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Abre `backend\.env` y pega la clave que imprimió el último comando en `ENCRYPTION_KEY=`. Esa clave cifra las contraseñas de los perfiles guardados. **No la cambies después**: los perfiles ya guardados no se podrían descifrar.

El archivo `.env` no se sube a Git. Los demás valores de `.env.example` sirven tal cual para el laboratorio (`FRONTEND_URL=http://localhost:5173`, `ALLOWED_NETWORKS` con 127.0.0.0/8).

## Ejecución (cada vez)

Con Docker Desktop abierto, se usan dos ventanas de PowerShell:

```powershell
# Ventana 1: nodos y backend
cd C:\dbadmin-medistock
docker compose up -d
cd backend
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

```powershell
# Ventana 2: frontend
cd C:\dbadmin-medistock\frontend
python -m http.server 5173 --bind 127.0.0.1
```

Abre **http://localhost:5173**. Debe ser `localhost`, no `127.0.0.1`: el backend solo acepta peticiones (CORS) del origen que indica `FRONTEND_URL`.

La documentación interactiva de la API queda en http://127.0.0.1:8000/docs.

### Primer uso: registrar los nodos

En **Conexiones → Registrar perfil**:

| Campo | Norte | Sur |
| --- | --- | --- |
| Host | 127.0.0.1 | 127.0.0.1 |
| Puerto | 5451 | 5452 |
| Base de datos | medistock | medistock |
| Usuario / contraseña | `adminlab` / la de `compose.yaml` | igual |
| Usuario de lectura / contraseña | `dbadmin_reader` / la de `db/01_usuario_lectura.sql` | igual |

Después dale **Conectar** a Norte para elegirlo como servidor activo.

### Apagar

**Ctrl + C** en cada ventana. Si quieres detener los nodos: `docker compose down`. Los datos se conservan: el historial en `backend\storage\dbadmin.db` y las bases en los volúmenes de Docker.

> **Nunca** ejecutes `docker compose down -v`: la opción `-v` borra los volúmenes y con ellos las bases de MediStock.

## Problemas comunes

| Síntoma | Causa y solución |
| --- | --- |
| El navegador muestra errores de CORS o “Failed to fetch” | Abriste `127.0.0.1:5173`. Usa `http://localhost:5173`, o revisa que el backend esté corriendo. |
| El backend no arranca y menciona `ENCRYPTION_KEY` | Falta la clave en `backend\.env` (paso 5). |
| `READER_NOT_CONFIGURED` | El perfil no tiene usuario de lectura. Edita el perfil y agrega `dbadmin_reader` (paso 4). |
| “Instala el cliente PostgreSQL 18” o “Se requiere pg_dump de PostgreSQL 18” | Instala las herramientas cliente de PostgreSQL 18 en `C:\Program Files\PostgreSQL\18`. |
| `NODE_UNAVAILABLE` o el nodo aparece como Caído | El contenedor está detenido: `docker compose start nodo_sur` (o `nodo_norte`). |
| La configuración FDW falla con `NOT_FOUND` | Sigue el orden de la pantalla: primero habilita la extensión `postgres_fdw`. |
| La pantalla quedó en blanco después de un `git pull` | Busca marcas de conflicto: `Select-String -Path frontend\js\modulos\*.js -Pattern '^<<<<<<<'`. |

## Seguridad

- Las contraseñas de `compose.yaml` y `db/01_usuario_lectura.sql` son **de laboratorio**; no se usan fuera del equipo de prácticas.
- Las contraseñas de los perfiles se guardan cifradas en el backend y nunca se envían al navegador.
- El editor SQL solo acepta un `SELECT` y lo ejecuta con `dbadmin_reader` en una transacción de solo lectura.
- Los nodos solo escuchan en `127.0.0.1`, y el backend solo se conecta a las redes de `ALLOWED_NETWORKS`.

## Equipo

| Integrante | Parte |
| --- | --- |
| Ivie Eduardo Muñoz García | Servidores Docker y usuario de lectura, integración del backend, panel principal y módulos 1, 2, 3, 4, 5, 6, 8 y 9 del frontend, pruebas P01–P14 |
| Goreti | Repositorio, `compose.yaml` y script de MediStock iniciales, módulos 7 (Mantenimiento) y 10 (Historial) del frontend |
| Pedro | Backend FastAPI (61 endpoints), contrato de la API y consola técnica |