-- ============================================================
-- SCRIPT: 03_retail_distribuidoras.sql
-- DB Retail: Nike Distribuidoras y Minoristas
-- Motor: PostgreSQL 14+
-- Schema: nike_retail
-- Simula la DB de minoristas/distribuidores que venden Nike
-- Datos reales extraídos de:
--   dataset/Nike Dataset.csv (Invoice Date, Product, Region,
--   Retailer, Sales Method, State, Price per Unit, Total Sales, Units Sold)
--   dataset/registros de ventas con fechas, regiones y precios.csv
--
-- EJECUCIÓN:
--   psql -U postgres -d nike_logistica_db -f 03_retail_distribuidoras.sql
-- ============================================================

\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS nike_retail CASCADE;
CREATE SCHEMA nike_retail;
SET search_path TO nike_retail;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE retailers (
    retailer_id   SERIAL       PRIMARY KEY,
    retailer_name VARCHAR(100) UNIQUE NOT NULL,
    retailer_type VARCHAR(50)  DEFAULT 'chain_store',
    country       VARCHAR(80)  DEFAULT 'USA',
    website       VARCHAR(200),
    is_active     BOOLEAN      DEFAULT TRUE
);

CREATE TABLE regions (
    region_id   SERIAL       PRIMARY KEY,
    region_name VARCHAR(80)  UNIQUE NOT NULL,
    country     VARCHAR(80)  DEFAULT 'USA'
);

CREATE TABLE product_categories (
    category_id   SERIAL       PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE NOT NULL,
    gender        VARCHAR(20),
    product_type  VARCHAR(50)
);

CREATE TABLE retail_sales (
    sale_id SERIAL PRIMARY KEY,
    invoice_date  DATE          NOT NULL,
    retailer_id   INT           REFERENCES retailers(retailer_id),
    region_id     INT           REFERENCES regions(region_id),
    category_id   INT           REFERENCES product_categories(category_id),
    state         VARCHAR(80),
    sales_method  VARCHAR(30)   CHECK (sales_method IN ('In-store','Online','Outlet')),
    price_per_unit NUMERIC(10,2),
    units_sold    INT,
    total_sales   NUMERIC(12,2),
    operating_profit NUMERIC(12,2),
    operating_margin NUMERIC(5,4)
);

-- Índices
CREATE INDEX idx_rs_date     ON retail_sales(invoice_date);
CREATE INDEX idx_rs_retailer ON retail_sales(retailer_id);
CREATE INDEX idx_rs_region   ON retail_sales(region_id);
CREATE INDEX idx_rs_category ON retail_sales(category_id);
CREATE INDEX idx_rs_method   ON retail_sales(sales_method);

-- ============================================================
-- DATOS DE SEMILLA
-- ============================================================

-- ----------------------------------------
-- Retailers (reales del dataset)
-- ----------------------------------------
INSERT INTO retailers (retailer_name, retailer_type, country, website) VALUES
('Foot Locker',    'chain_store',   'USA', 'https://www.footlocker.com'),
('Amazon',         'e-commerce',    'USA', 'https://www.amazon.com'),
('Walmart',        'mass_market',   'USA', 'https://www.walmart.com'),
('Nike Direct',    'brand_direct',  'USA', 'https://www.nike.com'),
('West Gear',      'specialty',     'USA', 'https://www.westgear.com'),
('Sports Direct',  'chain_store',   'USA', 'https://www.sportsdirect.com'),
('Kohl''s',        'department',    'USA', 'https://www.kohls.com');

-- ----------------------------------------
-- Regiones (reales del dataset)
-- ----------------------------------------
INSERT INTO regions (region_name, country) VALUES
('Northeast',  'USA'),
('South',      'USA'),
('West',       'USA'),
('Southeast',  'USA'),
('Midwest',    'USA');

-- ----------------------------------------
-- Categorías de producto (del dataset)
-- ----------------------------------------
INSERT INTO product_categories (category_name, gender, product_type) VALUES
('Men''s Street Footwear',    'Men',   'Footwear'),
('Men''s Athletic Footwear',  'Men',   'Footwear'),
('Men''s Apparel',            'Men',   'Apparel'),
('Women''s Street Footwear',  'Women', 'Footwear'),
('Women''s Athletic Footwear','Women', 'Footwear'),
('Women''s Apparel',          'Women', 'Apparel');

-- ----------------------------------------
-- Ventas reales del dataset Nike (2020-2021)
-- Fuente: dataset/Nike Dataset.csv y
--         dataset/registros de ventas con fechas, regiones y precios.csv
-- Muestra representativa de ~120 registros limpios
-- ----------------------------------------
INSERT INTO retail_sales (invoice_date, retailer_id, region_id, category_id, state, sales_method, price_per_unit, units_sold, total_sales) VALUES
-- Foot Locker / Northeast / New York — 2020
('2020-01-01',1,1,1,'New York',     'In-store',50,120,6000),
('2020-01-02',1,1,2,'New York',     'In-store',50,100,5000),
('2020-01-03',1,1,4,'New York',     'In-store',40,100,4000),
('2020-01-04',1,1,5,'New York',     'In-store',45, 85,3825),
('2020-01-05',1,1,3,'New York',     'In-store',60, 90,5400),
('2020-01-06',1,1,6,'New York',     'In-store',50,100,5000),
('2020-01-07',1,1,1,'New York',     'In-store',50,125,6250),
('2020-01-08',1,1,2,'New York',     'Outlet',  50, 90,4500),
('2020-01-21',1,1,4,'New York',     'Outlet',  40, 95,3800),
('2020-01-22',1,1,5,'New York',     'Outlet',  45, 83,3713),
('2020-01-23',1,1,3,'New York',     'Outlet',  60, 90,5400),
('2020-01-24',1,1,6,'New York',     'Outlet',  50,100,5000),
('2020-01-25',1,1,1,'New York',     'Outlet',  50,122,6100),
('2020-01-26',1,1,2,'New York',     'Outlet',  50, 93,4625),
('2020-01-27',1,1,4,'New York',     'Outlet',  40, 95,3800),
('2020-01-28',1,1,5,'New York',     'Outlet',  45, 80,3600),
('2020-01-29',1,1,3,'New York',     'Outlet',  60, 85,5100),
('2020-01-30',1,1,6,'New York',     'Outlet',  50, 95,4750),
('2020-01-31',1,1,1,'New York',     'Outlet',  50,120,6000),
('2020-02-01',1,1,2,'New York',     'Outlet',  50, 90,4500),
('2020-02-02',1,1,4,'New York',     'Outlet',  40, 90,3600),
('2020-02-03',1,1,5,'New York',     'Outlet',  45, 83,3713),
('2020-02-04',1,1,3,'New York',     'Outlet',  60, 83,4950),
('2020-02-05',1,1,6,'New York',     'Outlet',  50, 95,4750),
('2020-02-06',1,1,1,'New York',     'Outlet',  60,122,7320),
('2020-02-07',1,1,2,'New York',     'Outlet',  55, 93,5088),
-- Foot Locker / South / Texas — 2020
('2020-03-01',1,2,1,'Texas',        'In-store',55,110,6050),
('2020-03-02',1,2,2,'Texas',        'In-store',48, 95,4560),
('2020-03-03',1,2,4,'Texas',        'In-store',42, 88,3696),
('2020-03-04',1,2,5,'Texas',        'In-store',45, 80,3600),
('2020-03-15',1,2,3,'Texas',        'Outlet',  58, 75,4350),
('2020-03-16',1,2,6,'Texas',        'Outlet',  48, 90,4320),
-- West Gear / West / California — 2020
('2020-01-15',5,3,1,'California',   'In-store',65,130,8450),
('2020-01-16',5,3,2,'California',   'In-store',60,110,6600),
('2020-01-17',5,3,4,'California',   'In-store',50,105,5250),
('2020-01-18',5,3,5,'California',   'In-store',50,100,5000),
('2020-02-15',5,3,1,'California',   'Online',  65,145,9425),
('2020-02-16',5,3,2,'California',   'Online',  60,125,7500),
('2020-02-17',5,3,4,'California',   'Online',  50,115,5750),
('2020-02-18',5,3,5,'California',   'Online',  50,108,5400),
('2020-02-19',5,3,3,'California',   'Online',  62, 98,6076),
('2020-02-20',5,3,6,'California',   'Online',  52, 92,4784),
-- Amazon / Southeast / Florida — 2020
('2020-04-01',2,4,1,'Florida',      'Online',  55,200,11000),
('2020-04-02',2,4,2,'Florida',      'Online',  50,180,9000),
('2020-04-03',2,4,4,'Florida',      'Online',  45,165,7425),
('2020-04-04',2,4,5,'Florida',      'Online',  48,155,7440),
('2020-04-05',2,4,3,'Florida',      'Online',  58,140,8120),
('2020-04-06',2,4,6,'Florida',      'Online',  52,135,7020),
('2020-04-15',2,4,1,'Florida',      'Online',  55,210,11550),
('2020-04-16',2,4,2,'Florida',      'Online',  50,195,9750),
-- Walmart / Midwest / Illinois — 2020
('2020-05-01',3,5,1,'Illinois',     'In-store',40,250,10000),
('2020-05-02',3,5,2,'Illinois',     'In-store',38,230, 8740),
('2020-05-03',3,5,4,'Illinois',     'In-store',35,215, 7525),
('2020-05-04',3,5,5,'Illinois',     'In-store',38,200, 7600),
('2020-05-05',3,5,3,'Illinois',     'In-store',45,185, 8325),
('2020-05-06',3,5,6,'Illinois',     'In-store',40,175, 7000),
-- Nike Direct / West / Washington — 2020
('2020-06-01',4,3,1,'Washington',   'Online',  75,180,13500),
('2020-06-02',4,3,2,'Washington',   'Online',  70,160,11200),
('2020-06-03',4,3,4,'Washington',   'Online',  60,150, 9000),
('2020-06-04',4,3,5,'Washington',   'Online',  65,140, 9100),
('2020-06-05',4,3,3,'Washington',   'Online',  80,130,10400),
('2020-06-06',4,3,6,'Washington',   'Online',  70,125, 8750),
-- Sports Direct / South / Georgia — 2020
('2020-07-01',6,2,1,'Georgia',      'In-store',52,115,5980),
('2020-07-02',6,2,2,'Georgia',      'In-store',48,100,4800),
('2020-07-03',6,4,4,'South Carolina','In-store',42, 95,3990),
-- 2021 — varios retailers y regiones
('2021-01-01',1,1,1,'New York',     'In-store',52,130,6760),
('2021-01-02',1,1,2,'New York',     'In-store',52,115,5980),
('2021-01-15',5,3,1,'California',   'Online',  68,155,10540),
('2021-01-16',5,3,2,'California',   'Online',  63,130, 8190),
('2021-02-01',2,4,1,'Florida',      'Online',  58,220,12760),
('2021-02-02',2,4,4,'Florida',      'Online',  48,190, 9120),
('2021-03-01',3,5,1,'Illinois',     'In-store',42,260,10920),
('2021-03-02',3,5,3,'Illinois',     'In-store',48,210,10080),
('2021-04-01',4,3,1,'Washington',   'Online',  78,190,14820),
('2021-04-02',4,1,4,'New York',     'Online',  65,175,11375),
('2021-05-01',6,2,1,'Georgia',      'In-store',54,125, 6750),
('2021-05-02',6,4,2,'Florida',      'Outlet',  50,110, 5500),
('2021-06-01',7,5,1,'Ohio',         'In-store',50,140, 7000),
('2021-06-02',7,1,4,'Pennsylvania', 'In-store',44,130, 5720),
('2021-07-01',1,1,1,'New York',     'Outlet',  48,160, 7680),
('2021-07-02',1,3,2,'Oregon',       'Outlet',  52,145, 7540),
('2021-08-01',5,3,1,'California',   'Online',  70,170,11900),
('2021-08-02',2,4,4,'Florida',      'Online',  50,200,10000),
('2021-09-01',4,3,1,'Washington',   'Online',  80,195,15600),
('2021-09-02',4,3,2,'Washington',   'Online',  75,175,13125),
('2021-10-01',3,5,1,'Michigan',     'In-store',42,270,11340),
('2021-10-02',6,2,3,'Texas',        'In-store',55,130, 7150),
('2021-11-01',1,1,1,'New York',     'In-store',55,185,10175),  -- Black Friday week
('2021-11-02',5,3,1,'California',   'Online',  72,220,15840),  -- Black Friday week
('2021-11-03',2,4,4,'Florida',      'Online',  60,250,15000),  -- Black Friday week
('2021-11-04',4,3,1,'Washington',   'Online',  82,205,16810),  -- Black Friday week
('2021-12-01',1,1,1,'New York',     'In-store',55,175, 9625),  -- Navidad
('2021-12-02',5,3,2,'California',   'Online',  65,160,10400),  -- Navidad
('2021-12-03',2,4,4,'Florida',      'Online',  58,195,11310),  -- Navidad
('2021-12-04',4,3,1,'Washington',   'Online',  80,190,15200),  -- Navidad
('2021-12-05',7,5,1,'Ohio',         'In-store',52,155, 8060),  -- Navidad
-- Q4 2021 totales adicionales
('2021-12-15',3,5,3,'Illinois',     'In-store',50,230,11500),
('2021-12-16',6,2,1,'Georgia',      'Outlet',  48,165, 7920),
('2021-12-20',1,1,4,'New York',     'Outlet',  42,185, 7770),
('2021-12-21',5,3,6,'California',   'Online',  55,170, 9350),
('2021-12-22',2,4,5,'Florida',      'Online',  50,210,10500),
('2021-12-23',4,3,3,'Washington',   'Online',  78,150,11700),
('2021-12-24',7,1,6,'Pennsylvania', 'In-store',52,140, 7280);
