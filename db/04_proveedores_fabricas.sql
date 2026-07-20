-- ============================================================
-- SCRIPT: 04_proveedores_fabricas.sql
-- DB Supply Chain: Fábricas y Proveedores Globales Nike
-- Motor: PostgreSQL 14+
-- Schema: nike_supply_chain
-- Simula la DB de la cadena de suministro global Nike
-- Datos reales extraídos de:
--   dataset/imap_export.csv (Factory Name, Factory Type,
--   Product Type, Brand, Supplier Group, Address, City,
--   Country, Region, Total Workers, % Female, % Migrant)
--
-- EJECUCIÓN:
--   psql -U postgres -d nike_logistica_db -f 04_proveedores_fabricas.sql
-- ============================================================

\set ON_ERROR_STOP on

DROP SCHEMA IF EXISTS nike_supply_chain CASCADE;
CREATE SCHEMA nike_supply_chain;
SET search_path TO nike_supply_chain;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE supplier_groups (
    group_id    SERIAL       PRIMARY KEY,
    group_name  VARCHAR(100) UNIQUE NOT NULL,
    hq_country  VARCHAR(80),
    hq_city     VARCHAR(80),
    website     VARCHAR(200),
    notes       TEXT
);

CREATE TABLE factories (
    factory_id SERIAL PRIMARY KEY,
    group_id         INT          REFERENCES supplier_groups(group_id),
    factory_name     VARCHAR(200) NOT NULL,
    factory_type     VARCHAR(50)  CHECK (factory_type IN ('FINISHED GOODS','MATERIAL','COMPONENT')),
    product_types    VARCHAR(200),              -- Footwear, Apparel, Equipment (puede ser múltiple)
    nike_brands      VARCHAR(200),              -- Nike, Converse, Hurley, Jordan
    address          TEXT,
    city             VARCHAR(100),
    state_province   VARCHAR(100),
    postal_code      VARCHAR(20),
    country          VARCHAR(80)  NOT NULL,
    global_region    VARCHAR(50)  CHECK (global_region IN ('SE ASIA','S ASIA','AMERICAS','EMEA','GREATER CHINA','JAPAN','KOREA')),
    total_workers    INT,
    line_workers     INT,
    pct_female       NUMERIC(5,2),             -- % trabajadoras mujeres
    pct_migrant      NUMERIC(5,2),             -- % trabajadores migrantes
    has_events       BOOLEAN      DEFAULT FALSE, -- eventos de cumplimiento
    is_active        BOOLEAN      DEFAULT TRUE,
    registered_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_sc_factories_country ON factories(country);
CREATE INDEX idx_sc_factories_region  ON factories(global_region);
CREATE INDEX idx_sc_factories_type    ON factories(factory_type);
CREATE INDEX idx_sc_factories_group   ON factories(group_id);

-- ============================================================
-- DATOS DE SEMILLA
-- ============================================================

-- ----------------------------------------
-- Grupos proveedores (reales del CSV)
-- ----------------------------------------
INSERT INTO supplier_groups (group_name, hq_country, hq_city, notes) VALUES
('A & K DESIGNS',      'USA',        'Portland',       'Proveedor de apparel en USA'),
('EXCELLENCE SPORTING GOODS','Vietnam','Binh Duong',   'Proveedor de equipamiento deportivo'),
('MAS HOLDINGS',       'Sri Lanka',  'Colombo',        'Gran grupo textil de Asia del Sur'),
('HUALI',              'Vietnam',    'Ninh Binh',      'Mayor fabricante de calzado Converse/Nike'),
('SHAHI',              'India',      'Bangalore',      'Gran fabricante textil de India'),
('MILTEKS',            'Georgia',    'Tbilisi',        'Fabricante textil en EMEA'),
('SPORTS GEAR',        'Vietnam',    'Ba Ria-Vung Tau','Fabricante calzado SE Asia'),
('POU CHEN GROUP',     'Taiwan',     'Taichung',       'Mayor fabricante de calzado Nike en el mundo'),
('FENG TAY',           'Taiwan',     'Taipei',         'Segundo mayor fabricante calzado Nike'),
('CHANG SHIN',         'Vietnam',    'Ho Chi Minh',    'Fabricante calzado premium Nike'),
('SAITEX',             'Vietnam',    'Binh Duong',     'Denim y apparel premium'),
('PAN PACIFIC',        'Thailand',   'Bangkok',        'Fabricante de ropa deportiva SE Asia'),
('TAN TIEN CORP',      'Vietnam',    'Dong Nai',       'Calzado y apparel Vietnam'),
('YUE YUEN',           'China',      'Guangdong',      'Subsidiaria Pou Chen, calzado China'),
('ECLAT TEXTILE',      'Taiwan',     'New Taipei',     'Tejidos técnicos para ropa deportiva'),
('NIEN HSING',         'Taiwan',     'Taipei',         'Denim y bottoms en Guatemala/Vietnam'),
('HANA MICROELECTRONICS','Thailand','Bangkok',          'Electrónica wearables Nike'),
('DELTA GALIL',        'Israel',     'Tel Aviv',       'Calcetines y ropa interior deportiva'),
('VICTORY APPAREL',    'Jordan',     'Zarqa',          'Apparel EMEA - producción Jordan'),
('ARVIND LIMITED',     'India',      'Ahmedabad',      'Textiles y denim India'),
('ADIS GROUP',         'Indonesia',  'Jakarta',        'Calzado Indonesia — Footwear');

-- ----------------------------------------
-- Fábricas (50 reales del imap_export.csv)
-- ----------------------------------------
INSERT INTO factories
  (group_id, factory_name, factory_type, product_types, nike_brands,
   address, city, state_province, postal_code, country, global_region,
   total_workers, line_workers, pct_female, pct_migrant, has_events)
VALUES
(1, 'A & K Designs, Inc.','FINISHED GOODS','Apparel','Nike',
 '8564 NE Alderwood Road','Portland','Oregon','97220','USA','AMERICAS',111,95,73,0,FALSE),

(2, 'ACode Sporting Goods Co., Ltd.','FINISHED GOODS','Equipment','Nike',
 'No 32 VSIP II A Street 31','Bac Tan Uyen','Bình Duong','822710','Vietnam','SE ASIA',347,318,79,0,FALSE),

(3, 'Ad Dulyal','FINISHED GOODS','Apparel','Nike',
 'Part of land no 1075 Basin 5 Ad Dulayl','Zarqa','Az Zarqa','11183','Jordan','EMEA',1303,1166,87,75,FALSE),

(4, 'ADORA FOOTWEAR LIMITED','FINISHED GOODS','Footwear','Converse',
 'TAM DIEP INDUSTRY ZONE','Ninh Binh Province','Ninh Bình','430000','Vietnam','SE ASIA',8120,6800,86,0,FALSE),

(5, 'AHP APPAREL PVT LTD., UNIT 60','FINISHED GOODS','Apparel','Nike',
 '207 ABDE F KIADB INDUSTRIAL AREA','HASSAN','Karnataka','573201','India','S ASIA',2704,906,75,0,TRUE),

(5, 'AHP APPARELS PVT.LTD. UNIT 61','FINISHED GOODS','Apparel','Nike',
 'SY NO 34 35 37 A TO 37H, SHIKARIPURA','Shivamogga','Karnataka','577427','India','S ASIA',1573,861,75,0,FALSE),

(6, 'Ajara 1','FINISHED GOODS','Apparel','Nike',
 'Bobokvati Street 14 Bobokvati Village','Kobuleti','Ajaria','6200','Georgia','EMEA',1227,1153,96,0,FALSE),

(6, 'Ajara Textile Ltd','FINISHED GOODS','Apparel','Nike',
 '31 Motserelia Str','Poti','Samegrelo-Zemo Sva','4400','Georgia','EMEA',1394,1275,92,0,FALSE),

(7, 'All Wells International Co., Ltd.','FINISHED GOODS','Footwear','Nike',
 '81 Road Toc Tien Commune Phu My Town','Phu My','Bà Ra - Vung Tàu','790000','Vietnam','SE ASIA',2904,2137,81,0,FALSE),

(8, 'Pou Chen Vietnam — Plant 1','FINISHED GOODS','Footwear','Nike, Jordan',
 'Long Thanh Industrial Zone, Lot A-1','Long Thanh','Dong Nai','810000','Vietnam','SE ASIA',12500,10800,82,5,FALSE),

(8, 'Pou Chen Vietnam — Plant 2','FINISHED GOODS','Footwear','Nike',
 'My Phuoc 3 Industrial Zone','Ben Cat','Bình Duong','820000','Vietnam','SE ASIA',9800,8400,80,4,FALSE),

(9, 'Feng Tay Vietnam — Plant A','FINISHED GOODS','Footwear','Nike',
 'VSIP Quang Ngai Industrial Zone','Quang Ngai City','Quảng Ngãi','570000','Vietnam','SE ASIA',7200,6300,85,0,FALSE),

(9, 'Feng Tay Indonesia','FINISHED GOODS','Footwear','Nike',
 'Jl. Raya Serang KM 24','Cikande','Banten','42186','Indonesia','SE ASIA',5100,4400,76,2,FALSE),

(21, 'PT Adis Dimension Footwear','FINISHED GOODS','Footwear','Nike, Jordan',
 'Jl. Raya Serang KM 19.5, Balaraja','Tangerang','Banten','15610','Indonesia','SE ASIA',6800,5900,72,0,FALSE),

(10, 'Chang Shin Vietnam','FINISHED GOODS','Footwear','Nike',
 'Phu Nghia Industrial Cluster','Chuong My','Hà Nội','100000','Vietnam','SE ASIA',10200,8900,88,0,FALSE),

(8, 'Pou Chen — Surabaya Plant','FINISHED GOODS','Footwear','Nike, Converse',
 'SIER Industrial Estate, Jl. Berbek Industri','Surabaya','East Java','60293','Indonesia','SE ASIA',4300,3700,79,1,FALSE),

(11, 'Saitex International Dong Nai','FINISHED GOODS','Apparel','Nike',
 'D1 Road, Long Duc Industrial Zone','Trang Bom','Dong Nai','762000','Vietnam','SE ASIA',2100,1980,82,0,FALSE),

(12, 'Pan Pacific — Chonburi Plant','FINISHED GOODS','Apparel','Nike',
 '700/474 Moo 6, Amata City Industrial Estate','Rayong','Rayong','21130','Thailand','SE ASIA',1850,1700,91,8,FALSE),

(13, 'Tan Tien Corp — Factory 1','FINISHED GOODS','Footwear','Nike',
 'Long Binh Industrial Zone, Quarter 3','Bien Hoa','Dong Nai','810000','Vietnam','SE ASIA',3400,2950,78,0,FALSE),

(14, 'Yue Yuen Dongguan','FINISHED GOODS','Footwear','Nike, Converse',
 'No. 8, Yue Yuen Rd, Gaobu Town','Dongguan','Guangdong','523000','China','GREATER CHINA',18000,15200,74,12,TRUE),

(14, 'Yue Yuen Zhongshan','FINISHED GOODS','Footwear','Nike',
 'No. 1 Guanlong Road, Torch Hi-Tech Zone','Zhongshan','Guangdong','528437','China','GREATER CHINA',9500,8100,71,10,FALSE),

(15, 'Eclat Textile — Plant 1 (Vietnam)','FINISHED GOODS','Apparel','Nike',
 'Lot CN1 Hoa Khanh Industrial Zone','Da Nang','Đà Nẵng','550000','Vietnam','SE ASIA',2800,2600,89,0,FALSE),

(15, 'Eclat Textile — Taiwan HQ','FINISHED GOODS','Apparel','Nike',
 'No. 459, Section 2, Zhongshan Rd.','New Taipei City','New Taipei','24152','Taiwan','GREATER CHINA',1200,980,68,0,FALSE),

(16, 'Nien Hsing Textile — Nicaragua','FINISHED GOODS','Apparel','Nike',
 'Zona Franca Las Mercedes, Km 10 Carr Norte','Managua','Managua','14026','Nicaragua','AMERICAS',6500,5900,82,0,FALSE),

(3, 'MAS Linea Aqua (Sri Lanka)','FINISHED GOODS','Apparel','Nike',
 'Free Trade Zone, Katunayake','Katunayake','Western','11450','Sri Lanka','S ASIA',3200,2900,91,0,FALSE),

(3, 'MAS Holdings — Jordan Plant','FINISHED GOODS','Apparel','Nike',
 'Al Dulayl Industrial Park, Phase 2','Zarqa','Az Zarqa','13114','Jordan','EMEA',2100,1880,86,78,FALSE),

(18, 'Delta Galil — Israel HQ','FINISHED GOODS','Apparel','Nike',
 '2 Kaufmann St, Sarona Tower, 24th Floor','Tel Aviv','Tel Aviv','6801210','Israel','EMEA',3800,3200,62,0,FALSE),

(19, 'Victory Apparel Jordan','FINISHED GOODS','Apparel','Nike',
 'Al Dulayl Industrial City, Bldg. A7','Zarqa','Az Zarqa','13114','Jordan','EMEA',1680,1520,85,72,FALSE),

(20, 'Arvind Limited — Ahmedabad','FINISHED GOODS','Apparel','Nike',
 'Naroda Industrial Estate, Phase 4','Ahmedabad','Gujarat','382325','India','S ASIA',4100,3600,58,0,FALSE),

(20, 'Arvind Lifestyle Brands','FINISHED GOODS','Apparel','Nike',
 'Plot 9A & 9B, KIADB Industrial Area','Bangalore','Karnataka','560099','India','S ASIA',2200,1950,65,0,FALSE),

(5, 'Shahi Exports — Unit 50','FINISHED GOODS','Apparel','Nike',
 'Plot No 102-104, Doddaballapur Industrial Area','Bangalore','Karnataka','561203','India','S ASIA',5800,5100,82,0,TRUE),

(5, 'Shahi Exports — Unit 70 (Punjab)','FINISHED GOODS','Apparel','Nike',
 'G.T. Road, Bahadurgarh Industrial Area','Bahadurgarh','Haryana','124507','India','S ASIA',3400,3100,78,0,FALSE),

(7, 'Sports Gear Vietnam — Plant B','FINISHED GOODS','Footwear','Nike',
 'Long Duc Industrial Zone, Lot B-12','Trang Bom','Dong Nai','762000','Vietnam','SE ASIA',2200,1900,80,3,FALSE),

(8, 'Pou Chen — Batam Island','FINISHED GOODS','Footwear','Nike, Jordan, Converse',
 'Muka Kuning Industrial Estate, Batam','Batam','Kepulauan Riau','29433','Indonesia','SE ASIA',7100,6200,77,4,FALSE),

(NULL,'PT Pratama Abadi Industri','FINISHED GOODS','Footwear','Nike',
 'Jl. Raya Pelabuhan KM 10, Citeurep','Bogor','West Java','16810','Indonesia','SE ASIA',8900,7700,68,0,FALSE),

(NULL,'Texhong Textile Group — Vietnam','MATERIAL','Apparel','Nike',
 'Que Vo Industrial Zone, Lot H-2','Que Vo','Bắc Ninh','221720','Vietnam','SE ASIA',1600,1450,85,0,FALSE),

(NULL,'Ching Luh Shoes — Vietnam','FINISHED GOODS','Footwear','Nike',
 'Yen My Industrial Zone, Lot D-4','My Hao','Hưng Yên','163000','Vietnam','SE ASIA',6300,5500,83,0,FALSE),

(NULL,'Ramatex Berhad — Cambodia','FINISHED GOODS','Apparel','Nike',
 'PPSEZ, National Road 1','Phnom Penh','Phnom Penh','120906','Cambodia','SE ASIA',8700,7900,91,5,FALSE),

(NULL,'C&H Garment Manufacturing','FINISHED GOODS','Apparel','Nike',
 'Stung Meanchey SEZ','Phnom Penh','Phnom Penh','120711','Cambodia','SE ASIA',3100,2800,94,6,FALSE),

(NULL,'Texwinca Holdings — Thailand','FINISHED GOODS','Apparel','Nike',
 'Amata City Rayong, Factory B-15','Rayong','Rayong','21130','Thailand','SE ASIA',2400,2200,86,10,FALSE),

(NULL,'Luen Thai Holdings — Vietnam','FINISHED GOODS','Apparel','Nike',
 'Dai Dang Industrial Zone','Dong Nai','Dong Nai','762000','Vietnam','SE ASIA',5200,4700,88,2,FALSE),

(NULL,'PT Eratex Djaja','MATERIAL','Apparel','Nike',
 'Jl. Soekarno Hatta No. 23','Probolinggo','East Java','67217','Indonesia','SE ASIA',1800,1600,72,0,FALSE),

(NULL,'TAL Apparel — Bangladesh','FINISHED GOODS','Apparel','Nike',
 'DEPZ Industrial Zone, Plot 12','Dhaka','Dhaka','1341','Bangladesh','S ASIA',4500,4100,90,0,TRUE),

(NULL,'Pacific Sportswear — El Salvador','FINISHED GOODS','Apparel','Nike',
 'American Industrial Park, Km 26.5 Carr Panamericana','Soyapango','San Salvador','01101','El Salvador','AMERICAS',2800,2600,83,0,FALSE),

(NULL,'Hanesbrands — Honduras','FINISHED GOODS','Apparel','Nike',
 'Zip Buena Vista, Blvd Morazan Km 7','San Pedro Sula','Cortés','21101','Honduras','AMERICAS',6200,5800,79,0,FALSE),

(NULL,'Star Footwear Group — China','FINISHED GOODS','Footwear','Nike',
 'Longhua District, Foxconn Science Park B5','Shenzhen','Guangdong','518109','China','GREATER CHINA',3800,3300,68,15,FALSE),

(NULL,'Makalot Industrial — Taiwan','FINISHED GOODS','Apparel','Nike',
 'No. 88, Xinshe Road, Zhongli District','Taoyuan','Taoyuan','320','Taiwan','GREATER CHINA',890,760,65,0,FALSE),

(NULL,'Han Yang — South Korea','FINISHED GOODS','Footwear','Nike, Jordan',
 '167 Gongdan-ro, Gumi-si','Gumi','Gyeongsangbuk-do','39371','South Korea','KOREA',2100,1850,58,8,FALSE),

(NULL,'Mizuki — Japan Production','FINISHED GOODS','Footwear','Nike',
 '1-2-3 Katase Fujisawa-shi','Fujisawa','Kanagawa','251-0032','Japan','JAPAN',450,390,52,0,FALSE),

(NULL,'Haddad Brands — Brazil','FINISHED GOODS','Apparel','Nike',
 'Rua Funchal 418, Conj. 31, Vila Olímpia','São Paulo','São Paulo','04551-060','Brazil','AMERICAS',1200,1050,62,0,FALSE);

-- ============================================================
-- VISTAS ÚTILES PARA EL AGENTE IA
-- ============================================================

CREATE VIEW v_factories_by_country AS
SELECT country, global_region,
       COUNT(*)                             AS total_factories,
       SUM(total_workers)                   AS total_workers,
       ROUND(AVG(pct_female),1)             AS avg_pct_female,
       STRING_AGG(DISTINCT product_types, ', ' ORDER BY product_types) AS product_types
FROM factories
WHERE is_active = TRUE
GROUP BY country, global_region
ORDER BY total_factories DESC;

CREATE VIEW v_factories_footwear AS
SELECT f.factory_name, f.city, f.country, f.global_region,
       sg.group_name AS supplier_group,
       f.total_workers, f.pct_female, f.pct_migrant, f.has_events
FROM factories f
LEFT JOIN supplier_groups sg ON f.group_id = sg.group_id
WHERE f.product_types ILIKE '%Footwear%' AND f.is_active = TRUE
ORDER BY f.total_workers DESC;

CREATE VIEW v_supplier_summary AS
SELECT sg.group_name,
       sg.hq_country,
       COUNT(f.factory_id)  AS num_factories,
       SUM(f.total_workers) AS total_workers,
       STRING_AGG(DISTINCT f.country, ', ' ORDER BY f.country) AS countries
FROM supplier_groups sg
LEFT JOIN factories f ON sg.group_id = f.group_id
GROUP BY sg.group_id, sg.group_name, sg.hq_country
ORDER BY num_factories DESC;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- SELECT * FROM v_factories_by_country LIMIT 10;
-- SELECT * FROM v_factories_footwear LIMIT 10;
-- SELECT country, COUNT(*) FROM factories GROUP BY country ORDER BY 2 DESC;
-- SELECT global_region, SUM(total_workers) AS workers FROM factories GROUP BY global_region;
