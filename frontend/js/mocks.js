// Generado automáticamente desde DBAdmin_61_Endpoints_Una_Hoja.xlsx (Pedro).
// Son los JSON de ejemplo del contrato: sirven para el MODO_PRUEBA.
// No editar a mano: volver a correr scripts/generar_mocks.py si cambia el Excel.

export const ENDPOINTS = [
  {
    "id": "E01",
    "modulo": "01 Conexiones",
    "metodo": "GET",
    "ruta": "/api/v1/servers",
    "finalidad": "Listar perfiles registrados",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "id": 1,
            "name": "MediStock Norte",
            "host": "192.168.1.150",
            "port": 5451,
            "database": "medistock",
            "username": "adminlab",
            "passwordConfigured": true
          }
        ],
        "total": 1
      }
    },
    "errores": "500 STORAGE_ERROR",
    "pruebas": "P01"
  },
  {
    "id": "E02",
    "modulo": "01 Conexiones",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId",
    "finalidad": "Consultar perfil",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "id": 1,
        "name": "MediStock Norte",
        "host": "192.168.1.150",
        "port": 5451,
        "database": "medistock",
        "username": "adminlab",
        "passwordConfigured": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E03",
    "modulo": "01 Conexiones",
    "metodo": "POST",
    "ruta": "/api/v1/servers",
    "finalidad": "Registrar instancia existente",
    "http": 201,
    "entrada": {
      "name": "MediStock Norte",
      "host": "192.168.1.150",
      "port": 5451,
      "database": "medistock",
      "username": "adminlab",
      "password": "<secreto>"
    },
    "respuesta": {
      "ok": true,
      "data": {
        "id": 1,
        "name": "MediStock Norte",
        "host": "192.168.1.150",
        "port": 5451,
        "database": "medistock",
        "username": "adminlab",
        "passwordConfigured": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 409 PROFILE_EXISTS; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E04",
    "modulo": "01 Conexiones",
    "metodo": "PUT",
    "ruta": "/api/v1/servers/:serverId",
    "finalidad": "Editar perfil",
    "http": 200,
    "entrada": {
      "name": "MediStock Norte",
      "host": "192.168.1.150",
      "port": 5451,
      "database": "medistock",
      "username": "adminlab"
    },
    "respuesta": {
      "ok": true,
      "data": {
        "id": 1,
        "name": "MediStock Norte",
        "host": "192.168.1.150",
        "port": 5451,
        "database": "medistock",
        "username": "adminlab",
        "passwordConfigured": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E05",
    "modulo": "01 Conexiones",
    "metodo": "DELETE",
    "ruta": "/api/v1/servers/:serverId",
    "finalidad": "Eliminar perfil",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "id": 1,
        "deleted": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E06",
    "modulo": "01 Conexiones",
    "metodo": "POST",
    "ruta": "/api/v1/servers/test",
    "finalidad": "Probar conexión no guardada",
    "http": 200,
    "entrada": {
      "name": "MediStock Norte",
      "host": "192.168.1.150",
      "port": 5451,
      "database": "medistock",
      "username": "adminlab",
      "password": "<secreto>"
    },
    "respuesta": {
      "ok": true,
      "data": {
        "reachable": true,
        "version": "18.x",
        "database": "medistock",
        "username": "adminlab",
        "serverAddress": "172.20.0.2",
        "serverPort": 5432,
        "status": "ONLINE"
      }
    },
    "errores": "400 VALIDATION_ERROR; 401 DB_AUTH_FAILED; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E07",
    "modulo": "01 Conexiones",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/test",
    "finalidad": "Probar conexión guardada",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "reachable": true,
        "version": "18.x",
        "database": "medistock",
        "username": "adminlab",
        "serverAddress": "172.20.0.2",
        "serverPort": 5432,
        "status": "ONLINE"
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E08",
    "modulo": "01 Conexiones",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/connect",
    "finalidad": "Conectar servidor seleccionado",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "serverId": 1,
        "connected": true,
        "version": "18.x",
        "database": "medistock",
        "username": "adminlab",
        "serverAddress": "172.20.0.2",
        "serverPort": 5432,
        "status": "ONLINE"
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E09",
    "modulo": "01 Conexiones",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/disconnect",
    "finalidad": "Desconectar servidor",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "serverId": 1,
        "connected": false
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E10",
    "modulo": "01 Conexiones",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/status",
    "finalidad": "Verificar caída y recuperación",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "serverId": 1,
        "status": "ONLINE",
        "checkedAt": "2026-11-25T16:00:00Z",
        "latencyMs": 8
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01, P13"
  },
  {
    "id": "E11",
    "modulo": "01 Conexiones",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/info",
    "finalidad": "Mostrar versión, usuario y servidor",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "version": "18.x",
        "database": "medistock",
        "username": "adminlab",
        "serverAddress": "172.20.0.2",
        "serverPort": 5432,
        "status": "ONLINE"
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01"
  },
  {
    "id": "E12",
    "modulo": "01 Conexiones",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases",
    "finalidad": "Listar bases disponibles",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "name": "medistock",
            "canConnect": true
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P01, P05"
  },
  {
    "id": "E13",
    "modulo": "02 Exploración",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/schemas",
    "finalidad": "Listar esquemas",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "name": "medistock"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P02"
  },
  {
    "id": "E14",
    "modulo": "02 Exploración",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/tables",
    "finalidad": "Listar tablas",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "schema": "medistock",
            "name": "inventario",
            "type": "TABLE"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P02"
  },
  {
    "id": "E15",
    "modulo": "02 Exploración",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/views",
    "finalidad": "Listar vistas",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "schema": "distribuido",
            "name": "inventario_global",
            "type": "VIEW"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P02"
  },
  {
    "id": "E16",
    "modulo": "02 Exploración",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/sequences",
    "finalidad": "Listar secuencias",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "schema": "medistock",
            "name": "seq_prueba"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P02"
  },
  {
    "id": "E17",
    "modulo": "02 Exploración",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/objects/:schema/:object/columns",
    "finalidad": "Consultar columnas",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "name": "id_sucursal",
            "type": "integer",
            "nullable": false,
            "position": 1
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P02"
  },
  {
    "id": "E18",
    "modulo": "02 Exploración",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/catalogs",
    "finalidad": "Explorar catálogos",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "columns": [
          "relname"
        ],
        "rows": [
          [
            "inventario"
          ]
        ],
        "rowCount": 1
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P02"
  },
  {
    "id": "E19",
    "modulo": "02 Exploración",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/objects/:schema/:object/data",
    "finalidad": "Mostrar filas de tabla o vista",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "columns": [
          "id_sucursal",
          "id_medicamento",
          "existencia",
          "punto_reorden",
          "actualizado_en"
        ],
        "rows": [
          [
            1,
            1,
            25,
            10,
            "2026-11-25T16:00:00Z"
          ]
        ],
        "rowCount": 1,
        "limit": 1,
        "offset": 0,
        "truncated": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P02"
  },
  {
    "id": "E20",
    "modulo": "02 Exploración",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/query",
    "finalidad": "Ejecutar SQL de solo lectura",
    "http": 200,
    "entrada": {
      "sql": "SELECT id_sucursal, count(*) AS total FROM medistock.inventario GROUP BY id_sucursal",
      "limit": 100
    },
    "respuesta": {
      "ok": true,
      "data": {
        "columns": [
          "id_sucursal",
          "total"
        ],
        "rows": [
          [
            1,
            30
          ]
        ],
        "rowCount": 1,
        "executionTimeMs": 12,
        "truncated": false
      }
    },
    "errores": "400 VALIDATION_ERROR; 403 READ_ONLY_REQUIRED; 422 SQL_ERROR; 504 QUERY_TIMEOUT; 503 NODE_UNAVAILABLE",
    "pruebas": "P02, P12"
  },
  {
    "id": "E21",
    "modulo": "03 Respaldos",
    "metodo": "POST",
    "ruta": "/api/v1/backups",
    "finalidad": "Generar respaldo configurable",
    "http": 202,
    "entrada": {
      "serverId": 1,
      "database": "medistock",
      "scope": "DATABASE",
      "format": "CUSTOM",
      "fileName": "norte.dump",
      "destination": "backups/norte",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "id": 10,
        "operationId": 101,
        "status": "QUEUED"
      }
    },
    "errores": "400 VALIDATION_ERROR; 409 FILE_EXISTS; 503 NODE_UNAVAILABLE",
    "pruebas": "P03, P04"
  },
  {
    "id": "E22",
    "modulo": "03 Respaldos",
    "metodo": "GET",
    "ruta": "/api/v1/backups",
    "finalidad": "Listar historial de respaldos",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "id": 10,
            "operationId": 101,
            "serverId": 1,
            "database": "medistock",
            "scope": "DATABASE",
            "format": "CUSTOM",
            "fileName": "norte.dump",
            "destination": "backups/norte",
            "status": "SUCCEEDED",
            "sizeBytes": 32000,
            "startedAt": "2026-11-25T16:00:00Z",
            "finishedAt": "2026-11-25T16:00:04Z"
          }
        ],
        "total": 1
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P03, P04, P14"
  },
  {
    "id": "E23",
    "modulo": "03 Respaldos",
    "metodo": "GET",
    "ruta": "/api/v1/backups/:id",
    "finalidad": "Detalle y estado del respaldo",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "id": 10,
        "operationId": 101,
        "serverId": 1,
        "database": "medistock",
        "scope": "DATABASE",
        "format": "CUSTOM",
        "fileName": "norte.dump",
        "destination": "backups/norte",
        "status": "SUCCEEDED",
        "sizeBytes": 32000,
        "startedAt": "2026-11-25T16:00:00Z",
        "finishedAt": "2026-11-25T16:00:04Z"
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P03, P04"
  },
  {
    "id": "E24",
    "modulo": "03 Respaldos",
    "metodo": "GET",
    "ruta": "/api/v1/backups/:id/download",
    "finalidad": "Descargar archivo de respaldo (apoyo al flujo)",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "fileName": "norte.dump",
        "sizeBytes": 32000,
        "contentType": "application/octet-stream"
      }
    },
    "errores": "404 NOT_FOUND; 409 BACKUP_NOT_READY",
    "pruebas": "P03, P04"
  },
  {
    "id": "E25",
    "modulo": "04 Restauraciones",
    "metodo": "POST",
    "ruta": "/api/v1/restores/validate",
    "finalidad": "Validar respaldo y destino",
    "http": 200,
    "entrada": {
      "backupId": 10,
      "targetServerId": 2,
      "targetDatabase": "medistock_test"
    },
    "respuesta": {
      "ok": true,
      "data": {
        "valid": true,
        "format": "CUSTOM",
        "targetExists": false,
        "protected": false
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P05"
  },
  {
    "id": "E26",
    "modulo": "04 Restauraciones",
    "metodo": "POST",
    "ruta": "/api/v1/restores",
    "finalidad": "Crear BD nueva y restaurar",
    "http": 202,
    "entrada": {
      "backupId": 10,
      "targetServerId": 2,
      "targetDatabase": "medistock_test",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "id": 20,
        "operationId": 102,
        "status": "QUEUED"
      }
    },
    "errores": "400 VALIDATION_ERROR; 409 TARGET_EXISTS; 403 PROTECTED_DATABASE; 503 NODE_UNAVAILABLE",
    "pruebas": "P05"
  },
  {
    "id": "E27",
    "modulo": "04 Restauraciones",
    "metodo": "GET",
    "ruta": "/api/v1/restores",
    "finalidad": "Listar restauraciones",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "id": 20,
            "operationId": 102,
            "backupId": 10,
            "targetServerId": 2,
            "targetDatabase": "medistock_test",
            "status": "SUCCEEDED",
            "verified": true
          }
        ],
        "total": 1
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P05, P14"
  },
  {
    "id": "E28",
    "modulo": "04 Restauraciones",
    "metodo": "GET",
    "ruta": "/api/v1/restores/:id",
    "finalidad": "Detalle y estado",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "id": 20,
        "operationId": 102,
        "backupId": 10,
        "targetServerId": 2,
        "targetDatabase": "medistock_test",
        "status": "SUCCEEDED",
        "verified": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P05"
  },
  {
    "id": "E29",
    "modulo": "04 Restauraciones",
    "metodo": "GET",
    "ruta": "/api/v1/restores/:id/verification",
    "finalidad": "Verificar tablas y recuentos",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "database": "medistock_test",
        "verified": true,
        "tableCounts": [
          {
            "schema": "medistock",
            "table": "inventario",
            "count": 30
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P05"
  },
  {
    "id": "E30",
    "modulo": "05 Roles",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/roles",
    "finalidad": "Listar usuarios y grupos",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "name": "analista",
            "login": true,
            "inherit": true,
            "createDb": false,
            "createRole": false,
            "superuser": false
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P06, P07"
  },
  {
    "id": "E31",
    "modulo": "05 Roles",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/roles/:role",
    "finalidad": "Consultar atributos de rol",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "name": "analista",
        "login": true,
        "inherit": true,
        "createDb": false,
        "createRole": false,
        "superuser": false
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P06, P07"
  },
  {
    "id": "E32",
    "modulo": "05 Roles",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/roles",
    "finalidad": "Crear usuario LOGIN o grupo NOLOGIN",
    "http": 201,
    "entrada": {
      "name": "analista",
      "login": true,
      "password": "<secreto>",
      "inherit": true,
      "createDb": false,
      "createRole": false,
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "name": "analista",
        "login": true,
        "inherit": true,
        "createDb": false,
        "createRole": false,
        "superuser": false
      }
    },
    "errores": "400 VALIDATION_ERROR; 409 ROLE_EXISTS; 403 FORBIDDEN_ROLE",
    "pruebas": "P06"
  },
  {
    "id": "E33",
    "modulo": "05 Roles",
    "metodo": "PATCH",
    "ruta": "/api/v1/servers/:serverId/roles/:role",
    "finalidad": "Modificar atributos permitidos",
    "http": 200,
    "entrada": {
      "createDb": true,
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "name": "analista",
        "login": true,
        "inherit": true,
        "createDb": true,
        "createRole": false,
        "superuser": false
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P07"
  },
  {
    "id": "E34",
    "modulo": "05 Roles",
    "metodo": "PATCH",
    "ruta": "/api/v1/servers/:serverId/roles/:role/password",
    "finalidad": "Cambiar contraseña",
    "http": 200,
    "entrada": {
      "password": "<nuevo-secreto>",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "name": "analista",
        "passwordChanged": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P07"
  },
  {
    "id": "E35",
    "modulo": "05 Roles",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/roles/:role/members",
    "finalidad": "Consultar miembros del grupo",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "role": "grupo_lectura",
        "members": [
          {
            "name": "analista",
            "adminOption": false
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P06"
  },
  {
    "id": "E36",
    "modulo": "05 Roles",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/roles/:role/members",
    "finalidad": "Agregar miembro",
    "http": 200,
    "entrada": {
      "member": "analista",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "role": "grupo_lectura",
        "members": [
          "analista"
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P06"
  },
  {
    "id": "E37",
    "modulo": "05 Roles",
    "metodo": "DELETE",
    "ruta": "/api/v1/servers/:serverId/roles/:role/members/:member",
    "finalidad": "Retirar miembro",
    "http": 200,
    "entrada": {
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "role": "grupo_lectura",
        "members": []
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P06"
  },
  {
    "id": "E38",
    "modulo": "06 Privilegios",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/privileges",
    "finalidad": "Consultar privilegios actuales",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "role": "grupo_lectura",
        "objectType": "TABLE",
        "schema": "medistock",
        "object": "inventario",
        "direct": [
          "SELECT"
        ],
        "inherited": [],
        "public": [],
        "effective": [
          "SELECT"
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P08"
  },
  {
    "id": "E39",
    "modulo": "06 Privilegios",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/privileges/effective",
    "finalidad": "Consultar permisos efectivos",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "role": "analista",
        "effective": [
          "SELECT"
        ],
        "sources": [
          {
            "privilege": "SELECT",
            "source": "grupo_lectura"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P08"
  },
  {
    "id": "E40",
    "modulo": "06 Privilegios",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/privileges/grant",
    "finalidad": "Conceder permiso",
    "http": 200,
    "entrada": {
      "role": "grupo_lectura",
      "objectType": "TABLE",
      "schema": "medistock",
      "object": "inventario",
      "privileges": [
        "SELECT"
      ],
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "operationId": 103,
        "before": {
          "direct": [],
          "effective": []
        },
        "after": {
          "direct": [
            "SELECT"
          ],
          "effective": [
            "SELECT"
          ]
        }
      }
    },
    "errores": "400 VALIDATION_ERROR; 403 INSUFFICIENT_PRIVILEGE; 422 SQL_ERROR",
    "pruebas": "P08"
  },
  {
    "id": "E41",
    "modulo": "06 Privilegios",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/privileges/revoke",
    "finalidad": "Revocar permiso",
    "http": 200,
    "entrada": {
      "role": "grupo_lectura",
      "objectType": "TABLE",
      "schema": "medistock",
      "object": "inventario",
      "privileges": [
        "SELECT"
      ],
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "operationId": 103,
        "before": {
          "direct": [
            "SELECT"
          ],
          "effective": [
            "SELECT"
          ]
        },
        "after": {
          "direct": [],
          "effective": []
        }
      }
    },
    "errores": "400 VALIDATION_ERROR; 403 INSUFFICIENT_PRIVILEGE; 422 SQL_ERROR",
    "pruebas": "P08"
  },
  {
    "id": "E42",
    "modulo": "07 Mantenimiento",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/maintenance/analyze",
    "finalidad": "Ejecutar ANALYZE",
    "http": 202,
    "entrada": {
      "schema": "medistock",
      "table": "inventario",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "operationId": 104,
        "status": "QUEUED",
        "operation": "ANALYZE"
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P09"
  },
  {
    "id": "E43",
    "modulo": "07 Mantenimiento",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/maintenance/vacuum",
    "finalidad": "Ejecutar VACUUM (ANALYZE)",
    "http": 202,
    "entrada": {
      "schema": "medistock",
      "table": "inventario",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "operationId": 104,
        "status": "QUEUED",
        "operation": "VACUUM_ANALYZE"
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P09"
  },
  {
    "id": "E44",
    "modulo": "07 Mantenimiento",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/maintenance/statistics",
    "finalidad": "Verificar estadísticas de tabla",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "schema": "medistock",
        "table": "inventario",
        "lastAnalyze": "2026-11-25T16:00:00Z",
        "lastVacuum": "2026-11-25T16:00:00Z",
        "liveTuplesEstimate": 30
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P09"
  },
  {
    "id": "E45",
    "modulo": "07 Mantenimiento",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/maintenance/history",
    "finalidad": "Consultar mantenimiento realizado",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "operationId": 104,
            "operation": "VACUUM_ANALYZE",
            "object": "medistock.inventario",
            "status": "SUCCEEDED",
            "finishedAt": "2026-11-25T16:00:00Z"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P09, P14"
  },
  {
    "id": "E46",
    "modulo": "08 Sesiones y bloqueos",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/sessions",
    "finalidad": "Listar sesiones y consultas",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "pid": 1234,
            "username": "adminlab",
            "database": "medistock",
            "state": "active",
            "durationMs": 5000,
            "query": "UPDATE medistock.inventario SET existencia = existencia WHERE id_sucursal = 1"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P10"
  },
  {
    "id": "E47",
    "modulo": "08 Sesiones y bloqueos",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/sessions/:pid",
    "finalidad": "Detalle de una sesión",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "pid": 1234,
        "username": "adminlab",
        "database": "medistock",
        "state": "active",
        "durationMs": 5000,
        "query": "UPDATE medistock.inventario SET existencia = existencia WHERE id_sucursal = 1"
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P10"
  },
  {
    "id": "E48",
    "modulo": "08 Sesiones y bloqueos",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/locks",
    "finalidad": "Identificar bloqueado y bloqueador",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "blockedPid": 1234,
            "blockingPids": [
              1235
            ],
            "database": "medistock",
            "waitEvent": "transactionid",
            "blockedQuery": "UPDATE medistock.inventario ..."
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P10"
  },
  {
    "id": "E49",
    "modulo": "09 Distribución FDW",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/extension",
    "finalidad": "Habilitar postgres_fdw",
    "http": 200,
    "entrada": {
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "extension": "postgres_fdw",
        "installed": true,
        "operationId": 105
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E50",
    "modulo": "09 Distribución FDW",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/servers",
    "finalidad": "Listar servidores remotos",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "name": "fdw_sur",
            "host": "nodo_sur",
            "port": 5432,
            "remoteDatabase": "medistock"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E51",
    "modulo": "09 Distribución FDW",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/servers",
    "finalidad": "Registrar servidor remoto FDW",
    "http": 201,
    "entrada": {
      "name": "fdw_sur",
      "host": "nodo_sur",
      "port": 5432,
      "remoteDatabase": "medistock",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "name": "fdw_sur",
        "host": "nodo_sur",
        "port": 5432,
        "remoteDatabase": "medistock",
        "operationId": 106
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E52",
    "modulo": "09 Distribución FDW",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/user-mappings",
    "finalidad": "Listar mapeos de usuario",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "foreignServer": "fdw_sur",
            "localRole": "lector_dbadmin",
            "remoteUser": "lector_sur"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E53",
    "modulo": "09 Distribución FDW",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/user-mappings",
    "finalidad": "Crear mapeo de usuario",
    "http": 201,
    "entrada": {
      "foreignServer": "fdw_sur",
      "localRole": "lector_dbadmin",
      "remoteUser": "lector_sur",
      "remotePassword": "<secreto>",
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "foreignServer": "fdw_sur",
        "localRole": "lector_dbadmin",
        "remoteUser": "lector_sur",
        "operationId": 107
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E54",
    "modulo": "09 Distribución FDW",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/foreign-tables",
    "finalidad": "Listar tablas externas",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "schema": "distribuido",
            "name": "inventario_sur",
            "foreignServer": "fdw_sur",
            "remoteSchema": "medistock",
            "remoteTable": "inventario"
          }
        ]
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E55",
    "modulo": "09 Distribución FDW",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/foreign-tables",
    "finalidad": "Crear tabla externa desde formulario",
    "http": 201,
    "entrada": {
      "schema": "distribuido",
      "name": "inventario_sur",
      "foreignServer": "fdw_sur",
      "remoteSchema": "medistock",
      "remoteTable": "inventario",
      "createSchema": true,
      "columns": [
        {
          "name": "id_sucursal",
          "type": "integer"
        },
        {
          "name": "id_medicamento",
          "type": "integer"
        },
        {
          "name": "existencia",
          "type": "integer"
        },
        {
          "name": "punto_reorden",
          "type": "integer"
        },
        {
          "name": "actualizado_en",
          "type": "timestamptz"
        }
      ],
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "schema": "distribuido",
        "name": "inventario_sur",
        "foreignServer": "fdw_sur",
        "remoteSchema": "medistock",
        "remoteTable": "inventario",
        "operationId": 108
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E56",
    "modulo": "09 Distribución FDW",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/test",
    "finalidad": "Probar conexión y permisos remotos",
    "http": 200,
    "entrada": {
      "foreignServer": "fdw_sur",
      "schema": "distribuido",
      "table": "inventario_sur"
    },
    "respuesta": {
      "ok": true,
      "data": {
        "reachable": true,
        "canSelect": true,
        "rowCount": 30
      }
    },
    "errores": "400 VALIDATION_ERROR; 403 INSUFFICIENT_PRIVILEGE; 503 REMOTE_NODE_UNAVAILABLE; 422 SQL_ERROR",
    "pruebas": "P11, P13"
  },
  {
    "id": "E57",
    "modulo": "09 Distribución FDW",
    "metodo": "POST",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/views",
    "finalidad": "Crear vista global UNION ALL",
    "http": 201,
    "entrada": {
      "schema": "distribuido",
      "name": "inventario_global",
      "localSchema": "medistock",
      "localTable": "inventario",
      "foreignSchema": "distribuido",
      "foreignTable": "inventario_sur",
      "columns": [
        "id_sucursal",
        "id_medicamento",
        "existencia",
        "punto_reorden",
        "actualizado_en"
      ],
      "confirmed": true
    },
    "respuesta": {
      "ok": true,
      "data": {
        "schema": "distribuido",
        "name": "inventario_global",
        "operationId": 109
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P11"
  },
  {
    "id": "E58",
    "modulo": "09 Distribución FDW",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/inventory",
    "finalidad": "Consultar inventario global",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "columns": [
          "id_sucursal",
          "id_medicamento",
          "existencia",
          "punto_reorden",
          "actualizado_en"
        ],
        "rows": [
          [
            1,
            1,
            25,
            10,
            "2026-11-25T16:00:00Z"
          ],
          [
            2,
            1,
            40,
            10,
            "2026-11-25T16:00:00Z"
          ]
        ],
        "rowCount": 2,
        "total": 60,
        "byBranch": [
          {
            "id_sucursal": 1,
            "count": 30
          },
          {
            "id_sucursal": 2,
            "count": 30
          }
        ],
        "truncated": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 503 REMOTE_NODE_UNAVAILABLE; 504 QUERY_TIMEOUT; 422 SQL_ERROR",
    "pruebas": "P12, P13"
  },
  {
    "id": "E59",
    "modulo": "09 Distribución FDW",
    "metodo": "GET",
    "ruta": "/api/v1/servers/:serverId/databases/:database/fdw/inventory/details",
    "finalidad": "Consultar JOIN de medicamentos e inventario",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "columns": [
          "id_sucursal",
          "id_medicamento",
          "nombre",
          "existencia"
        ],
        "rows": [
          [
            1,
            1,
            "Paracetamol 500 mg",
            25
          ]
        ],
        "rowCount": 1,
        "truncated": true
      }
    },
    "errores": "400 VALIDATION_ERROR; 503 REMOTE_NODE_UNAVAILABLE; 422 SQL_ERROR",
    "pruebas": "P12, P13"
  },
  {
    "id": "E60",
    "modulo": "10 Historial",
    "metodo": "GET",
    "ruta": "/api/v1/history",
    "finalidad": "Listar y filtrar historial persistente",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "items": [
          {
            "id": 101,
            "operationType": "BACKUP",
            "serverId": 1,
            "serverName": "MediStock Norte",
            "database": "medistock",
            "object": "medistock",
            "executedBy": "operador",
            "status": "SUCCEEDED",
            "startedAt": "2026-11-25T16:00:00Z",
            "finishedAt": "2026-11-25T16:00:04Z",
            "error": null
          }
        ],
        "total": 1
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P14, P03–P11"
  },
  {
    "id": "E61",
    "modulo": "10 Historial",
    "metodo": "GET",
    "ruta": "/api/v1/history/:id",
    "finalidad": "Consultar detalle y estado de operación",
    "http": 200,
    "entrada": null,
    "respuesta": {
      "ok": true,
      "data": {
        "id": 101,
        "operationType": "BACKUP",
        "serverId": 1,
        "serverName": "MediStock Norte",
        "database": "medistock",
        "object": "medistock",
        "executedBy": "operador",
        "status": "SUCCEEDED",
        "startedAt": "2026-11-25T16:00:00Z",
        "finishedAt": "2026-11-25T16:00:04Z",
        "error": null,
        "details": {
          "format": "CUSTOM",
          "sizeBytes": 32000
        }
      }
    },
    "errores": "400 VALIDATION_ERROR; 404 NOT_FOUND; 503 NODE_UNAVAILABLE",
    "pruebas": "P14, P03–P11"
  }
];
