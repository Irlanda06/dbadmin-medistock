-- ============================================================================
-- MEDISTOCK | BASE DE DATOS DE PRUEBA PARA DBADMIN
-- PostgreSQL 18 | Ejecutar UNA SOLA VEZ en cada nodo de Docker Compose.
-- ============================================================================
-- PREPARACION:
-- 1. En pgAdmin, conectarse a la base "medistock" de nodo_norte (puerto 5451).
--    Ejecutar el archivo completo dejando la palabra 'NORTE' en la linea marcada.
-- 2. En pgAdmin, conectarse a la base "medistock" de nodo_sur (puerto 5452).
--    Ejecutar el MISMO archivo completo cambiando 'NORTE' por 'SUR'.
-- 3. El archivo crea las tablas y los datos; la base "medistock" ya la crea Docker.
-- 4. No contiene DROP ni borra tablas. Si ya existe el esquema, no lo ejecutes
--    otra vez: el inicio de la transaccion fallara para evitar duplicaciones.
-- Los nombres, correos, personas, ventas y movimientos son ficticios.
-- ============================================================================

BEGIN;

-- MODIFICA SOLO ESTE VALOR SEGUN EL NODO: 'NORTE' O 'SUR'.
SELECT set_config('medistock.nodo', 'NORTE', true);

DO $$
BEGIN
    IF current_setting('medistock.nodo') NOT IN ('NORTE', 'SUR') THEN
        RAISE EXCEPTION 'Valor de nodo invalido: use NORTE o SUR';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'medistock') THEN
        RAISE EXCEPTION 'El esquema medistock ya existe. No repitas el script.';
    END IF;
END
$$;

CREATE SCHEMA medistock;

-- 1. CATALOGO COMPARTIDO POR AMBAS SUCURSALES
CREATE TABLE medistock.sucursales (
    id_sucursal   INTEGER PRIMARY KEY,
    nombre        VARCHAR(60) NOT NULL UNIQUE,
    ciudad        VARCHAR(60) NOT NULL
);

CREATE TABLE medistock.proveedores (
    id_proveedor  INTEGER PRIMARY KEY,
    razon_social  VARCHAR(100) NOT NULL,
    correo        VARCHAR(120) UNIQUE
);

CREATE TABLE medistock.medicamentos (
    id_medicamento INTEGER PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    categoria      VARCHAR(50) NOT NULL,
    precio         NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    id_proveedor   INTEGER NOT NULL REFERENCES medistock.proveedores(id_proveedor)
);

CREATE TABLE medistock.empleados (
    id_empleado  INTEGER PRIMARY KEY,
    id_sucursal  INTEGER NOT NULL REFERENCES medistock.sucursales(id_sucursal),
    nombre       VARCHAR(100) NOT NULL,
    puesto       VARCHAR(40) NOT NULL
);

-- 2. DATOS OPERATIVOS: CADA NODO GUARDA SOLO SU SUCURSAL
CREATE TABLE medistock.inventario (
    id_sucursal    INTEGER NOT NULL REFERENCES medistock.sucursales(id_sucursal),
    id_medicamento INTEGER NOT NULL REFERENCES medistock.medicamentos(id_medicamento),
    existencia     INTEGER NOT NULL CHECK (existencia >= 0),
    punto_reorden  INTEGER NOT NULL CHECK (punto_reorden >= 0),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id_sucursal, id_medicamento)
);

CREATE TABLE medistock.ventas (
    id_venta     INTEGER PRIMARY KEY,
    id_sucursal  INTEGER NOT NULL REFERENCES medistock.sucursales(id_sucursal),
    id_empleado  INTEGER NOT NULL REFERENCES medistock.empleados(id_empleado),
    fecha        TIMESTAMPTZ NOT NULL,
    estado       VARCHAR(15) NOT NULL CHECK (estado IN ('PAGADA', 'CANCELADA'))
);

CREATE TABLE medistock.detalle_ventas (
    id_venta       INTEGER NOT NULL REFERENCES medistock.ventas(id_venta),
    id_medicamento INTEGER NOT NULL REFERENCES medistock.medicamentos(id_medicamento),
    cantidad       INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario > 0),
    PRIMARY KEY (id_venta, id_medicamento)
);

CREATE TABLE medistock.movimientos_inventario (
    id_movimiento  INTEGER PRIMARY KEY,
    id_sucursal   INTEGER NOT NULL REFERENCES medistock.sucursales(id_sucursal),
    id_medicamento INTEGER NOT NULL REFERENCES medistock.medicamentos(id_medicamento),
    tipo          VARCHAR(12) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
    cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
    fecha         TIMESTAMPTZ NOT NULL,
    observacion   VARCHAR(150)
);

-- 3. REGISTROS DE CATALOGO (IGUALES EN NORTE Y SUR)
INSERT INTO medistock.sucursales VALUES
    (1, 'MediStock Norte', 'Guadalajara'),
    (2, 'MediStock Sur', 'Tlaquepaque');

INSERT INTO medistock.proveedores VALUES
    (1, 'Laboratorios Horizonte', 'ventas@horizonte.example'),
    (2, 'Distribuidora Salud', 'pedidos@salud.example'),
    (3, 'Farmaceutica Integral', 'contacto@integral.example'),
    (4, 'Suministros Clinicos', 'atencion@clinicos.example');

-- Productos de ejemplo, solo para pruebas de administracion de datos.
INSERT INTO medistock.medicamentos
    (id_medicamento, nombre, categoria, precio, id_proveedor)
VALUES
    ( 1, 'Paracetamol 500 mg',            'Analgesicos',     38.50, 1),
    ( 2, 'Ibuprofeno 400 mg',             'Analgesicos',     52.00, 2),
    ( 3, 'Naproxeno 250 mg',              'Analgesicos',     63.00, 3),
    ( 4, 'Acido acetilsalicilico 100 mg','Analgesicos',     46.50, 4),
    ( 5, 'Loratadina 10 mg',              'Antialergicos',   49.00, 1),
    ( 6, 'Cetirizina 10 mg',              'Antialergicos',   59.00, 2),
    ( 7, 'Solucion salina 100 ml',        'Curacion',        25.00, 3),
    ( 8, 'Agua oxigenada 120 ml',         'Curacion',        29.00, 4),
    ( 9, 'Alcohol 70 por ciento 250 ml', 'Higiene',         37.00, 1),
    (10, 'Gel antibacterial 250 ml',      'Higiene',         45.00, 2),
    (11, 'Gasas esteriles',               'Curacion',        34.00, 3),
    (12, 'Vendas elasticas',              'Curacion',        55.00, 4),
    (13, 'Cinta microporosa',            'Curacion',        28.00, 1),
    (14, 'Termometro digital',           'Equipo medico',  115.00, 2),
    (15, 'Cubrebocas paquete 10',        'Higiene',         39.00, 3),
    (16, 'Guantes desechables caja',     'Higiene',        189.00, 4),
    (17, 'Vitamina C 500 mg',            'Vitaminas',       88.00, 1),
    (18, 'Multivitaminico 30 capsulas',  'Vitaminas',      145.00, 2),
    (19, 'Vitamina D 1000 UI',           'Vitaminas',      129.00, 3),
    (20, 'Calcio 600 mg',                'Vitaminas',      120.00, 4),
    (21, 'Suero oral 500 ml',            'Hidratacion',     29.50, 1),
    (22, 'Electrolitos sobres',          'Hidratacion',     42.00, 2),
    (23, 'Jabon neutro 90 g',            'Higiene',         26.00, 3),
    (24, 'Shampoo suave 250 ml',         'Higiene',         69.00, 4),
    (25, 'Crema hidratante 200 ml',      'Cuidado personal',98.00, 1),
    (26, 'Protector solar FPS 50',       'Cuidado personal',235.00, 2),
    (27, 'Cepillo dental suave',         'Higiene',         35.00, 3),
    (28, 'Pasta dental 100 ml',          'Higiene',         47.00, 4),
    (29, 'Tiras adhesivas paquete 20',   'Curacion',        31.00, 1),
    (30, 'Compresa fria reutilizable',  'Curacion',        79.00, 2);

INSERT INTO medistock.empleados VALUES
    (101, 1, 'Elena Mora',  'Encargada'),
    (102, 1, 'Pedro Vega',  'Cajero'),
    (201, 2, 'Lucia Rios', 'Encargada'),
    (202, 2, 'Daniel Cruz','Cajero');

-- 4. INVENTARIO: 30 FILAS POR NODO, TODAS DE SU PROPIA SUCURSAL.
INSERT INTO medistock.inventario
    (id_sucursal, id_medicamento, existencia, punto_reorden)
SELECT
    CASE current_setting('medistock.nodo') WHEN 'NORTE' THEN 1 ELSE 2 END,
    i,
    CASE current_setting('medistock.nodo')
        WHEN 'NORTE' THEN 25 + (i * 7 % 90)
        ELSE 17 + (i * 11 % 95)
    END,
    15
FROM generate_series(1, 30) AS i;

-- Ventas: 40 registros exclusivos de cada sucursal.
INSERT INTO medistock.ventas
    (id_venta, id_sucursal, id_empleado, fecha, estado)
SELECT
    (CASE current_setting('medistock.nodo') WHEN 'NORTE' THEN 1000 ELSE 2000 END) + i,
    CASE current_setting('medistock.nodo') WHEN 'NORTE' THEN 1 ELSE 2 END,
    CASE current_setting('medistock.nodo') WHEN 'NORTE' THEN 101 ELSE 201 END,
    TIMESTAMPTZ '2026-10-01 09:00:00-06' + i * INTERVAL '5 hours',
    CASE WHEN i % 13 = 0 THEN 'CANCELADA' ELSE 'PAGADA' END
FROM generate_series(1, 40) AS i;

-- Un renglon de detalle por venta (40 detalles en cada nodo).
INSERT INTO medistock.detalle_ventas
    (id_venta, id_medicamento, cantidad, precio_unitario)
SELECT v.id_venta,
       ((v.id_venta % 30) + 1),
       (v.id_venta % 3) + 1,
       m.precio
FROM medistock.ventas AS v
JOIN medistock.medicamentos AS m
  ON m.id_medicamento = ((v.id_venta % 30) + 1);

-- Movimientos: 60 registros diferentes en Norte y en Sur.
INSERT INTO medistock.movimientos_inventario
    (id_movimiento, id_sucursal, id_medicamento, tipo, cantidad, fecha, observacion)
SELECT
    (CASE current_setting('medistock.nodo') WHEN 'NORTE' THEN 10000 ELSE 20000 END) + i,
    CASE current_setting('medistock.nodo') WHEN 'NORTE' THEN 1 ELSE 2 END,
    ((i - 1) % 30) + 1,
    CASE WHEN i % 4 = 0 THEN 'SALIDA' ELSE 'ENTRADA' END,
    (i % 6) + 1,
    TIMESTAMPTZ '2026-10-01 09:00:00-06' + i * INTERVAL '3 hours',
    'Movimiento de prueba'
FROM generate_series(1, 60) AS i;

CREATE INDEX idx_ventas_fecha ON medistock.ventas(fecha);
CREATE INDEX idx_movimientos_fecha ON medistock.movimientos_inventario(fecha);
CREATE INDEX idx_detalle_medicamento ON medistock.detalle_ventas(id_medicamento);

-- Validar que los datos operativos sean de la sucursal correcta.
DO $$
DECLARE
    sucursal_esperada INTEGER :=
        CASE current_setting('medistock.nodo') WHEN 'NORTE' THEN 1 ELSE 2 END;
BEGIN
    IF EXISTS (
        SELECT 1 FROM medistock.inventario
        WHERE id_sucursal <> sucursal_esperada
    ) OR EXISTS (
        SELECT 1 FROM medistock.ventas
        WHERE id_sucursal <> sucursal_esperada
    ) THEN
        RAISE EXCEPTION 'Se encontraron datos operativos en una sucursal incorrecta';
    END IF;
END
$$;

COMMIT;

-- ============================================================================
-- COMPROBACIONES (PUEDEN REPETIRSE SIN MODIFICAR LOS DATOS)
-- Norte: id_sucursal = 1. Sur: id_sucursal = 2.
-- En cada nodo: 30 medicamentos; 30 inventarios; 40 ventas;
--              40 detalles; 60 movimientos.
-- ============================================================================
SELECT CASE (SELECT MIN(id_sucursal) FROM medistock.inventario)
           WHEN 1 THEN 'NORTE' WHEN 2 THEN 'SUR' ELSE 'DESCONOCIDO'
       END AS nodo,
       (SELECT COUNT(*) FROM medistock.medicamentos) AS medicamentos,
       (SELECT COUNT(*) FROM medistock.inventario) AS inventario,
       (SELECT COUNT(*) FROM medistock.ventas) AS ventas,
       (SELECT COUNT(*) FROM medistock.detalle_ventas) AS detalles,
       (SELECT COUNT(*) FROM medistock.movimientos_inventario) AS movimientos;

SELECT id_sucursal, COUNT(*) AS productos, SUM(existencia) AS unidades
FROM medistock.inventario
GROUP BY id_sucursal
ORDER BY id_sucursal;

-- Vista de consulta local para comprobar que hay registros:
SELECT i.id_sucursal, m.nombre AS medicamento, i.existencia
FROM medistock.inventario AS i
JOIN medistock.medicamentos AS m USING (id_medicamento)
ORDER BY i.id_medicamento
LIMIT 5;

-- El historial de operaciones de DBAdmin NO se crea aqui:
-- cada estudiante/equipo debe implementarlo como parte de su aplicacion.
-- La configuracion de postgres_fdw tampoco se entrega resuelta:
-- forma parte del desarrollo y de las pruebas de DBAdmin.