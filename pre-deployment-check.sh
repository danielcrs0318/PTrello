#!/bin/bash

################################################################################
# Script de Pre-Verificación para Deployment
# Ejecutar ANTES de hacer el deployment para verificar que todo está listo
# Uso: bash pre-deployment-check.sh
################################################################################

echo "🔍 PTrello - Verificación Pre-Deployment"
echo "================================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS=0
WARNINGS=0
ERRORS=0

# Función para imprimir resultado
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        SUCCESS=$((SUCCESS + 1))
    elif [ $1 -eq 1 ]; then
        echo -e "${YELLOW}⚠️  $2${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${RED}❌ $2${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

# =============================================================================
# 1. VERIFICAR ARCHIVOS LOCALES
# =============================================================================
echo "1️⃣ Verificando archivos locales..."

if [ -f "docker-compose.prod.yml" ]; then
    print_result 0 "docker-compose.prod.yml existe"
else
    print_result 2 "docker-compose.prod.yml NO existe"
fi

if [ -f ".github/workflows/build-and-push.yml" ]; then
    print_result 0 "Workflow build-and-push.yml existe"
else
    print_result 2 "Workflow build-and-push.yml NO existe"
fi

if [ -f ".github/workflows/deploy.yml" ]; then
    print_result 0 "Workflow deploy.yml existe"
else
    print_result 2 "Workflow deploy.yml NO existe"
fi

if [ -f "deploy.sh" ]; then
    print_result 0 "Script deploy.sh existe"
else
    print_result 2 "Script deploy.sh NO existe"
fi

if [ -f ".env.production.example" ]; then
    print_result 0 ".env.production.example existe"
else
    print_result 1 ".env.production.example NO existe (opcional)"
fi

echo ""

# =============================================================================
# 2. VERIFICAR IMÁGENES DOCKER USANdo-compose
# =============================================================================
echo "2️⃣ Verificando configuración docker-compose.prod.yml..."

if grep -q "image: molinacont18/ptrello-backend:latest" docker-compose.prod.yml; then
    print_result 0 "Backend configurado para usar imagen de Docker Hub"
else
    print_result 2 "Backend NO está configurado para usar imagen"
fi

if grep -q "image: molinacont18/ptrello-frontend:latest" docker-compose.prod.yml; then
    print_result 0 "Frontend configurado para usar imagen de Docker Hub"
else
    print_result 2 "Frontend NO está configurado para usar imagen"
fi

echo ""

# =============================================================================
# 3. VERIFICAR CONEXIÓN AL SERVIDOR (Si se proporciona)
# =============================================================================
echo "3️⃣ Verificar conexión al servidor Ubuntu..."
echo ""
read -p "Ingresa la IP del servidor (o presiona Enter para omitir): " SERVER_IP

if [ ! -z "$SERVER_IP" ]; then
    read -p "Ingresa el usuario SSH (default: ubuntu): " SERVER_USER
    SERVER_USER=${SERVER_USER:-ubuntu}
    
    echo "Probando conexión SSH a $SERVER_USER@$SERVER_IP..."
    
    if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "exit" 2>/dev/null; then
        print_result 0 "Conexión SSH exitosa"
        
        # Verificar Docker en servidor
        if ssh "$SERVER_USER@$SERVER_IP" "docker --version" &>/dev/null; then
            print_result 0 "Docker instalado en servidor"
        else
            print_result 2 "Docker NO está instalado en servidor"
        fi
        
        # Verificar directorio /opt/ptrello
        if ssh "$SERVER_USER@$SERVER_IP" "test -d /opt/ptrello" 2>/dev/null; then
            print_result 0 "Directorio /opt/ptrello existe"
            
            # Verificar .env.production
            if ssh "$SERVER_USER@$SERVER_IP" "test -f /opt/ptrello/.env.production" 2>/dev/null; then
                print_result 0 ".env.production existe en servidor"
            else
                print_result 2 ".env.production NO existe en servidor"
            fi
        else
            print_result 2 "Directorio /opt/ptrello NO existe"
        fi
        
    else
        print_result 2 "No se pudo conectar al servidor vía SSH"
    fi
else
    print_result 1 "Verificación de servidor omitida"
fi

echo ""

# =============================================================================
# 4. VERIFICAR GIT
# =============================================================================
echo "4️⃣ Verificando configuración Git..."

# Verificar que estamos en un repo git
if git rev-parse --git-dir > /dev/null 2>&1; then
    print_result 0 "Directorio es un repositorio Git"
    
    # Verificar rama actual
    CURRENT_BRANCH=$(git branch --show-current)
    echo "   Rama actual: $CURRENT_BRANCH"
    
    # Verificar cambios sin commitear
    if git diff-index --quiet HEAD --; then
        print_result 0 "No hay cambios sin commitear"
    else
        print_result 1 "Hay cambios sin commitear"
    fi
    
    # Verificar si hay remote configurado
    if git remote -v | grep -q "origin"; then
        print_result 0 "Remote 'origin' configurado"
    else
        print_result 2 "Remote 'origin' NO está configurado"
    fi
    
else
    print_result 2 "NO es un repositorio Git"
fi

echo ""

# =============================================================================
# 5. VERIFICAR DOCKER LOCAL (Opcional)
# =============================================================================
echo "5️⃣ Verificando Docker local (opcional)..."

if command -v docker &> /dev/null; then
    print_result 0 "Docker instalado localmente"
    
    if docker info &> /dev/null; then
        print_result 0 "Docker daemon está corriendo"
    else
        print_result 1 "Docker daemon NO está corriendo"
    fi
else
    print_result 1 "Docker NO está instalado localmente (no necesario para CI/CD)"
fi

echo ""

# =============================================================================
# 6. RECORDATORIOS DE GITHUB SECRETS
# =============================================================================
echo "6️⃣ Recordatorios de GitHub Secrets..."
echo ""
echo "Asegúrate de tener configurados estos secrets en GitHub:"
echo "   📌 DOCKERHUB_TOKEN"
echo "   📌 VITE_API_URL"
echo "   📌 SERVER_HOST"
echo "   📌 SERVER_USER"
echo "   📌 SERVER_SSH_KEY"
echo ""
echo "Ver detalles en: SECRETS_SETUP.md"
echo ""

# =============================================================================
# RESUMEN FINAL
# =============================================================================
echo "================================================"
echo "          RESUMEN DE VERIFICACIÓN               "
echo "================================================"
echo -e "${GREEN}✅ Exitosos:   $SUCCESS${NC}"
echo -e "${YELLOW}⚠️  Advertencias: $WARNINGS${NC}"
echo -e "${RED}❌ Errores:    $ERRORS${NC}"
echo "================================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todo listo para el deployment!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "  1. Configura los GitHub Secrets (ver SECRETS_SETUP.md)"
    echo "  2. Haz push a main: git push origin main"
    echo "  3. Observa el progreso en GitHub Actions"
    echo ""
    exit 0
else
    echo -e "${RED}⚠️  Hay errores que deben corregirse antes del deployment${NC}"
    echo ""
    echo "Revisa los errores arriba y corrígelos antes de continuar"
    echo ""
    exit 1
fi
