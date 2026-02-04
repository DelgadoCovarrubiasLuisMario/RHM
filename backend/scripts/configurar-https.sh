#!/bin/bash
# Script para configurar HTTPS con Let's Encrypt y Nginx

echo "🔒 Configurando HTTPS..."

# Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    apt update
    apt install -y nginx
fi

# Instalar Certbot si no está instalado
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# Verificar si ya existe un dominio configurado
DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
    echo "⚠️  No se proporcionó un dominio."
    echo "📝 Uso: bash configurar-https.sh tu-dominio.com"
    echo ""
    echo "💡 Si no tienes dominio, puedes usar la IP del servidor, pero necesitarás:"
    echo "   1. Configurar un dominio apuntando a la IP"
    echo "   2. O usar un servicio como DuckDNS para obtener un dominio gratuito"
    exit 1
fi

# Obtener IP del servidor
SERVER_IP=$(curl -s ifconfig.me)

echo "🌐 Dominio: $DOMAIN"
echo "🖥️  IP del servidor: $SERVER_IP"
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de que el dominio $DOMAIN apunte a $SERVER_IP"
echo "   Puedes verificar con: nslookup $DOMAIN"
echo ""
read -p "¿El dominio ya apunta a esta IP? (s/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "❌ Configura primero el DNS y vuelve a ejecutar este script."
    exit 1
fi

# Crear configuración de Nginx
echo "📝 Creando configuración de Nginx..."
cat > /etc/nginx/sites-available/rhm-app <<EOF
# Redirección HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    # Para verificación de Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirigir todo lo demás a HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    # Certificados SSL (se generarán con Certbot)
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Configuración SSL recomendada
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

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

# Verificar configuración de Nginx
echo "✅ Verificando configuración de Nginx..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Error en la configuración de Nginx. Revisa los logs."
    exit 1
fi

# Reiniciar Nginx
echo "🔄 Reiniciando Nginx..."
systemctl restart nginx
systemctl enable nginx

# Obtener certificado SSL
echo "🔐 Obteniendo certificado SSL de Let's Encrypt..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ HTTPS configurado exitosamente!"
    echo "🌐 Accede a: https://$DOMAIN"
    echo ""
    echo "🔄 Configurando renovación automática..."
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    echo ""
    echo "✅ Todo listo! El certificado se renovará automáticamente."
else
    echo "❌ Error al obtener el certificado SSL."
    echo "💡 Verifica que:"
    echo "   1. El dominio apunta correctamente a esta IP"
    echo "   2. Los puertos 80 y 443 están abiertos en el firewall"
    exit 1
fi

