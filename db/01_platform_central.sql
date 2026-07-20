-- ============================================================
-- SCRIPT: 01_platform_central.sql
-- Base de Datos: Plataforma Central de Agentes Nike Logística
-- Motor: PostgreSQL 14+ con pgvector
-- Schema: nike_logistica
-- Tablas: 24 (depuradas — solo las que usa el backend FastAPI)
-- Datos: Semilla real basada en CSVs del dataset
--
-- EJECUCIÓN:
--   psql -U postgres -d nike_logistica_db -f 01_platform_central.sql
-- ============================================================

\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS nike_logistica CASCADE;
CREATE SCHEMA nike_logistica;
SET search_path TO nike_logistica;

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;       -- pgvector: búsqueda semántica

-- ============================================================
-- BLOQUE 1 — PLATAFORMA / SISTEMA (10 tablas)
-- app/models/platform.py
-- ============================================================

CREATE TABLE organizations (
    organization_id SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    ruc             VARCHAR(20),
    industry        VARCHAR(100),
    country         VARCHAR(80)  DEFAULT 'Peru',
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    organization_id INT        REFERENCES organizations(organization_id) ON DELETE CASCADE,
    full_name       VARCHAR(150),
    email           VARCHAR(255) UNIQUE NOT NULL,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   TEXT        NOT NULL,
    role            VARCHAR(50)  NOT NULL DEFAULT 'operador',
    status          VARCHAR(30)  DEFAULT 'active',
    is_active       BOOLEAN      DEFAULT TRUE,
    warehouse_id    INT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    role_id   SERIAL      PRIMARY KEY,
    role_name VARCHAR(80)  UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE user_roles (
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    role_id INT  REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE workspaces (
    workspace_id SERIAL PRIMARY KEY,
    organization_id INT        NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    user_id INT        REFERENCES users(user_id) ON DELETE SET NULL,
    name            VARCHAR(150) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
    conversation_id SERIAL PRIMARY KEY,
    workspace_id INT        NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    user_id INT        REFERENCES users(user_id) ON DELETE SET NULL,
    title           VARCHAR(200),
    status          VARCHAR(30)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    conversation_id INT        NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_type     VARCHAR(30)  NOT NULL CHECK (sender_type IN ('user','agent','system')),
    sender_name     VARCHAR(100),
    content         TEXT        NOT NULL,
    metadata        JSONB        DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Artifacts: tablas, charts, KPIs, mapas que genera el agente IA
CREATE TABLE artifacts (
    artifact_id SERIAL PRIMARY KEY,
    workspace_id INT        NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    conversation_id INT        REFERENCES conversations(conversation_id) ON DELETE SET NULL,
    type            VARCHAR(50)  NOT NULL CHECK (type IN ('table','chart','dashboard','document','kpi','diagram','map')),
    title           VARCHAR(200) NOT NULL,
    content         JSONB        NOT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Mapeo término de negocio → tabla/columna física (alimenta el RAG del chatbot)
CREATE TABLE semantic_mappings (
    mapping_id      SERIAL       PRIMARY KEY,
    organization_id INT         NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    business_term   VARCHAR(100) NOT NULL,
    physical_table  VARCHAR(100) NOT NULL,
    physical_column VARCHAR(100),
    description     TEXT
);

-- Logs inmutables de auditoría (OWASP A01 — SDD §5)
CREATE TABLE audit_logs (
    audit_id        BIGSERIAL    PRIMARY KEY,
    organization_id INT         REFERENCES organizations(organization_id) ON DELETE SET NULL,
    user_id INT         REFERENCES users(user_id) ON DELETE SET NULL,
    action          VARCHAR(150) NOT NULL,
    entity_name     VARCHAR(100),
    entity_id       TEXT,
    details         JSONB        DEFAULT '{}'::jsonb,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- BLOQUE 2 — CATÁLOGO DE PRODUCTOS (3 tablas)
-- app/models/product.py
-- ============================================================

CREATE TABLE categories (
    category_id SERIAL       PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    organization_id INT          NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    category_id     INT           REFERENCES categories(category_id),
    sku             VARCHAR(50)   UNIQUE NOT NULL,
    product_name    VARCHAR(150)  NOT NULL,
    model           VARCHAR(100),
    gender          VARCHAR(20)   DEFAULT 'Unisex',
    size            VARCHAR(20),
    color           VARCHAR(50),
    unit_price      NUMERIC(10,2) NOT NULL,
    description     TEXT,
    barcode         VARCHAR(50)   UNIQUE,
    status          VARCHAR(30)   DEFAULT 'active',
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Reseñas y ratings reales del CSV — enriquecen contexto RAG
CREATE TABLE product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INT          REFERENCES products(product_id) ON DELETE SET NULL,
    sku           VARCHAR(50),
    rating        NUMERIC(3,1)  CHECK (rating >= 0 AND rating <= 5),
    review_count  INT           DEFAULT 0,
    listing_price NUMERIC(10,2),
    sale_price    NUMERIC(10,2),
    discount      NUMERIC(5,2),
    description   TEXT,
    image_url     TEXT,
    source        VARCHAR(50)   DEFAULT 'nike_catalog',
    scraped_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings para búsqueda semántica con pgvector (SDD §3 — seed.py los popula)
CREATE TABLE product_embeddings (
    embedding_id SERIAL PRIMARY KEY,
    product_id INT    NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    description_vector vector(384),        -- all-MiniLM-L6-v2 (384 dimensiones)
    context_metadata  JSONB   DEFAULT '{}'::jsonb,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- NOTA: El índice ivfflat se crea DESPUÉS de que seed.py popule los vectores:
-- CREATE INDEX idx_embeddings_vector ON product_embeddings
--     USING ivfflat (description_vector vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- BLOQUE 3 — INVENTARIO Y ALMACENES (4 tablas)
-- app/models/inventory.py
-- ============================================================

CREATE TABLE warehouses (
    warehouse_id SERIAL PRIMARY KEY,
    organization_id INT          NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    warehouse_name  VARCHAR(150)  NOT NULL,
    city            VARCHAR(80),
    address         TEXT,
    latitude        NUMERIC(10,6),   -- GPS para mapa Leaflet/Mapbox
    longitude       NUMERIC(10,6),
    capacity        INT,
    status          VARCHAR(30)   DEFAULT 'active',
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory (
    inventory_id SERIAL PRIMARY KEY,
    organization_id INT    NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    product_id INT    NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    warehouse_id INT    NOT NULL REFERENCES warehouses(warehouse_id) ON DELETE CASCADE,
    stock_qty       INT     NOT NULL DEFAULT 0,
    min_stock       INT     NOT NULL DEFAULT 10,
    max_stock       INT     DEFAULT 500,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id)
);

CREATE TABLE inventory_movements (
    movement_id SERIAL PRIMARY KEY,
    organization_id INT        NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    product_id INT        NOT NULL REFERENCES products(product_id),
    warehouse_id INT        NOT NULL REFERENCES warehouses(warehouse_id),
    movement_type   VARCHAR(30)  NOT NULL CHECK (movement_type IN ('entrada','salida','ajuste','transferencia')),
    quantity        INT         NOT NULL,
    reason          TEXT,
    performed_by    INT         REFERENCES users(user_id) ON DELETE SET NULL,
    movement_date   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- Órdenes de traslado Drag & Drop entre almacenes (SDD §5 — auditado)
CREATE TABLE transfer_orders (
    transfer_id SERIAL PRIMARY KEY,
    organization_id INT        NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    product_id INT        NOT NULL REFERENCES products(product_id),
    from_warehouse_id INT        NOT NULL REFERENCES warehouses(warehouse_id),
    to_warehouse_id INT        NOT NULL REFERENCES warehouses(warehouse_id),
    quantity          INT         NOT NULL CHECK (quantity > 0),
    status            VARCHAR(30)  DEFAULT 'pending'
                                  CHECK (status IN ('pending','approved','in_transit','completed','rejected')),
    requested_by      INT         REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by       INT         REFERENCES users(user_id) ON DELETE SET NULL,
    notes             TEXT,
    requested_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP
);

-- ============================================================
-- BLOQUE 4 — CADENA DE SUMINISTRO (3 tablas)
-- app/models/supply.py
-- ============================================================

CREATE TABLE suppliers (
    supplier_id SERIAL PRIMARY KEY,
    organization_id INT          NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    supplier_name   VARCHAR(150)  NOT NULL,
    contact_email   VARCHAR(150),
    phone           VARCHAR(30),
    country         VARCHAR(80),
    city            VARCHAR(80),
    supplier_type   VARCHAR(50)   DEFAULT 'distributor'
);

CREATE TABLE purchase_orders (
    purchase_order_id SERIAL PRIMARY KEY,
    organization_id INT          NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    supplier_id INT          REFERENCES suppliers(supplier_id),
    order_date        DATE          NOT NULL DEFAULT CURRENT_DATE,
    expected_date     DATE,
    status            VARCHAR(30)   DEFAULT 'pending'
                                    CHECK (status IN ('pending','confirmed','shipped','received','cancelled')),
    total_amount      NUMERIC(12,2) DEFAULT 0,
    notes             TEXT
);

CREATE TABLE purchase_order_items (
    purchase_order_item_id SERIAL PRIMARY KEY,
    purchase_order_id INT          NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
    product_id INT          NOT NULL REFERENCES products(product_id),
    quantity               INT           NOT NULL,
    unit_cost              NUMERIC(10,2) NOT NULL
);

-- ============================================================
-- BLOQUE 5 — VENTAS Y LOGÍSTICA (5 tablas)
-- app/models/sales.py  /  app/models/logistics.py
-- ============================================================

CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    organization_id INT         NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    customer_name   VARCHAR(150) NOT NULL,
    email           VARCHAR(150),
    phone           VARCHAR(30),
    city            VARCHAR(80),
    address         TEXT,
    customer_type   VARCHAR(30)  DEFAULT 'retail'
);

CREATE TABLE sales_orders (
    sales_order_id SERIAL PRIMARY KEY,
    organization_id INT          NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    customer_id INT          REFERENCES customers(customer_id),
    order_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(30)   DEFAULT 'pending'
                                  CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
    total_amount    NUMERIC(12,2) DEFAULT 0,
    channel         VARCHAR(30)   DEFAULT 'direct'
);

CREATE TABLE sales_order_items (
    sales_order_item_id SERIAL PRIMARY KEY,
    sales_order_id INT          NOT NULL REFERENCES sales_orders(sales_order_id) ON DELETE CASCADE,
    product_id INT          NOT NULL REFERENCES products(product_id),
    quantity            INT           NOT NULL,
    unit_price          NUMERIC(10,2) NOT NULL,
    discount            NUMERIC(5,2)  DEFAULT 0
);

CREATE TABLE routes (
    route_id SERIAL PRIMARY KEY,
    organization_id INT          NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    route_name      VARCHAR(100),
    origin_city     VARCHAR(80)   NOT NULL,
    destination_city VARCHAR(80)  NOT NULL,
    estimated_hours NUMERIC(6,2),
    distance_km     NUMERIC(8,2),
    carrier         VARCHAR(100),
    is_active       BOOLEAN       DEFAULT TRUE
);

CREATE TABLE shipments (
    shipment_id SERIAL PRIMARY KEY,
    organization_id INT        NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
    sales_order_id INT        REFERENCES sales_orders(sales_order_id),
    warehouse_id INT        REFERENCES warehouses(warehouse_id),
    route_id INT        REFERENCES routes(route_id),
    shipment_date      DATE        DEFAULT CURRENT_DATE,
    estimated_delivery DATE,
    actual_delivery    DATE,
    status             VARCHAR(30)  DEFAULT 'preparacion'
                                   CHECK (status IN ('preparacion','en_transito','en_destino','entregado','devuelto')),
    carrier            VARCHAR(100),
    tracking_code      VARCHAR(100) UNIQUE,
    notes              TEXT
);

-- ============================================================
-- BLOQUE 6 — AGENTES IA (1 tabla)
-- app/models/agent.py  — estado WebSocket por agente activo
-- ============================================================

CREATE TABLE agent_sessions (
    session_id SERIAL PRIMARY KEY,
    workspace_id INT        REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    user_id INT        REFERENCES users(user_id) ON DELETE SET NULL,
    agent_name   VARCHAR(100) NOT NULL,
    agent_type   VARCHAR(50)  CHECK (agent_type IN ('inventory','sales','logistics','supplier','general')),
    status       VARCHAR(30)  DEFAULT 'active' CHECK (status IN ('active','idle','closed')),
    last_ping    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    metadata     JSONB        DEFAULT '{}'::jsonb,
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_users_org              ON users(organization_id);
CREATE INDEX idx_users_email            ON users(email);
CREATE INDEX idx_products_org           ON products(organization_id);
CREATE INDEX idx_products_sku           ON products(sku);
CREATE INDEX idx_products_category      ON products(category_id);
CREATE INDEX idx_inventory_product      ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse    ON inventory(warehouse_id);
CREATE INDEX idx_inventory_stock        ON inventory(stock_qty);
CREATE INDEX idx_inv_movements_date     ON inventory_movements(movement_date);
CREATE INDEX idx_inv_movements_type     ON inventory_movements(movement_type);
CREATE INDEX idx_transfer_status        ON transfer_orders(status);
CREATE INDEX idx_sales_orders_org       ON sales_orders(organization_id);
CREATE INDEX idx_sales_orders_status    ON sales_orders(status);
CREATE INDEX idx_sales_orders_date      ON sales_orders(order_date);
CREATE INDEX idx_shipments_tracking     ON shipments(tracking_code);
CREATE INDEX idx_shipments_status       ON shipments(status);
CREATE INDEX idx_audit_logs_org         ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_date        ON audit_logs(created_at);
CREATE INDEX idx_messages_conversation  ON messages(conversation_id);
CREATE INDEX idx_agent_sessions_ws      ON agent_sessions(workspace_id);
CREATE INDEX idx_agent_sessions_status  ON agent_sessions(status);
CREATE INDEX idx_product_embeddings_pid ON product_embeddings(product_id);

-- ============================================================
-- DATOS DE SEMILLA
-- ============================================================

-- ----------------------------------------
-- Organización
-- ----------------------------------------
INSERT INTO organizations (organization_id, name, ruc, industry, country) VALUES
(1,
 'Nike Peru Logística', '20555555555', 'Retail y Logística', 'Peru');

-- ----------------------------------------
-- Roles (6)
-- ----------------------------------------
INSERT INTO roles (role_name, description) VALUES
('Administrador', 'Control total: CRUD, auditoría, configuración de agentes'),
('Supervisor',    'Lectura total + ejecución de traslados en su región'),
('Operador',      'Lectura local, registro de movimientos de stock, consulta chatbot'),
('Logística',     'Inventario, rutas, envíos, traslados Drag & Drop'),
('Ventas',        'Pedidos de venta, clientes, KPIs comerciales'),
('Invitado',      'Solo lectura y consultas básicas al chatbot');

-- ----------------------------------------
-- Almacenes con GPS real (Perú)
-- ----------------------------------------
INSERT INTO warehouses
  (warehouse_id, organization_id, warehouse_name, city, address, latitude, longitude, capacity)
VALUES
(1,1,
 'Almacén Lima Centro','Lima','Av. Industrial 1250, Cercado de Lima',
 -12.046373,-77.042754, 8000),
(2,1,
 'Almacén Arequipa','Arequipa','Parque Industrial Mz. G Lt. 4, Arequipa',
 -16.409047,-71.537451, 5000),
(3,1,
 'Almacén Moquegua','Moquegua','Av. La Paz 789, Moquegua',
 -17.193037,-70.935163, 2500);

ALTER TABLE users
    ADD CONSTRAINT fk_users_warehouse
    FOREIGN KEY (warehouse_id)
    REFERENCES warehouses(warehouse_id)
    ON DELETE SET NULL;

-- ----------------------------------------
-- Usuarios demo (JWT auth + DEMO_MODE compatible)
-- ----------------------------------------
INSERT INTO users (user_id, organization_id, full_name, email, username, password_hash, role, warehouse_id) VALUES
(1,
 1,
 'Admin Nike', 'admin@nike.com', 'admin', crypt('admin123', gen_salt('bf')), 'admin', 1),
(2,
 1,
 'Supervisor Lima', 'supervisor@nike.com', 'supervisor', crypt('supervisor123', gen_salt('bf')), 'supervisor', 1),
(3,
 1,
 'Operador Logístico', 'operador@nike.com', 'operador', crypt('operador123', gen_salt('bf')), 'operador', 3);

INSERT INTO user_roles (user_id, role_id)
SELECT 1, role_id FROM roles WHERE role_name = 'Administrador';
INSERT INTO user_roles (user_id, role_id)
SELECT 2, role_id FROM roles WHERE role_name = 'Supervisor';
INSERT INTO user_roles (user_id, role_id)
SELECT 3, role_id FROM roles WHERE role_name = 'Logística';

-- ----------------------------------------
-- Workspace y conversaciones
-- ----------------------------------------
INSERT INTO workspaces (workspace_id, organization_id, user_id, name, description) VALUES
(5,
 1,
 1,
 'Dashboard Logístico Nike',
 'Centro de control: inventario multi-sede, ventas, rutas y agentes IA');

INSERT INTO conversations (conversation_id, workspace_id, user_id, title) VALUES
(61,
 5,
 1,
 'Análisis de Stock Crítico — Lima Centro'),
(62,
 5,
 2,
 'Estado de Envíos y Rutas Activas');

INSERT INTO messages (conversation_id, sender_type, sender_name, content) VALUES
(61, 'user', 'Admin Nike',
 'Muéstrame los productos con stock por debajo del mínimo en Lima Centro'),
(61, 'agent', 'Agente Inventario',
 'Detecté 4 productos con stock crítico en Almacén Lima Centro: Nike Zoom Pegasus Turbo 2 (8 und / mín 25), Nike Air Max 90 (7 und / mín 20), Nike Air Max Verona (5 und / mín 20), Nike SuperRep Go (7 und / mín 15). Recomiendo transferencias desde Arequipa.'),
(61, 'user', 'Admin Nike',
 'Genera una orden de traslado de 50 unidades de Pegasus Turbo 2 desde Arequipa'),
(61, 'agent', 'Agente Inventario',
 'Orden TR-2025-0001 creada: 50 × Nike Zoom Pegasus Turbo 2 → Arequipa → Lima Centro. Estado: pending. Requiere aprobación del Supervisor.'),
(62, 'user', 'Supervisor Lima',
 'Dame el estado de todos los envíos en tránsito'),
(62, 'agent', 'Agente Logística',
 '4 envíos activos. En tránsito: SHL-2025-NK001 (Lima→Arequipa, ETA mañana). En preparación: OLV-2025-NK001 (Lima→Trujillo), SHL-2025-NK002 (Arequipa→Moquegua). Todos con coordenadas GPS actualizadas en el mapa.');

-- ----------------------------------------
-- Categorías (6)
-- ----------------------------------------
INSERT INTO categories (name, description) VALUES
('Zapatillas Running',    'Calzado Nike para correr y atletismo de alto rendimiento'),
('Zapatillas Lifestyle',  'Calzado Nike casual, urbano y lifestyle'),
('Zapatillas Training',   'Calzado Nike para entrenamiento funcional y gimnasio'),
('Zapatillas Basketball', 'Calzado Nike para baloncesto y cancha'),
('Zapatillas Fútbol',     'Calzado Nike para fútbol soccer y fútsal'),
('Ropa Deportiva',        'Prendas, polos y ropa deportiva Nike Dri-FIT');

-- ----------------------------------------
-- Productos (24 — reales del catálogo Nike)
-- Fuente: dataset/Incluye ventas de zapatillas, reseñas y puntuaciones..csv
--         dataset/Dataset de ventas (sin limpiar).csv
-- ----------------------------------------
INSERT INTO products
  (product_id, organization_id, category_id, sku, product_name, model, gender, color, unit_price, description)
VALUES
-- == RUNNING (cat 1) ==
(1,1,1,
 'AT8242-009','Nike Zoom Pegasus Turbo 2','Pegasus Turbo 2','Unisex','Negro/Blanco',159.95,
 'Updated with a feather-light upper, innovative foam brings revolutionary responsiveness for long-distance training.'),

(2,1,1,
 'AJ6910-009','Nike Air VaporMax Flyknit 3','VaporMax Flyknit 3','Unisex','Negro/Rojo',169.95,
 'Inspired by high fashion, features flowing lines of breathable Flyknit and revolutionary VaporMax Air technology.'),

(3,1,1,
 'CK2595-500','Nike Air Max 270 React ENG','Air Max 270 React','Unisex','Púrpura/Negro',149.95,
 'Combines a full-length React foam midsole with a 270 Max Air unit for unrivalled comfort and striking visual.'),

(4,1,1,
 'NK-REACT-INF-001','Nike React Infinity Run Flyknit','React Infinity Run','Mujer','Blanco/Rosa',159.90,
 'Designed to help reduce injury and keep you running with more foam and improved upper for a secure feel.'),

-- == LIFESTYLE (cat 2) ==
(5,1,2,
 '315115-112','Nike Air Force 1 ''07','Air Force 1 ''07','Hombre','Blanco',74.95,
 'The radiance lives on in the Nike Air Force 1 ''07 — the b-ball OG in crisp leather with all-white colourway.'),

(6,1,2,
 'CD0490-104','Nike Air Max 90','Air Max 90','Unisex','Blanco/Gris',99.95,
 'Clean lines, versatile and timeless — iconic Waffle sole, stitched overlays and classic TPU accents.'),

(7,1,2,
 '921733-104','Nike Air Max 97','Air Max 97','Unisex','Plata/Negro',169.95,
 'Keeps a sneaker icon going strong with water-ripple lines, reflective piping and full-length Max Air cushioning.'),

(8,1,2,
 'CJ1646-600','Nike Air Force 1 ''07 Essential','AF1 Essential','Mujer','Rosa Iridiscente',74.95,
 'Let your shoe game shimmer with premium leather upper and iridescent Swoosh — classic AF-1 taken to the next level.'),

(9,1,2,
 'CZ6156-101','Nike Air Max Verona','Air Max Verona','Mujer','Blanco/Dorado',99.95,
 'Elegant and versatile with mixed-material upper, plush collar and flashy colours. Nike Air adds comfort and style.'),

(10,1,2,
 'CI3482-200','Nike Air Force 1 Sage Low LX','AF1 Sage Low LX','Mujer','Beige/Crema',99.95,
 'Platform midsole and pared-down upper. Rolled edges and clean lines replace overlays for a bold, elevated look.'),

(11,1,2,
 'CD0479-200','Nike Air Max Dia SE','Air Max Dia SE','Mujer','Crema/Dorado',99.95,
 'Designed for a woman''s foot, delivers a lifted look with exaggerated midsole amplifying the Max Air unit.'),

(12,1,2,
 'CI0808-100','NikeCourt Blanc','Court Blanc','Unisex','Blanco/Azul',59.95,
 'Inspired by heritage models — goes with anything. Leather upper with clean look and pops of colour.'),

(13,1,2,
 'NK-WAFF-ONE-001','Nike Waffle One','Waffle One','Unisex','Verde/Blanco',89.90,
 'Inspired by the original Waffle outsole, blends heritage style with everyday comfort for modern lifestyle use.'),

(14,1,2,
 'NK-BLAZER-MID-001','Nike Blazer Mid ''77','Blazer Mid ''77','Unisex','Blanco/Negro',99.90,
 'Stripped back with a vintage look and feel. Smooth leather upper with retro Nike branding and Swoosh.'),

-- == TRAINING (cat 3) ==
(15,1,3,
 'BQ7043-668','Nike Air Zoom SuperRep','Air Zoom SuperRep','Unisex','Naranja/Negro',99.95,
 'Designed for circuit training, HIIT, short runs and fast-paced exercise. Zoom Air cushioning with wide stable heel.'),

(16,1,3,
 'CJ0861-017','Nike Free Metcon 3','Free Metcon 3','Unisex','Gris/Rojo',99.95,
 'Combines Nike Free flexibility around the forefoot with Metcon stability in the heel for maximum performance.'),

(17,1,3,
 'CJ0860-668','Nike SuperRep Go','SuperRep Go','Unisex','Coral/Blanco',79.95,
 'Comfortable foam cushioning, flexibility and support for circuit-based fitness classes and home workouts.'),

(18,1,3,
 'NK-METCON7-001','Nike Metcon 7','Metcon 7','Hombre','Negro/Gris',129.90,
 'Most durable Metcon ever. Engineered for high-intensity functional fitness, weightlifting and short runs.'),

-- == BASKETBALL (cat 4) ==
(19,1,4,
 'AV5186-101','Jordan Air Max 200 XX','Air Max 200 XX','Mujer','Blanco/Dorado',104.95,
 'Design inspiration from iconic AJ8 — enhanced cushioning for all-day street-ready comfort.'),

(20,1,4,
 'NK-AJ1-LOW-001','Air Jordan 1 Low','Air Jordan 1 Low','Unisex','Rojo/Negro/Blanco',89.95,
 'A lower cut on the classic Air Jordan 1 — premium leather upper with iconic Swoosh and clean lines.'),

-- == FÚTBOL (cat 5) ==
(21,1,5,
 'NK-TIEMPO-001','Nike Tiempo Legend 10 Elite','Tiempo Legend 10','Unisex','Negro/Rojo',229.90,
 'Pure touch and feel with premium full-grain leather upper for natural ball control on firm ground.'),

(22,1,5,
 'NK-MERC-SF9-001','Nike Mercurial Superfly 9 Elite','Mercurial Superfly 9','Unisex','Amarillo/Negro',259.90,
 'Speed meets precision. Vaporposite+ upper for explosive acceleration and pinpoint control on firm ground.'),

-- == ROPA (cat 6) ==
(23,1,6,
 'NK-DRIFIT-M','Polo Nike Dri-FIT Hombre','Dri-FIT Training Polo','Hombre','Rojo',45.00,
 'Nike Dri-FIT technology moves sweat away for quicker evaporation — lightweight fabric for all-day comfort.'),

(24,1,6,
 'NK-DRIFIT-W','Polo Nike Dri-FIT Mujer','Dri-FIT Training Polo','Mujer','Azul',42.00,
 'Nike Dri-FIT women''s polo — lightweight, sweat-wicking fabric designed for training and everyday wear.');

-- ----------------------------------------
-- Reseñas reales
-- Fuente: dataset/Incluye ventas de zapatillas, reseñas y puntuaciones..csv
-- ----------------------------------------
INSERT INTO product_reviews (product_id, sku, rating, review_count, listing_price, sale_price, discount, description, source) VALUES
(1,'AT8242-009',2.7,14, 0,159.95,0,
 'Updated with a feather-light upper, innovative foam brings revolutionary responsiveness for long-distance training.','nike_catalog'),
(2,'AJ6910-009',4.4,48, 0,169.95,0,
 'Inspired by high fashion, features flowing lines of breathable Flyknit. VaporMax Air technology keeps a spring in every step.','nike_catalog'),
(3,'CK2595-500',5.0, 2, 0,149.95,0,
 'Combines a full-length React foam midsole with a 270 Max Air unit for unrivalled comfort and striking visual experience.','nike_catalog'),
(5,'315115-112', 4.5,67, 0, 74.95,0,
 'The radiance lives on in the Nike Air Force 1 ''07 — fresh spin on crisp leather in all-white colourway.','nike_catalog'),
(6,'CD0490-104', 5.0, 9, 0, 99.95,0,
 'Clean lines, versatile and timeless — iconic Waffle sole, stitched overlays and classic TPU accents.','nike_catalog'),
(7,'921733-104', 4.3,16, 0,169.95,0,
 'Keeps a sneaker icon going strong with water-ripple lines, reflective piping and full-length Max Air cushioning.','nike_catalog'),
(8,'CJ1646-600', 0.0, 0, 0, 74.95,0,
 'Let your shoe game shimmer with premium leather upper and iridescent Swoosh.','nike_catalog'),
(9,'CZ6156-101', 0.0, 0, 0, 99.95,0,
 'Elegant and versatile with mixed-material upper, plush collar and flashy colours. Nike Air adds comfort and style.','nike_catalog'),
(10,'CI3482-200', 0.0, 0, 0, 99.95,0,
 'Platform midsole and pared-down upper. Rolled edges and clean lines replace overlays for a bold elevated look.','nike_catalog'),
(11,'CD0479-200', 0.0, 0, 0, 99.95,0,
 'Designed for a woman''s foot, lifted look with exaggerated midsole amplifying the Max Air unit surrounded by TPU.','nike_catalog'),
(15,'BQ7043-668', 4.4,34, 0, 99.95,0,
 'Designed for circuit training, HIIT and fast-paced exercise. Zoom Air cushioning with wide stable heel.','nike_catalog'),
(16,'CJ0861-017', 5.0, 1, 0, 99.95,0,
 'Nike Free flexibility around the forefoot + Metcon stability in the heel for maximum training performance.','nike_catalog'),
(19,'AV5186-101', 0.0, 0, 0,104.95,0,
 'Design inspiration from iconic AJ8 with enhanced cushioning for all-day street-ready comfort.','nike_catalog');

-- ----------------------------------------
-- Embeddings — vectores NULL; seed.py los poblará con SentenceTransformers
-- ----------------------------------------
INSERT INTO product_embeddings (product_id, context_metadata)
SELECT p.product_id,
       jsonb_build_object(
           'sku',          p.sku,
           'product_name', p.product_name,
           'category_id',  p.category_id,
           'unit_price',   p.unit_price,
           'vectorized',   false,
           'model',        'all-MiniLM-L6-v2',
           'dim',          384
       )
FROM products p;

-- ----------------------------------------
-- Inventario (con stock crítico para demo del chatbot)
-- ----------------------------------------
INSERT INTO inventory (organization_id, product_id, warehouse_id, stock_qty, min_stock, max_stock) VALUES
-- Lima Centro
(1,1,1,  8, 25,300), -- CRÍTICO
(1,2,1, 45, 20,250),
(1,5,1,120, 30,400),
(1,6,1,  7, 20,300), -- CRÍTICO
(1,7,1, 55, 15,200),
(1,9,1,  5, 20,250), -- CRÍTICO
(1,15,1, 30, 15,200),
(1,17,1,  7, 15,200), -- CRÍTICO
(1,20,1, 60, 10,150),
(1,23,1,200, 40,600),
-- Arequipa
(1,1,2,150, 25,300),
(1,3,2, 30, 15,200),
(1,6,2, 80, 20,300),
(1,9,2, 65, 20,250),
(1,21,2, 25, 10,150),
-- Moquegua
(1,5,3, 40, 15,150),
(1,17,3, 50, 15,200),
(1,23,3, 90, 30,400);

-- ----------------------------------------
-- Movimientos de inventario históricos
-- ----------------------------------------
INSERT INTO inventory_movements
  (organization_id, product_id, warehouse_id, movement_type, quantity, reason, performed_by, movement_date)
VALUES
(1,1,1,
 'salida', 42,'Pedido SO-2025-001 cliente Sport Center Lima',3, NOW()-INTERVAL '5 days'),
(1,5,1,
 'entrada',200,'Recepción OC-2025-001 de Nike Global Supply',3, NOW()-INTERVAL '10 days'),
(1,6,1,
 'salida', 30,'Distribución tienda Sport Zone Miraflores',3, NOW()-INTERVAL '3 days'),
(1,9,1,
 'salida', 25,'Evento Nike Run Lima 2025',2, NOW()-INTERVAL '7 days'),
(1,1,2,
 'entrada',200,'Reabastecimiento Q3 Nike Global Supply',3, NOW()-INTERVAL '20 days'),
(1,23,1,
 'ajuste', -10,'Diferencia inventario físico vs sistema',1, NOW()-INTERVAL '2 days');

-- ----------------------------------------
-- Transfer Orders (Drag & Drop)
-- ----------------------------------------
INSERT INTO transfer_orders
  (transfer_id, organization_id, product_id, from_warehouse_id, to_warehouse_id,
   quantity, status, requested_by, approved_by, notes, requested_at, completed_at)
VALUES
(1,1,
 1,
 2,1,
 50,'approved',3,2,
 'Reposición urgente Pegasus Turbo 2 Lima Centro', NOW()-INTERVAL '1 day', NULL),
(2,1,
 9,
 2,1,
 30,'pending',3,NULL,
 'Reposición Air Max Verona Lima Centro', NOW()-INTERVAL '2 hours', NULL),
(3,1,
 6,
 2,3,
 20,'completed',2,1,
 'Redistribución Air Max 90 sede Moquegua', NOW()-INTERVAL '5 days', NOW()-INTERVAL '4 days');

-- ----------------------------------------
-- Proveedores
-- ----------------------------------------
INSERT INTO suppliers
  (supplier_id, organization_id, supplier_name, contact_email, phone, country, city, supplier_type)
VALUES
(1,1,
 'Nike Global Supply','supply@nike.com','+1 503 671 6453','USA','Beaverton','manufacturer'),
(2,1,
 'Distribuidora Deportiva Perú','ventas@deportivaperu.pe','+51 1 234 5678','Peru','Lima','distributor'),
(3,1,
 'Pou Chen Group (Vietnam)','orders@pouchenvn.com','+84 274 3765 000','Vietnam','Binh Duong','manufacturer');

-- ----------------------------------------
-- Órdenes de compra
-- ----------------------------------------
INSERT INTO purchase_orders
  (purchase_order_id, organization_id, supplier_id, order_date, expected_date, status, total_amount, notes)
VALUES
(1,1,
 1,
 CURRENT_DATE-15, CURRENT_DATE+15,'confirmed',47985.00,
 'Reabastecimiento Q3 2025 — Running y Lifestyle'),
(2,1,
 2,
 CURRENT_DATE-5,  CURRENT_DATE+10,'pending',  12450.00,
 'Reposición urgente stock crítico Lima Centro'),
(3,1,
 3,
 CURRENT_DATE-30, CURRENT_DATE-5, 'received', 89970.00,
 'Importación directa Vietnam — temporada invierno 2025');

INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost) VALUES
(1,1,100,119.95),
(1,5,200, 59.95),
(1,6,100, 79.95),
(2,9, 50, 79.95),
(2,17, 80, 59.95),
(3,2,200,129.95),
(3,7,150,129.95);

-- ----------------------------------------
-- Clientes
-- ----------------------------------------
INSERT INTO customers
  (customer_id, organization_id, customer_name, email, phone, city, address, customer_type)
VALUES
(1,1,
 'Sport Center Lima','compras@sportcenter.pe','+51 1 445 7890','Lima','Jr. Comercio 100, Miraflores','retail'),
(2,1,
 'Mega Deportes Sur','contacto@megadeportes.pe','+51 54 223 456','Arequipa','Av. Ejército 200, Yanahuara','retail'),
(3,1,
 'Decathlon Perú','pedidos@decathlon.pe','+51 1 610 5000','Lima','Av. Javier Prado Este 4200, La Molina','wholesale');

-- ----------------------------------------
-- Órdenes de venta
-- ----------------------------------------
INSERT INTO sales_orders
  (sales_order_id, organization_id, customer_id, order_date, status, total_amount, channel)
VALUES
(1,1,
 1,CURRENT_DATE-3,'shipped',  2249.60,'direct'),
(2,1,
 2,CURRENT_DATE-1,'confirmed',1099.75,'direct'),
(3,1,
 3,CURRENT_DATE,  'pending',  4799.50,'wholesale');

INSERT INTO sales_order_items (sales_order_id, product_id, quantity, unit_price, discount) VALUES
(1,5,10, 74.95,0.05),
(1,6,10, 99.95,0.05),
(1,7, 5,169.95,0.05),
(2,2, 3,169.95,0),
(2,15, 5, 99.95,0),
(3,5,30, 74.95,0.10),
(3,6,20, 99.95,0.10),
(3,23,30, 45.00,0.10);

-- ----------------------------------------
-- Rutas (distancias reales Perú)
-- ----------------------------------------
INSERT INTO routes
  (route_id, organization_id, route_name, origin_city, destination_city, estimated_hours, distance_km, carrier)
VALUES
(1,1,
 'Lima → Arequipa','Lima','Arequipa',16.0,1010.0,'Shalom'),
(2,1,
 'Lima → Trujillo','Lima','Trujillo', 9.0, 558.0,'Olva Courier'),
(3,1,
 'Lima → Cusco','Lima','Cusco',    24.0,1105.0,'DHL Express'),
(4,1,
 'Arequipa → Moquegua','Arequipa','Moquegua', 3.5, 225.0,'Shalom'),
(5,1,
 'Lima Interna','Lima','Lima', 1.5, 25.0,'Transporte Propio');

-- ----------------------------------------
-- Envíos con tracking codes
-- ----------------------------------------
INSERT INTO shipments
  (organization_id, sales_order_id, warehouse_id, route_id,
   shipment_date, estimated_delivery, status, carrier, tracking_code)
VALUES
(1,
 1,1,1,
 CURRENT_DATE-2, CURRENT_DATE+1,'en_transito','Shalom','SHL-2025-NK001'),
(1,
 2,2,4,
 CURRENT_DATE,   CURRENT_DATE+1,'preparacion','Shalom','SHL-2025-NK002'),
(1,
 3,1,2,
 CURRENT_DATE,   CURRENT_DATE+2,'preparacion','Olva Courier','OLV-2025-NK001');

-- ----------------------------------------
-- Sesiones de agentes IA
-- ----------------------------------------
INSERT INTO agent_sessions (workspace_id, user_id, agent_name, agent_type, status, metadata) VALUES
(5,1,
 'Agente Inventario','inventory','active',
 '{"model":"llama3-8b-8192","temperature":0.3,"tools":["RunQueryTool","StockAlertTool","TransferOrderTool"]}'::jsonb),
(5,2,
 'Agente Logística','logistics','idle',
 '{"model":"llama3-8b-8192","temperature":0.2,"tools":["RunQueryTool","RouteCalculatorTool","ShipmentTrackerTool"]}'::jsonb);

-- ----------------------------------------
-- Semantic Mappings (17 términos)
-- ----------------------------------------
INSERT INTO semantic_mappings (organization_id, business_term, physical_table, physical_column, description) VALUES
(1,'stock',          'inventory',          'stock_qty',      'Cantidad disponible de productos en almacén'),
(1,'stock mínimo',   'inventory',          'min_stock',      'Nivel mínimo antes de generar alerta de reposición'),
(1,'stock crítico',  'inventory',          'stock_qty',      'Producto cuyo stock_qty < min_stock'),
(1,'producto',       'products',           'product_name',   'Nombre comercial del producto Nike'),
(1,'sku',            'products',           'sku',            'Código único de identificación del producto'),
(1,'precio',         'products',           'unit_price',     'Precio unitario de venta del producto'),
(1,'almacén',        'warehouses',         'warehouse_name', 'Centro de almacenamiento Nike'),
(1,'ubicación GPS',  'warehouses',         'latitude',       'Coordenadas GPS del almacén para el mapa'),
(1,'envío',          'shipments',          'status',         'Estado del despacho logístico'),
(1,'tracking',       'shipments',          'tracking_code',  'Código de seguimiento del envío'),
(1,'pedido venta',   'sales_orders',       'status',         'Estado del pedido de cliente'),
(1,'cliente',        'customers',          'customer_name',  'Cliente que realiza pedidos de compra'),
(1,'proveedor',      'suppliers',          'supplier_name',  'Proveedor que suministra productos Nike'),
(1,'ruta',           'routes',             'destination_city','Ruta de transporte entre ciudades'),
(1,'traslado',       'transfer_orders',    'status',         'Orden de traslado drag & drop entre almacenes'),
(1,'movimiento',     'inventory_movements','movement_type',  'Entrada, salida o ajuste de productos en almacén'),
(1,'reseña',         'product_reviews',    'rating',         'Calificación y reseña de productos del catálogo Nike');

-- ----------------------------------------
-- Audit Logs iniciales
-- ----------------------------------------
INSERT INTO audit_logs (organization_id, user_id, action, entity_name, entity_id, details) VALUES
(1,1,
 'CONSULTA_STOCK_CRITICO','inventory',NULL,
 '{"agent":"Agente Inventario","tool":"RunQueryTool","result":"4 productos críticos en Lima Centro"}'::jsonb),
(1,2,
 'TRASLADO_APROBADO','transfer_orders',1,
 '{"from":"Arequipa","to":"Lima Centro","product":"Nike Zoom Pegasus Turbo 2","qty":50}'::jsonb),
(1,3,
 'MOVIMIENTO_INVENTARIO','inventory_movements',NULL,
 '{"type":"salida","product":"Nike Air Force 1 07","qty":42,"warehouse":"Lima Centro"}'::jsonb),
(1,1,
 'ORDEN_COMPRA_GENERADA','purchase_orders',2,
 '{"supplier":"Distribuidora Deportiva Peru","total":12450.00,"reason":"stock_critico"}'::jsonb),
(1,1,
 'SESION_AGENTE_INICIADA','agent_sessions',NULL,
 '{"agent_name":"Agente Inventario","agent_type":"inventory","user":"admin@nike.com"}'::jsonb);

-- ----------------------------------------
-- Artifacts del dashboard
-- ----------------------------------------
INSERT INTO artifacts (workspace_id, conversation_id, type, title, content) VALUES
(5,61,
 'table','Productos con Stock Crítico — Lima Centro',
 '{"columns":["producto","sku","almacen","stock_actual","stock_minimo","deficit"],
   "rows":[
     ["Nike Zoom Pegasus Turbo 2","AT8242-009","Lima Centro",8,25,-17],
     ["Nike Air Max 90","CD0490-104","Lima Centro",7,20,-13],
     ["Nike Air Max Verona","CZ6156-101","Lima Centro",5,20,-15],
     ["Nike SuperRep Go","CJ0860-668","Lima Centro",7,15,-8]
   ]}'::jsonb),
(5,61,
 'kpi','KPIs de Inventario — Resumen Ejecutivo',
 '{"kpis":[
   {"name":"Productos en Stock Crítico","value":4,"unit":"productos","trend":"warning"},
   {"name":"Stock Total Lima Centro","value":537,"unit":"unidades","trend":"down"},
   {"name":"Traslados Pendientes","value":1,"unit":"órdenes","trend":"neutral"},
   {"name":"Valor Inventario USD","value":89240.50,"unit":"USD","trend":"stable"}
 ]}'::jsonb),
(5,62,
 'map','Envíos Activos — Mapa GPS',
 '{"shipments":[
   {"tracking":"SHL-2025-NK001","origin":{"city":"Lima","lat":-12.046373,"lng":-77.042754},
    "destination":{"city":"Arequipa","lat":-16.409047,"lng":-71.537451},
    "status":"en_transito","carrier":"Shalom","eta_days":1},
   {"tracking":"OLV-2025-NK001","origin":{"city":"Lima","lat":-12.046373,"lng":-77.042754},
    "destination":{"city":"Trujillo","lat":-8.112782,"lng":-79.028370},
    "status":"preparacion","carrier":"Olva Courier","eta_days":2}
 ]}'::jsonb);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns
--   WHERE table_schema='nike_logistica' AND table_name=t.table_name) AS cols
-- FROM information_schema.tables t
-- WHERE table_schema = 'nike_logistica' ORDER BY table_name;
--
-- SELECT p.product_name, pr.rating, pr.review_count
-- FROM product_reviews pr JOIN products p ON pr.product_id = p.product_id
-- WHERE pr.rating > 0 ORDER BY pr.rating DESC;
--
-- SELECT p.product_name, w.warehouse_name, i.stock_qty, i.min_stock
-- FROM inventory i JOIN products p ON i.product_id = p.product_id
--   JOIN warehouses w ON i.warehouse_id = w.warehouse_id
-- WHERE i.stock_qty < i.min_stock ORDER BY (i.stock_qty - i.min_stock);
