#!/bin/bash
# Script para configurar HTTPS con IP (requiere dominio o DuckDNS)

echo "🔒 Configurando HTTPS con IP..."

# Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    apt update
    apt install -y nginx
fi

# Obtener IP del servidor
SERVER_IP=$(curl -s ifconfig.me)

echo "🖥️  IP del servidor: $SERVER_IP"
echo ""
echo "⚠️  Para usar HTTPS necesitas un dominio."
echo "💡 Opciones:"
echo "   1. Usar DuckDNS (gratis): https://www.duckdns.org/"
echo "   2. Comprar un dominio (Namecheap, GoDaddy, etc.)"
echo "   3. Usar un subdominio gratuito (Freenom, etc.)"
echo ""
echo "📝 Si ya tienes un dominio, ejecuta:"
echo "   bash configurar-https.sh tu-dominio.com"
echo ""
echo "🔄 Por ahora, configurando Nginx para HTTP (sin SSL)..."
echo "   La cámara funcionará en localhost o con permisos especiales del navegador."

# Crear configuración de Nginx para HTTP (sin SSL)
cat > /etc/nginx/sites-available/rhm-app <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP _;

    # Tamaño máximo de archivo
    client_max_body_size 10M;

    # Proxy a la aplicación Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Habilitar el sitio
echo "🔗 Habilitando sitio en Nginx..."
ln -sf /etc/nginx/sites-available/rhm-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Error en la configuración de Nginx."
    exit 1
fi

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx

# Configurar firewall
echo "🔥 Configurando firewall..."
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "✅ Nginx configurado (HTTP)"
echo "🌐 Accede a: http://$SERVER_IP"
echo ""
echo "⚠️  Para habilitar HTTPS, necesitas un dominio."
echo "   Cuando tengas un dominio, ejecuta: bash configurar-https.sh tu-dominio.com"

