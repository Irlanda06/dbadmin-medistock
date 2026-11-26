-- ============================================================================
-- DBAdmin | Usuario de solo lectura para el editor SQL y el explorador
-- Ejecutar UNA VEZ en cada nodo (Norte 5451 y Sur 5452), conectado a la base
-- "medistock" como adminlab. Es el mismo archivo para los dos nodos.
-- ============================================================================

-- 1. El rol: puede iniciar sesión, pero no es superusuario ni crea nada.
CREATE ROLE dbadmin_reader LOGIN PASSWORD 'ReaderLab2026'
    NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- 2. Toda sesión de este rol arranca en modo lectura (segundo candado).
ALTER ROLE dbadmin_reader SET default_transaction_read_only = on;

-- 3. Permisos mínimos para leer MediStock.
GRANT CONNECT ON DATABASE medistock TO dbadmin_reader;
GRANT USAGE ON SCHEMA medistock TO dbadmin_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA medistock TO dbadmin_reader;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA medistock TO dbadmin_reader;

-- 4. Lo que adminlab cree después en medistock (tabla externa y vista global
--    del módulo de distribución) también será legible por el lector.
ALTER DEFAULT PRIVILEGES FOR ROLE adminlab IN SCHEMA medistock
    GRANT SELECT ON TABLES TO dbadmin_reader;
ALTER DEFAULT PRIVILEGES FOR ROLE adminlab IN SCHEMA medistock
    GRANT SELECT ON SEQUENCES TO dbadmin_reader;

-- 5. Comprobación: debe regresar una fila con lectura = true y escritura = false.
SELECT rolname,
       has_table_privilege('dbadmin_reader', 'medistock.inventario', 'SELECT') AS lectura,
       has_table_privilege('dbadmin_reader', 'medistock.inventario', 'INSERT') AS escritura
FROM pg_roles
WHERE rolname = 'dbadmin_reader';
