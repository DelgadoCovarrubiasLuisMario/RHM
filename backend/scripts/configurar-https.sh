#!/bin/bash
# Script para configurar HTTPS en DigitalOcean con Nginx y Let's Encrypt

echo "🔒 Configurando HTTPS para RHM..."

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

# Obtener IP del servidor
SERVER_IP=$(curl -s ifconfig.me)

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  CONFIGURACIÓN DE HTTPS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Para usar HTTPS con Let's Encrypt, necesitas un dominio."
echo ""
echo "Opciones:"
echo "1. Si tienes un dominio (ej: rhm.tudominio.com)"
echo "2. Si NO tienes dominio (usaremos certificado autofirmado)"
echo ""
read -p "¿Tienes un dominio configurado? (s/n): " tiene_dominio

if [ "$tiene_dominio" = "s" ] || [ "$tiene_dominio" = "S" ]; then
    echo ""
    read -p "Ingresa tu dominio (ej: rhm.tudominio.com): " DOMINIO
    
    if [ -z "$DOMINIO" ]; then
        echo "❌ Dominio no válido"
        exit 1
    fi
    
    echo ""
    echo "⚠️  IMPORTANTE: Asegúrate de que tu dominio apunte a esta IP: $SERVER_IP"
    echo "   Configura un registro A en tu DNS apuntando a: $SERVER_IP"
    echo ""
    read -p "¿Ya configuraste el DNS? (s/n): " dns_configurado
    
    if [ "$dns_configurado" != "s" ] && [ "$dns_configurado" != "S" ]; then
        echo "❌ Configura el DNS primero y vuelve a ejecutar este script"
        exit 1
    fi
    
    # Crear configuración de Nginx con dominio
    cat > /etc/nginx/sites-available/rhm << EOF
server {
    listen 80;
    server_name $DOMINIO;
    
    # Redirigir HTTP a HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMINIO;
    
    # Configuración SSL (se completará con Certbot)
    
    # Logs
    access_log /var/log/nginx/rhm-access.log;
    error_log /var/log/nginx/rhm-error.log;
    
    # Tamaño máximo de archivos
    client_max_body_size 10M;
    
    # Proxy a Node.js
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
    
    # Habilitar sitio
    ln -sf /etc/nginx/sites-available/rhm /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Probar configuración de Nginx
    nginx -t
    
    if [ $? -ne 0 ]; then
        echo "❌ Error en la configuración de Nginx"
        exit 1
    fi
    
    # Reiniciar Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    # Obtener certificado SSL con Certbot
    echo ""
    echo "🔐 Obteniendo certificado SSL de Let's Encrypt..."
    certbot --nginx -d $DOMINIO --non-interactive --agree-tos --email admin@$DOMINIO --redirect
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ HTTPS configurado exitosamente!"
        echo "🌐 Accede a: https://$DOMINIO"
    else
        echo ""
        echo "❌ Error al obtener certificado SSL"
        echo "Verifica que:"
        echo "1. El dominio apunta correctamente a $SERVER_IP"
        echo "2. El puerto 80 está abierto en el firewall"
        exit 1
    fi
    
else
    # Configuración sin dominio (certificado autofirmado)
    echo ""
    echo "📝 Configurando con certificado autofirmado (solo para desarrollo/pruebas)..."
    echo "⚠️  Los navegadores mostrarán una advertencia de seguridad"
    echo ""
    
    # Crear directorio para certificados
    mkdir -p /etc/nginx/ssl
    
    # Generar certificado autofirmado
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/rhm.key \
        -out /etc/nginx/ssl/rhm.crt \
        -subj "/C=MX/ST=Estado/L=Ciudad/O=RHM/CN=$SERVER_IP"
    
    # Crear configuración de Nginx con IP (usar _ para aceptar cualquier hostname)
    cat > /etc/nginx/sites-available/rhm << EOF
server {
    listen 80;
    server_name $SERVER_IP _;
    
    # Redirigir HTTP a HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $SERVER_IP _;
    
    # Certificados SSL autofirmados
    ssl_certificate /etc/nginx/ssl/rhm.crt;
    ssl_certificate_key /etc/nginx/ssl/rhm.key;
    
    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Logs
    access_log /var/log/nginx/rhm-access.log;
    error_log /var/log/nginx/rhm-error.log;
    
    # Tamaño máximo de archivos
    client_max_body_size 10M;
    
    # Proxy a Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
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
    
    # Habilitar sitio
    ln -sf /etc/nginx/sites-available/rhm /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Probar configuración de Nginx
    nginx -t
    
    if [ $? -ne 0 ]; then
        echo "❌ Error en la configuración de Nginx"
        exit 1
    fi
    
    # Reiniciar Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    # Configurar firewall
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    echo ""
    echo "✅ HTTPS configurado (certificado autofirmado)"
    echo "🌐 Accede a: https://$SERVER_IP"
    echo ""
    echo "⚠️  IMPORTANTE:"
    echo "   - Los navegadores mostrarán una advertencia de seguridad"
    echo "   - Haz clic en 'Avanzado' y luego 'Continuar' para acceder"
    echo "   - Para producción, usa un dominio real con Let's Encrypt"
fi

echo ""
echo "✅ Configuración completada!"
echo ""
echo "📋 Comandos útiles:"
echo "   - Ver estado de Nginx: systemctl status nginx"
echo "   - Ver logs de Nginx: tail -f /var/log/nginx/rhm-error.log"
echo "   - Reiniciar Nginx: systemctl restart nginx"
echo "   - Renovar certificado (si usas Let's Encrypt): certbot renew"

