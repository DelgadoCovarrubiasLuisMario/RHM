#!/bin/bash
# Script para configurar HTTPS de forma sencilla

echo "🔒 Configurando HTTPS..."

# Instalar Certbot
apt update
apt install -y certbot

# Instalar Nginx (para proxy reverso)
apt install -y nginx

echo "✅ Certbot y Nginx instalados"
echo ""
echo "📋 Siguiente paso:"
echo "1. Configura un dominio apuntando a tu IP: 167.172.201.83"
echo "2. Ejecuta: certbot --nginx -d tu-dominio.com"
echo ""
echo "O si no tienes dominio, puedes usar:"
echo "certbot certonly --standalone -d tu-dominio.com"

