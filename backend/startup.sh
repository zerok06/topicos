#!/bin/bash
# ==============================================================
# startup.sh — Nike Logística Backend
# Ejecuta el seed inicial y luego levanta el servidor FastAPI.
#
# El seed es idempotente: si los usuarios/permisos ya existen,
# los salta. Se ejecuta en cada inicio del contenedor.
# ==============================================================

set -e

echo "=========================================="
echo "  Nike Logística — Inicializando..."
echo "=========================================="

# Seed: permisos, usuarios demo y audit logs
echo ""
echo "[1/2] Ejecutando seed maestro..."
cd /workspace
python -m app.core.seed_master
echo ""

echo "[2/2] Iniciando servidor FastAPI..."
echo "=========================================="
echo ""

# Arrancar uvicorn
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /workspace/app
