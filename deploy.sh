#!/bin/bash

################################################################################
# Script de Deployment Manual para PTrello
# Ubicación: /opt/ptrello/deploy.sh
# Uso: ./deploy.sh
################################################################################

set -e  # Detener si hay error

echo "🚀 PTrello - Deployment Manual a Producción"
echo "================================================"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: No se encuentra docker-compose.prod.yml"
    echo "Asegúrate de estar en el directorio /opt/ptrello"
    exit 1
fi

# Verificar que existe archivo de variables de entorno
if [ ! -f ".env.production" ]; then
    echo "❌ Error: No existe el archivo .env.production"
    echo "Crea el archivo .env.production con las variables necesarias"
    exit 1
fi

# Mostrar imágenes actuales
echo "📦 Imágenes actuales en el servidor:"
docker images | grep -E "molinacont18/ptrello|REPOSITORY" || echo "No hay imágenes de PTrello"
echo ""

# Descargar últimas imágenes desde Docker Hub
echo "📥 Descargando imágenes actualizadas desde Docker Hub..."
docker compose -f docker-compose.prod.yml pull

echo ""
echo "📦 Nuevas imágenes descargadas:"
docker images | grep -E "molinacont18/ptrello|REPOSITORY"
echo ""

# Detener contenedores actuales
echo "🛑 Deteniendo contenedores actuales..."
docker compose -f docker-compose.prod.yml down

# Crear backup de volúmenes (opcional pero recomendado)
echo ""
read -p "¿Deseas crear un backup de los datos antes de continuar? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    echo "💾 Creando backup en $BACKUP_DIR..."
    
    # Backup de uploads si existe el volumen
    if docker volume ls | grep -q "ptrello_uploads"; then
        docker run --rm \
            -v ptrello_uploads:/data \
            -v "$(pwd)/$BACKUP_DIR":/backup \
            alpine tar czf /backup/uploads.tar.gz -C /data .
        echo "✅ Backup de uploads creado"
    fi
    echo "✅ Backup completado en $BACKUP_DIR"
    echo ""
fi

# Iniciar contenedores con imágenes nuevas
echo "▶️  Iniciando contenedores actualizados..."
docker compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén listos
echo ""
echo "⏳ Esperando que los servicios inicien..."
sleep 10

# Mostrar estado de contenedores
echo ""
echo "📊 Estado de contenedores:"
docker compose -f docker-compose.prod.yml ps
echo ""

# Mostrar logs recientes
echo "📋 Últimos logs del backend:"
docker compose -f docker-compose.prod.yml logs --tail=30 backend
echo ""

echo "📋 Últimos logs del frontend:"
docker compose -f docker-compose.prod.yml logs --tail=30 frontend
echo ""

# Limpiar imágenes antiguas
echo "🧹 ¿Deseas limpiar imágenes antiguas y liberar espacio? (y/n): "
read -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Limpiando imágenes antiguas..."
    docker image prune -af
    docker volume prune -f
    echo "✅ Limpieza completada"
fi

echo ""
echo "================================================"
echo "✅ Deployment completado exitosamente!"
echo "================================================"
echo ""
echo "🌐 Aplicación disponible en:"
echo "   Frontend: http://$(hostname -I | awk '{print $1}')"
echo "   Backend:  http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "📊 Comandos útiles:"
echo "   Ver logs en vivo:    docker compose -f docker-compose.prod.yml logs -f"
echo "   Reiniciar servicio:  docker compose -f docker-compose.prod.yml restart [backend|frontend]"
echo "   Detener todo:        docker compose -f docker-compose.prod.yml down"
echo "   Ver estado:          docker compose -f docker-compose.prod.yml ps"
echo ""
echo "================================================"
