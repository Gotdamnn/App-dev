#!/bin/bash

echo "=========================================="
echo "PatientPulse Azure Deployment Verification"
echo "=========================================="

echo ""
echo "🔍 Environment Check:"
echo "  Node Version: $(node -v)"
echo "  npm Version: $(npm -v)"
echo "  NODE_ENV: ${NODE_ENV}"
echo "  PORT: ${PORT}"

echo ""
echo "📁 Backend Directory:"
ls -la backend/ | head -20

echo ""
echo "📦 Node Modules:"
if [ -d "backend/node_modules" ]; then
  echo "  ✅ node_modules exists"
  echo "  Installed packages: $(ls backend/node_modules | wc -l)"
else
  echo "  ❌ node_modules missing"
fi

echo ""
echo "🔐 Environment Files:"
[ -f "backend/.env" ] && echo "  ✅ .env found" || echo "  ❌ .env missing"
[ -f "backend/.env.production" ] && echo "  ✅ .env.production found" || echo "  ❌ .env.production missing"

echo ""
echo "=========================================="
