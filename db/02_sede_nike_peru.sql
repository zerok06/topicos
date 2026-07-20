-- ============================================================
-- SCRIPT: 02_sede_nike_peru.sql
-- DB Sede Operativa: Nike Perú — Logística y Distribución
-- Motor: PostgreSQL 14+
-- Schema: nike_sede_peru
-- Simula la DB independiente de la sede logística central Perú
-- Contiene: 5 almacenes, 20 productos, inventario completo,
--           rutas nacionales, envíos activos, proveedores
--
-- EJECUCIÓN:
--   psql -U postgres -d nike_logistica_db -f 02_sede_nike_peru.sql
-- ============================================================

\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS nike_sede_peru CASCADE;
CREATE SCHEMA nike_sede_peru;
SET search_path TO nike_sede_peru;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- TABLAS (solo operativas — sin módulos de plataforma/chat)
-- ============================================================

CREATE TABLE warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    warehouse_name VARCHAR(150)  NOT NULL,
    city           VARCHAR(80),
    region         VARCHAR(80),
    address        TEXT,
    latitude       NUMERIC(10,6),
    longitude      NUMERIC(10,6),
    capacity       INT,
    manager_name   VARCHAR(100),
    phone          VARCHAR(30),
    status         VARCHAR(30)   DEFAULT 'active',
    created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_lines (
    line_id   SERIAL       PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    gender    VARCHAR(20)  DEFAULT 'Unisex',
    sport_type VARCHAR(50)
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    line_id      INT           REFERENCES product_lines(line_id),
    sku          VARCHAR(50)   UNIQUE NOT NULL,
    product_name VARCHAR(150)  NOT NULL,
    model        VARCHAR(100),
    color        VARCHAR(50),
    size_range   VARCHAR(50),
    unit_price   NUMERIC(10,2) NOT NULL,
    cost_price   NUMERIC(10,2),
    description  TEXT,
    status       VARCHAR(30)   DEFAULT 'active'
);

CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT    NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    warehouse_id INT    NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    stock_qty    INT     NOT NULL DEFAULT 0,
    min_stock    INT     NOT NULL DEFAULT 10,
    max_stock    INT     DEFAULT 500,
    bin_location VARCHAR(20),
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id)
);

CREATE TABLE inventory_movements (
    movement_id SERIAL PRIMARY KEY,
    product_id INT        NOT NULL REFERENCES products(product_id),
    warehouse_id INT        NOT NULL REFERENCES warehouses(warehouse_id),
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('entrada','salida','ajuste','transferencia')),
    quantity      INT         NOT NULL,
    reference_doc VARCHAR(50),
    reason        TEXT,
    operator_name VARCHAR(100),
    movement_date TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transfer_orders (
    transfer_id SERIAL PRIMARY KEY,
    product_id INT        NOT NULL REFERENCES products(product_id),
    from_warehouse_id INT        NOT NULL REFERENCES warehouses(warehouse_id),
    to_warehouse_id INT        NOT NULL REFERENCES warehouses(warehouse_id),
    quantity          INT         NOT NULL CHECK (quantity > 0),
    status            VARCHAR(30) DEFAULT 'pending'
                                  CHECK (status IN ('pending','approved','in_transit','completed','rejected')),
    requested_by      VARCHAR(100),
    approved_by       VARCHAR(100),
    notes             TEXT,
    requested_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP
);

CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(150)  NOT NULL,
    contact_name  VARCHAR(100),
    contact_email VARCHAR(150),
    phone         VARCHAR(30),
    country       VARCHAR(80),
    city          VARCHAR(80),
    supplier_type VARCHAR(50)   DEFAULT 'distributor',
    lead_time_days INT          DEFAULT 30
);

CREATE TABLE purchase_orders (
    purchase_order_id SERIAL PRIMARY KEY,
    supplier_id INT          REFERENCES suppliers(supplier_id),
    order_number      VARCHAR(30)   UNIQUE,
    order_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    expected_date     DATE,
    received_date     DATE,
    status            VARCHAR(30)   DEFAULT 'pending'
                                    CHECK (status IN ('pending','confirmed','shipped','received','cancelled')),
    total_amount      NUMERIC(12,2) DEFAULT 0,
    warehouse_id INT          REFERENCES warehouses(warehouse_id),
    notes             TEXT
);

CREATE TABLE purchase_order_items (
    item_id SERIAL PRIMARY KEY,
    purchase_order_id INT          NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
    product_id INT          NOT NULL REFERENCES products(product_id),
    quantity_ordered  INT           NOT NULL,
    quantity_received INT           DEFAULT 0,
    unit_cost         NUMERIC(10,2) NOT NULL
);

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    customer_type VARCHAR(30)  DEFAULT 'retail',
    contact_name  VARCHAR(100),
    email         VARCHAR(150),
    phone         VARCHAR(30),
    city          VARCHAR(80),
    region        VARCHAR(80),
    address       TEXT,
    ruc           VARCHAR(20)
);

CREATE TABLE sales_orders (
    sales_order_id SERIAL PRIMARY KEY,
    customer_id INT          REFERENCES customers(customer_id),
    order_number   VARCHAR(30)   UNIQUE,
    order_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
    required_date  DATE,
    status         VARCHAR(30)   DEFAULT 'pending'
                                 CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
    total_amount   NUMERIC(12,2) DEFAULT 0,
    channel        VARCHAR(30)   DEFAULT 'direct',
    notes          TEXT
);

CREATE TABLE sales_order_items (
    item_id SERIAL PRIMARY KEY,
    sales_order_id INT          NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    product_id INT          NOT NULL REFERENCES products(product_id),
    quantity       INT           NOT NULL,
    unit_price     NUMERIC(10,2) NOT NULL,
    discount       NUMERIC(5,2)  DEFAULT 0
);

CREATE TABLE routes (
    route_id SERIAL PRIMARY KEY,
    route_name       VARCHAR(100) NOT NULL,
    origin_city      VARCHAR(80)  NOT NULL,
    destination_city VARCHAR(80)  NOT NULL,
    origin_lat       NUMERIC(10,6),
    origin_lng       NUMERIC(10,6),
    dest_lat         NUMERIC(10,6),
    dest_lng         NUMERIC(10,6),
    estimated_hours  NUMERIC(6,2),
    distance_km      NUMERIC(8,2),
    preferred_carrier VARCHAR(100),
    cost_per_km      NUMERIC(8,2),
    is_active        BOOLEAN      DEFAULT TRUE
);

CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    sales_order_id INT         REFERENCES sales_orders(sales_order_id),
    warehouse_id INT         REFERENCES warehouses(warehouse_id),
    route_id INT         REFERENCES routes(route_id),
    shipment_number    VARCHAR(30)  UNIQUE,
    shipment_date      DATE         DEFAULT CURRENT_DATE,
    estimated_delivery DATE,
    actual_delivery    DATE,
    status             VARCHAR(30)  DEFAULT 'preparacion'
                                    CHECK (status IN ('preparacion','en_transito','en_destino','entregado','devuelto')),
    carrier            VARCHAR(100),
    tracking_code      VARCHAR(100) UNIQUE,
    weight_kg          NUMERIC(8,2),
    notes              TEXT
);

-- Índices
CREATE INDEX idx_s_inv_product  ON inventory(product_id);
CREATE INDEX idx_s_inv_wh       ON inventory(warehouse_id);
CREATE INDEX idx_s_inv_stock    ON inventory(stock_qty);
CREATE INDEX idx_s_so_status    ON sales_orders(status);
CREATE INDEX idx_s_so_date      ON sales_orders(order_date);
CREATE INDEX idx_s_sh_tracking  ON shipments(tracking_code);
CREATE INDEX idx_s_sh_status    ON shipments(status);
CREATE INDEX idx_s_tr_status    ON transfer_orders(status);
CREATE INDEX idx_s_im_date      ON inventory_movements(movement_date);

-- ============================================================
-- DATOS DE SEMILLA
-- ============================================================

-- ----------------------------------------
-- 5 Almacenes con GPS real Perú
-- ----------------------------------------
INSERT INTO warehouses
  (warehouse_id, warehouse_name, city, region, address, latitude, longitude, capacity, manager_name, phone)
VALUES
(1,
 'Centro Logístico Lima','Lima','Lima',
 'Av. Industrial 1250, Cercado de Lima',-12.046373,-77.042754,8000,'Jorge Ramos Tafur','+51 1 619 0001'),
(2,
 'Hub Lima Norte','Lima','Lima',
 'Av. Alfredo Mendiola 3698, Los Olivos',-11.997399,-77.070756,4000,'Ana Quiroz López','+51 1 619 0002'),
(3,
 'Centro Logístico Arequipa','Arequipa','Arequipa',
 'Parque Industrial Mz. G Lt. 4, Cerro Colorado',-16.409047,-71.537451,5000,'Carlos Salas Meza','+51 54 300 001'),
(4,
 'Depósito Cusco','Cusco','Cusco',
 'Av. Velasco Astete 1240, Santiago, Cusco',-13.531950,-71.967463,2000,'María Quispe Ccoa','+51 84 220 001'),
(5,
 'Distribuidora Trujillo','Trujillo','La Libertad',
 'Parque Industrial de Trujillo, Mz. D Lt. 5',-8.112782,-79.028370,3000,'Luis Vargas Ríos','+51 44 210 001');

-- ----------------------------------------
-- Líneas de producto
-- ----------------------------------------
INSERT INTO product_lines (name, gender, sport_type) VALUES
('Running Hombre',       'Hombre',  'Running'),
('Running Mujer',        'Mujer',   'Running'),
('Lifestyle Unisex',     'Unisex',  'Lifestyle'),
('Lifestyle Mujer',      'Mujer',   'Lifestyle'),
('Training Unisex',      'Unisex',  'Training'),
('Basketball Unisex',    'Unisex',  'Basketball'),
('Fútbol Unisex',        'Unisex',  'Football'),
('Ropa y Accesorios',    'Unisex',  'Apparel');

-- ----------------------------------------
-- 20 Productos (catálogo Nike real)
-- Fuente: dataset/Incluye ventas... reseñas.csv + Dataset de ventas (sin limpiar).csv
-- ----------------------------------------
INSERT INTO products
  (product_id, line_id, sku, product_name, model, color, size_range, unit_price, cost_price, description)
VALUES
(1,1,
 'AT8242-009','Nike Zoom Pegasus Turbo 2','Pegasus Turbo 2','Negro/Blanco','38-45',159.95,95.00,
 'Feather-light upper with innovative foam for revolutionary responsiveness in long-distance training.'),
(2,2,
 'AJ6910-009','Nike Air VaporMax Flyknit 3','VaporMax Flyknit 3','Negro/Rojo','36-42',169.95,100.00,
 'Flowing Flyknit upper with revolutionary VaporMax Air technology for toe-to-heel cushioning.'),
(3,1,
 'CK2595-500','Nike Air Max 270 React ENG','Air Max 270 React','Púrpura/Negro','38-46',149.95,90.00,
 'Full-length React foam midsole combined with 270 Max Air unit for unrivalled comfort.'),
(4,3,
 '315115-112','Nike Air Force 1 ''07','Air Force 1 ''07','Blanco','38-47', 74.95,42.00,
 'The b-ball OG — crisp leather in all-white colourway. Timeless icon since 1982.'),
(5,3,
 'CD0490-104','Nike Air Max 90','Air Max 90','Blanco/Gris','38-46', 99.95,58.00,
 'Iconic Waffle sole, stitched overlays and classic TPU accents. Clean lines, versatile and timeless.'),
(6,3,
 '921733-104','Nike Air Max 97','Air Max 97','Plata/Negro','38-46',169.95,100.00,
 'Water-ripple lines, reflective piping and full-length Max Air cushioning keep this icon going strong.'),
(7,4,
 'CJ1646-600','Nike Air Force 1 ''07 Essential','AF1 Essential','Rosa Iridiscente','36-41', 74.95,42.00,
 'Premium leather upper and iridescent Swoosh — classic AF-1 taken to the next level.'),
(8,4,
 'CZ6156-101','Nike Air Max Verona','Air Max Verona','Blanco/Dorado','36-41', 99.95,58.00,
 'Mixed-material upper with plush collar and flashy colours. Nike Air cushioning adds style to every step.'),
(9,4,
 'CI3482-200','Nike Air Force 1 Sage Low LX','AF1 Sage Low','Beige/Crema','36-42', 99.95,58.00,
 'Platform midsole with rolled edges and clean lines. Bold elevated look for women.'),
(10,4,
 'CD0479-200','Nike Air Max Dia SE','Air Max Dia SE','Crema/Dorado','36-42', 99.95,58.00,
 'Designed for a woman''s foot — exaggerated midsole amplifying the Max Air unit surrounded by TPU.'),
(11,5,
 'BQ7043-668','Nike Air Zoom SuperRep','Air Zoom SuperRep','Naranja/Negro','38-46', 99.95,58.00,
 'Circuit training, HIIT and fast-paced workouts. Zoom Air cushioning with wide stable heel.'),
(12,5,
 'CJ0861-017','Nike Free Metcon 3','Free Metcon 3','Gris/Rojo','38-46', 99.95,58.00,
 'Nike Free flexibility in forefoot + Metcon stability in heel for cross-training performance.'),
(13,5,
 'CJ0860-668','Nike SuperRep Go','SuperRep Go','Coral/Blanco','38-46', 79.95,45.00,
 'Comfortable foam cushioning for circuit-based fitness classes and streaming workouts.'),
(14,5,
 'NK-METCON7-001','Nike Metcon 7','Metcon 7','Negro/Gris','38-46',129.90,75.00,
 'Most durable Metcon ever — engineered for weightlifting, HIIT and functional fitness.'),
(15,3,
 'NK-WAFF-ONE-001','Nike Waffle One','Waffle One','Verde/Blanco','38-46', 89.90,52.00,
 'Heritage Waffle outsole design meets modern lifestyle comfort.'),
(16,3,
 'NK-BLAZER-MID-001','Nike Blazer Mid ''77','Blazer Mid ''77','Blanco/Negro','38-46', 99.90,58.00,
 'Stripped back vintage look — smooth leather upper with retro Nike branding.'),
(17,6,
 'NK-AJ1-LOW-001','Air Jordan 1 Low','Air Jordan 1 Low','Rojo/Negro/Blanco','38-46', 89.95,52.00,
 'Lower cut classic Air Jordan 1 — premium leather upper with iconic Swoosh.'),
(18,7,
 'NK-TIEMPO-001','Nike Tiempo Legend 10 Elite','Tiempo Legend 10','Negro/Rojo','38-46',229.90,135.00,
 'Full-grain leather upper for pure touch and natural ball control on firm ground.'),
(19,7,
 'NK-MERC-SF9-001','Nike Mercurial Superfly 9 Elite','Mercurial Superfly 9','Amarillo/Negro','38-46',259.90,155.00,
 'Vaporposite+ upper for explosive acceleration and pinpoint control.'),
(20,8,
 'NK-DRIFIT-M','Polo Nike Dri-FIT Hombre','Dri-FIT Training Polo','Rojo/Negro','S,M,L,XL', 45.00,22.00,
 'Sweat-wicking Dri-FIT technology — lightweight fabric for training and everyday wear.');

-- ----------------------------------------
-- Inventario (con alertas críticas realistas)
-- ----------------------------------------
INSERT INTO inventory (product_id, warehouse_id, stock_qty, min_stock, max_stock, bin_location) VALUES
-- Lima Centro (swh00001)
(1,1,  6,25,300,'A-01'),  -- CRÍTICO
(2,1, 48,20,250,'A-02'),
(3,1, 32,15,200,'A-03'),
(4,1,125,30,400,'B-01'),
(5,1,  9,20,300,'B-02'),  -- CRÍTICO
(6,1, 60,15,200,'B-03'),
(8,1,  4,20,250,'C-01'),  -- CRÍTICO
(11,1, 28,15,200,'C-02'),
(13,1,  8,15,200,'C-03'),  -- CRÍTICO
(20,1,180,40,600,'D-01'),
-- Hub Lima Norte (swh00002)
(4,2, 80,20,250,'A-01'),
(7,2, 45,15,200,'A-02'),
(15,2, 40,15,200,'A-03'),
(16,2, 35,15,200,'B-01'),
(17,2, 55,10,150,'B-02'),
-- Arequipa (swh00003)
(1,3,160,25,300,'A-01'),
(3,3, 40,15,200,'A-02'),
(5,3, 95,20,300,'A-03'),
(8,3, 70,20,250,'B-01'),
(18,3, 20,10,100,'B-02'),
-- Cusco (swh00004)
(4,4, 55,15,150,'A-01'),
(6,4, 30,10,100,'A-02'),
(12,4, 22,10,100,'A-03'),
(19,4, 15,10,100,'B-01'),
-- Trujillo (swh00005)
(4,5, 70,20,200,'A-01'),
(5,5, 45,15,150,'A-02'),
(11,5, 33,10,120,'A-03'),
(13,5, 40,10,120,'B-01'),
(20,5,110,30,400,'B-02');

-- ----------------------------------------
-- Movimientos de inventario (histórico realista Ene-Jul 2025)
-- ----------------------------------------
INSERT INTO inventory_movements
  (product_id, warehouse_id, movement_type, quantity, reference_doc, reason, operator_name, movement_date)
VALUES
(1,1,'salida',   42,'SO-2025-001','Pedido Sport Center Lima','Carlos Meza',     NOW()-INTERVAL '5 days'),
(4,1,'entrada', 200,'OC-2025-001','Recepción proveedor Nike Global Supply','Carlos Meza',NOW()-INTERVAL '10 days'),
(5,1,'salida',   30,'SO-2025-002','Distribución Sport Zone Miraflores','Ana Torres',   NOW()-INTERVAL '3 days'),
(8,1,'salida',   25,'SO-2025-003','Evento Nike Run Lima 2025','Ana Torres',          NOW()-INTERVAL '7 days'),
(1,3,'entrada', 200,'OC-2025-002','Reabastecimiento Q3 2025','Pedro Salas',          NOW()-INTERVAL '20 days'),
(20,1,'ajuste',  -10,'AJ-2025-001','Diferencia inventario físico vs sistema','Jorge Ramos',NOW()-INTERVAL '2 days'),
(3,3,'salida',   15,'SO-2025-004','Pedido Mega Deportes Arequipa','Carlos Salas',    NOW()-INTERVAL '4 days'),
(6,4,'entrada',  50,'OC-2025-003','Reposición almacén Cusco','María Quispe',         NOW()-INTERVAL '15 days'),
(4,5,'entrada', 100,'OC-2025-004','Abastecimiento hub Trujillo','Luis Vargas',         NOW()-INTERVAL '25 days'),
(11,5,'salida',   20,'SO-2025-005','Pedido Deportes La Libertad Trujillo','Luis Vargas',NOW()-INTERVAL '6 days'),
(5,2,'transferencia',30,'TR-2025-001','Transferencia desde Lima Norte a Lima Centro','Jorge Ramos',NOW()-INTERVAL '1 day'),
(18,3,'entrada',  30,'OC-2025-005','Reposición Tiempo Legend Arequipa','Carlos Salas', NOW()-INTERVAL '8 days');

-- ----------------------------------------
-- Transfer Orders (Drag & Drop sede)
-- ----------------------------------------
INSERT INTO transfer_orders
  (transfer_id, product_id, from_warehouse_id, to_warehouse_id, quantity, status, requested_by, approved_by, notes, requested_at, completed_at)
VALUES
(1,
 1,
 3,1,
 60,'approved','Carlos Meza','Jorge Ramos Tafur',
 'Reposición urgente Pegasus Turbo 2 Lima Centro — stock crítico', NOW()-INTERVAL '1 day', NULL),
(2,
 8,
 3,1,
 30,'pending','Ana Torres',NULL,
 'Reposición Air Max Verona Lima Centro', NOW()-INTERVAL '3 hours', NULL),
(3,
 5,
 2,1,
 30,'in_transit','Jorge Ramos Tafur','Ana Quiroz López',
 'Complemento stock Air Max 90 Lima Centro', NOW()-INTERVAL '2 days', NULL),
(4,
 6,
 3,4,
 20,'completed','Carlos Salas','Jorge Ramos Tafur',
 'Redistribución Air Max 97 a Cusco', NOW()-INTERVAL '8 days', NOW()-INTERVAL '6 days'),
(5,
 13,
 5,1,
 25,'rejected','Luis Vargas',NULL,
 'Rechazado — capacidad Lima Centro al límite', NOW()-INTERVAL '4 days', NULL);

-- ----------------------------------------
-- Proveedores (reales del imap_export.csv + mercado Perú)
-- ----------------------------------------
INSERT INTO suppliers
  (supplier_id, supplier_name, contact_name, contact_email, phone, country, city, supplier_type, lead_time_days)
VALUES
(1,
 'Nike Global Supply Chain','Global Orders Desk','supply@nike.com','+1 503 671 6453','USA','Beaverton','manufacturer',45),
(2,
 'Pou Chen Group Vietnam','Nguyen Van Minh','orders@pouchenvn.com','+84 274 3765 000','Vietnam','Binh Duong','manufacturer',60),
(3,
 'Feng Tay Enterprises','Lin Chia-Ling','ft@fengtay.com.tw','+886 2 2500 0000','Taiwan','New Taipei','manufacturer',50),
(4,
 'Distribuidora Deportiva Perú','Rodrigo Sánchez','rsanchez@deportivaperu.pe','+51 1 234 5678','Peru','Lima','distributor',7),
(5,
 'Inter Sport Andes','Carmen Vidal','cvidal@intersportandes.pe','+51 1 445 9900','Peru','Lima','distributor',10);

-- ----------------------------------------
-- Órdenes de compra (8 con estados variados)
-- ----------------------------------------
INSERT INTO purchase_orders
  (purchase_order_id, supplier_id, order_number, order_date, expected_date, received_date, status, total_amount, warehouse_id, notes)
VALUES
(1,1,
 'OC-2025-001',CURRENT_DATE-30,CURRENT_DATE-5,CURRENT_DATE-3,'received',89750.00,
 1,'Importación Q2 2025 — Air Force 1 y Air Max'),
(2,
 2,
 'OC-2025-002',CURRENT_DATE-45,CURRENT_DATE-10,NULL,'shipped',124800.00,
 3,'Lote VaporMax y Air Max 270 React — temporada invierno'),
(3,
 3,
 'OC-2025-003',CURRENT_DATE-20,CURRENT_DATE+10,NULL,'confirmed',65400.00,
 1,'Metcon 7 y SuperRep Go — línea Training'),
(4,
 4,
 'OC-2025-004',CURRENT_DATE-5, CURRENT_DATE+5, NULL,'pending',  8950.00,
 1,'Reposición urgente stock crítico Lima Centro'),
(5,
 4,
 'OC-2025-005',CURRENT_DATE-2, CURRENT_DATE+8, NULL,'pending',  5600.00,
 3,'Ropa Dri-FIT para reposición Arequipa'),
(6,
 1,
 'OC-2025-006',CURRENT_DATE-60,CURRENT_DATE-25,CURRENT_DATE-22,'received',211500.00,
 2,'Lote gigante Q1 2025 — Lifestyle completo'),
(7,
 5,
 'OC-2025-007',CURRENT_DATE-3, CURRENT_DATE+7, NULL,'pending',  3200.00,
 5,'Reposición Trujillo — Running y Training'),
(8,
 2,
 'OC-2025-008',CURRENT_DATE-15,CURRENT_DATE+30,NULL,'confirmed',78200.00,
 3,'Importación Fútbol — Tiempo Legend y Mercurial Q3');

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, quantity_received, unit_cost) VALUES
(1,4,500,500,42.00),
(1,5,300,300,58.00),
(2,2,400,  0,100.00),
(2,3,350,  0, 90.00),
(3,14,300,  0, 75.00),
(3,13,450,  0, 45.00),
(4,1, 60,  0, 95.00),
(4,8, 50,  0, 58.00),
(8,18,200,  0,135.00),
(8,19,150,  0,155.00);

-- ----------------------------------------
-- Clientes de la sede Peru
-- ----------------------------------------
INSERT INTO customers
  (customer_id, customer_name, customer_type, contact_name, email, phone, city, region, address, ruc)
VALUES
(1,
 'Sport Center Lima','retail','Marco Villanueva','compras@sportcenter.pe','+51 1 445 7890',
 'Lima','Lima','Jr. Comercio 100, Miraflores','20100128234'),
(2,
 'Mega Deportes Sur','retail','Rosa Paredes','contacto@megadeportes.pe','+51 54 223 456',
 'Arequipa','Arequipa','Av. Ejército 200, Yanahuara','20410265600'),
(3,
 'Decathlon Perú','wholesale','Frank Bernard','pedidos@decathlon.pe','+51 1 610 5000',
 'Lima','Lima','Av. Javier Prado Este 4200, La Molina','20601427584'),
(4,
 'Deportes La Libertad','retail','Julio Castillo','ventas@deporteslibertad.pe','+51 44 210 550',
 'Trujillo','La Libertad','Av. España 2100, Centro Histórico','20481735620'),
(5,
 'Nike Factory Store Cusco','retail','Paola Inca','cusco@nikefactory.pe','+51 84 225 330',
 'Cusco','Cusco','Av. El Sol 346, Centro Histórico','20498623741');

-- ----------------------------------------
-- Órdenes de venta (con variedad de estados)
-- ----------------------------------------
INSERT INTO sales_orders
  (sales_order_id, customer_id, order_number, order_date, required_date, status, total_amount, channel, notes)
VALUES
(1,1,
 'SO-2025-001',CURRENT_DATE-5,CURRENT_DATE+2,'shipped',   7498.00,'direct','Pedido quincenal Sport Center'),
(2,2,
 'SO-2025-002',CURRENT_DATE-3,CURRENT_DATE+4,'confirmed', 4199.75,'direct','Reposición temporada fútbol'),
(3,3,
 'SO-2025-003',CURRENT_DATE-1,CURRENT_DATE+7,'processing',24380.00,'wholesale','Lote mensual Decathlon Perú'),
(4,4,
 'SO-2025-004',CURRENT_DATE,  CURRENT_DATE+5,'pending',   2895.00,'direct','Pedido semana Trujillo'),
(5,5,
 'SO-2025-005',CURRENT_DATE-10,CURRENT_DATE-3,'delivered', 3150.00,'direct','Abastecimiento Factory Store Cusco');

INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, discount) VALUES
(1,4,50, 74.95,0.05),
(1,5,30, 99.95,0.05),
(2,18,10,229.90,0),
(2,19, 5,259.90,0),
(3,4,100,74.95,0.12),
(3,5, 80,99.95,0.12),
(3,6, 50,169.95,0.12),
(4,11,15, 99.95,0),
(4,13,20, 79.95,0),
(5,6,10,169.95,0.05),
(5,17,15, 89.95,0.05);

-- ----------------------------------------
-- Rutas nacionales (con coordenadas GPS)
-- ----------------------------------------
INSERT INTO routes
  (route_id, route_name, origin_city, destination_city,
   origin_lat, origin_lng, dest_lat, dest_lng,
   estimated_hours, distance_km, preferred_carrier, cost_per_km)
VALUES
(1,'Lima → Arequipa (Ruta Panamericana Sur)',
 'Lima','Arequipa',-12.046373,-77.042754,-16.409047,-71.537451,16.0,1010.0,'Shalom',0.85),
(2,'Lima → Trujillo (Panamericana Norte)',
 'Lima','Trujillo', -12.046373,-77.042754,-8.112782,-79.028370,  9.0, 558.0,'Olva Courier',0.90),
(3,'Lima → Cusco (Ruta Interoceánica)',
 'Lima','Cusco',   -12.046373,-77.042754,-13.531950,-71.967463, 24.0,1105.0,'DHL Express',1.20),
(4,'Arequipa → Moquegua',
 'Arequipa','Moquegua',-16.409047,-71.537451,-17.193037,-70.935163, 3.5, 225.0,'Shalom',0.80),
(5,'Arequipa → Cusco (Corredor Sur)',
 'Arequipa','Cusco',-16.409047,-71.537451,-13.531950,-71.967463,10.0, 520.0,'Shalom',0.82),
(6,'Lima Norte → Lima Centro (Interna)',
 'Lima','Lima',-11.997399,-77.070756,-12.046373,-77.042754, 1.5, 25.0,'Transporte Propio',0.50),
(7,'Lima → Chiclayo (Norte)',
 'Lima','Chiclayo',-12.046373,-77.042754,-6.771590,-79.840880,12.0, 770.0,'Olva Courier',0.88),
(8,'Trujillo → Cusco (Express)',
 'Trujillo','Cusco',-8.112782,-79.028370,-13.531950,-71.967463,22.0,1300.0,'DHL Express',1.15),
(9,'Lima → Ica (Sur)',
 'Lima','Ica',-12.046373,-77.042754,-14.067046,-75.728334, 4.5, 305.0,'Shalom',0.78),
(10,'Lima → Piura (Norte Largo)',
 'Lima','Piura',-12.046373,-77.042754,-5.194118,-80.632515,16.0,1034.0,'Cruz del Sur',0.92);

-- ----------------------------------------
-- Envíos activos (15 envíos con tracking)
-- ----------------------------------------
INSERT INTO shipments
  (sales_order_id, warehouse_id, route_id, shipment_number,
   shipment_date, estimated_delivery, status, carrier, tracking_code, weight_kg, notes)
VALUES
(1,1,1,
 'SHIP-2025-001',CURRENT_DATE-3,CURRENT_DATE+1,'en_transito','Shalom','SHL-2025-NK101',125.5,NULL),
(2,3,4,
 'SHIP-2025-002',CURRENT_DATE,  CURRENT_DATE+1,'preparacion','Shalom','SHL-2025-NK102', 62.0,NULL),
(3,1,2,
 'SHIP-2025-003',CURRENT_DATE,  CURRENT_DATE+2,'preparacion','Olva Courier','OLV-2025-NK101',340.0,'Lote Decathlon separado en 2 camiones'),
(4,2,2,
 'SHIP-2025-004',CURRENT_DATE+1,CURRENT_DATE+3,'preparacion','Olva Courier','OLV-2025-NK102', 55.0,NULL),
(5,3,5,
 'SHIP-2025-005',CURRENT_DATE-10,CURRENT_DATE-3,'entregado','Shalom','SHL-2025-NK099', 87.5,'Entregado Factory Store Cusco sin novedad');
