-- Migration: Añadir columnas para tracking de transferencias
-- Schema: nike_logistica (central platform)

-- 1. Route: añadir waypoints (array JSON de [lat, lng] para rutas reales)
ALTER TABLE nike_logistica.routes
  ADD COLUMN IF NOT EXISTS waypoints JSONB;

-- 2. Shipment: añadir columnas de tracking
ALTER TABLE nike_logistica.shipments
  ADD COLUMN IF NOT EXISTS destination_warehouse_id INT REFERENCES nike_logistica.warehouses(warehouse_id),
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(30) DEFAULT 'truck',
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS quantity INT;

-- 3. Actualizar waypoints para rutas existentes
UPDATE nike_logistica.routes SET waypoints = '[
  [-12.046373, -77.042754],
  [-12.500000, -77.200000],
  [-13.000000, -77.000000],
  [-13.500000, -76.500000],
  [-14.000000, -76.000000],
  [-14.500000, -75.500000],
  [-15.000000, -75.000000],
  [-15.500000, -74.500000],
  [-16.000000, -73.500000],
  [-16.200000, -72.500000],
  [-16.409047, -71.537451]
]'::jsonb WHERE route_id = 1;

UPDATE nike_logistica.routes SET waypoints = '[
  [-12.046373, -77.042754],
  [-11.800000, -77.150000],
  [-11.500000, -77.300000],
  [-11.200000, -77.500000],
  [-10.800000, -78.000000],
  [-10.500000, -78.300000],
  [-10.000000, -78.600000],
  [-9.500000, -78.800000],
  [-9.000000, -79.000000],
  [-8.500000, -79.000000],
  [-8.112782, -79.028370]
]'::jsonb WHERE route_id = 2;

UPDATE nike_logistica.routes SET waypoints = '[
  [-12.046373, -77.042754],
  [-12.300000, -76.800000],
  [-12.600000, -76.200000],
  [-12.800000, -75.800000],
  [-13.000000, -75.500000],
  [-13.200000, -75.000000],
  [-13.300000, -74.500000],
  [-13.400000, -73.500000],
  [-13.500000, -72.500000],
  [-13.531950, -71.967463]
]'::jsonb WHERE route_id = 3;

UPDATE nike_logistica.routes SET waypoints = '[
  [-16.409047, -71.537451],
  [-16.600000, -71.200000],
  [-16.800000, -71.000000],
  [-17.000000, -70.980000],
  [-17.193037, -70.935163]
]'::jsonb WHERE route_id = 4;

UPDATE nike_logistica.routes SET waypoints = '[
  [-12.046373, -77.042754],
  [-12.020000, -77.050000],
  [-12.000000, -77.060000],
  [-11.997399, -77.070756]
]'::jsonb WHERE route_id = 5;

-- 4. Rutas adicionales para cubrir pares entre almacenes
INSERT INTO nike_logistica.routes (organization_id, route_name, origin_city, destination_city, estimated_hours, distance_km, carrier, waypoints)
VALUES
(1, 'Arequipa → Lima', 'Arequipa', 'Lima', 16.0, 1010.0, 'Shalom',
 '[
   [-16.409047, -71.537451],
   [-16.200000, -72.500000],
   [-16.000000, -73.500000],
   [-15.500000, -74.500000],
   [-15.000000, -75.000000],
   [-14.500000, -75.500000],
   [-14.000000, -76.000000],
   [-13.500000, -76.500000],
   [-13.000000, -77.000000],
   [-12.500000, -77.200000],
   [-12.046373, -77.042754]
 ]'::jsonb)
ON CONFLICT DO NOTHING;

-- 5. Añadir constraint unique para evitar duplicados de ruta (origin→destination)
-- Nota: No se añade constraint porque puede haber múltiples carriers/rutas entre mismas ciudades
