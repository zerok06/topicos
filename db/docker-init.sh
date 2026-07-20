#!/bin/bash
# ==============================================================
# db/docker-init.sh
# Script de inicialización de la base de datos Nike Logística
# Se ejecuta automáticamente en el primer arranque del contenedor
# ==============================================================

set -e   # Detener ante cualquier error

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Nike Logística — Inicializando Base de Datos  ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

PSQL="psql -v ON_ERROR_STOP=1 --username=$POSTGRES_USER --dbname=$POSTGRES_DB"

echo -e "${YELLOW}[1/4] Schema: nike_logistica (Plataforma Central — 24 tablas + pgvector)${NC}"
$PSQL -f /db-scripts/01_platform_central.sql
echo -e "${GREEN}      ✓ nike_logistica creado exitosamente${NC}"
echo ""

echo -e "${YELLOW}[2/4] Schema: nike_sede_peru (Sede Operativa — 5 almacenes GPS)${NC}"
$PSQL -f /db-scripts/02_sede_nike_peru.sql
echo -e "${GREEN}      ✓ nike_sede_peru creado exitosamente${NC}"
echo ""

echo -e "${YELLOW}[3/4] Schema: nike_retail (Distribuidoras — ventas 2020-2021)${NC}"
$PSQL -f /db-scripts/03_retail_distribuidoras.sql
echo -e "${GREEN}      ✓ nike_retail creado exitosamente${NC}"
echo ""

echo -e "${YELLOW}[4/4] Schema: nike_supply_chain (Fábricas globales)${NC}"
$PSQL -f /db-scripts/04_proveedores_fabricas.sql
echo -e "${GREEN}      ✓ nike_supply_chain creado exitosamente${NC}"
echo ""

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ Base de datos inicializada correctamente   ${NC}"
echo -e "${GREEN}  Schemas: nike_logistica, nike_sede_peru,      ${NC}"
echo -e "${GREEN}           nike_retail, nike_supply_chain       ${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}  NOTA: Los vectores en product_embeddings están en NULL.${NC}"
echo -e "${YELLOW}  Ejecutar seed.py del backend para poblarlos con${NC}"
echo -e "${YELLOW}  SentenceTransformers (all-MiniLM-L6-v2, 384 dims).${NC}"
echo ""
