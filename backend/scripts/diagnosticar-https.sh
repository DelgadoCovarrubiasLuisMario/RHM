#!/bin/bash
# Script de diagnóstico para HTTPS

echo "🔍 Diagnóstico de HTTPS para RHM..."
echo ""

# 1. Verificar Nginx
echo "1️⃣ Verificando Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx está corriendo"
else
    echo "   ❌ Nginx NO está corriendo"
    echo "   Intentando iniciar..."
    systemctl start nginx
    sleep 2
    if systemctl is-active --quiet nginx; then
        echo "   ✅ Nginx iniciado"
    else
        echo "   ❌ Error al iniciar Nginx"
        systemctl status nginx --no-pager
    fi
fi
echo ""

# 2. Verificar configuración de Nginx
echo "2️⃣ Verificando configuración de Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Configuración de Nginx válida"
else
    echo "   ❌ Error en configuración de Nginx:"
    nginx -t
fi
echo ""

# 3. Verificar puertos
echo "3️⃣ Verificando puertos..."
if netstat -tuln | grep -q ":80 "; then
    echo "   ✅ Puerto 80 (HTTP) está abierto"
else
    echo "   ❌ Puerto 80 NO está abierto"
fi

if netstat -tuln | grep -q ":443 "; then
    echo "   ✅ Puerto 443 (HTTPS) está abierto"
else
    echo "   ❌ Puerto 443 NO está abierto"
fi
echo ""

# 4. Verificar firewall
echo "4️⃣ Verificando firewall..."
ufw_status=$(ufw status | grep "Status:")
echo "   $ufw_status"
if ufw status | grep -q "443/tcp"; then
    echo "   ✅ Puerto 443 permitido en firewall"
else
    echo "   ❌ Puerto 443 NO permitido en firewall"
    echo "   Agregando regla..."
    ufw allow 443/tcp
fi

if ufw status | grep -q "80/tcp"; then
    echo "   ✅ Puerto 80 permitido en firewall"
else
    echo "   ❌ Puerto 80 NO permitido en firewall"
    echo "   Agregando regla..."
    ufw allow 80/tcp
fi
echo ""

# 5. Verificar aplicación Node.js
echo "5️⃣ Verificando aplicación Node.js..."
if pm2 list | grep -q "rhm-app.*online"; then
    echo "   ✅ Aplicación Node.js está corriendo"
    pm2 list | grep rhm-app
else
    echo "   ❌ Aplicación Node.js NO está corriendo"
    echo "   Intentando iniciar..."
    cd /root/RHM
    pm2 start backend/server.js --name rhm-app || pm2 restart rhm-app
    sleep 2
    if pm2 list | grep -q "rhm-app.*online"; then
        echo "   ✅ Aplicación iniciada"
    else
        echo "   ❌ Error al iniciar aplicación"
    fi
fi
echo ""

# 6. Verificar certificados SSL
echo "6️⃣ Verificando certificados SSL..."
if [ -f "/etc/nginx/ssl/rhm.crt" ] && [ -f "/etc/nginx/ssl/rhm.key" ]; then
    echo "   ✅ Certificados SSL encontrados"
    ls -lh /etc/nginx/ssl/
else
    echo "   ❌ Certificados SSL NO encontrados"
    echo "   Generando certificados..."
    mkdir -p /etc/nginx/ssl
    SERVER_IP=$(curl -s ifconfig.me)
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/rhm.key \
        -out /etc/nginx/ssl/rhm.crt \
        -subj "/C=MX/ST=Estado/L=Ciudad/O=RHM/CN=$SERVER_IP"
    chmod 600 /etc/nginx/ssl/rhm.key
    chmod 644 /etc/nginx/ssl/rhm.crt
    echo "   ✅ Certificados generados"
fi
echo ""

# 7. Verificar configuración de sitio
echo "7️⃣ Verificando configuración del sitio..."
if [ -f "/etc/nginx/sites-available/rhm" ]; then
    echo "   ✅ Archivo de configuración existe"
    echo "   Contenido relevante:"
    grep -E "listen|server_name|proxy_pass" /etc/nginx/sites-available/rhm | head -10
else
    echo "   ❌ Archivo de configuración NO existe"
fi

if [ -L "/etc/nginx/sites-enabled/rhm" ]; then
    echo "   ✅ Sitio habilitado"
else
    echo "   ❌ Sitio NO habilitado"
    echo "   Habilitando..."
    ln -sf /etc/nginx/sites-available/rhm /etc/nginx/sites-enabled/
    systemctl reload nginx
fi
echo ""

# 8. Verificar logs recientes
echo "8️⃣ Últimos errores de Nginx:"
tail -5 /var/log/nginx/rhm-error.log 2>/dev/null || echo "   No hay archivo de log de errores"
echo ""

# 9. Probar conexión local
echo "9️⃣ Probando conexión local..."
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/ | grep -q "200\|301\|302"; then
    echo "   ✅ Nginx responde localmente"
else
    echo "   ❌ Nginx NO responde localmente"
    echo "   Código HTTP: $(curl -k -s -o /dev/null -w "%{http_code}" https://localhost/)"
fi
echo ""

# 10. Resumen y recomendaciones
echo "═══════════════════════════════════════════════════════════"
echo "  RESUMEN"
echo "═══════════════════════════════════════════════════════════"
echo ""

SERVER_IP=$(curl -s ifconfig.me)
echo "🌐 IP del servidor: $SERVER_IP"
echo ""
echo "Prueba acceder a:"
echo "   - HTTP:  http://$SERVER_IP"
echo "   - HTTPS: https://$SERVER_IP"
echo ""
echo "Si HTTPS no funciona, verifica:"
echo "   1. Que el firewall de DigitalOcean permita puertos 80 y 443"
echo "   2. Que Nginx esté corriendo: systemctl status nginx"
echo "   3. Que la app esté corriendo: pm2 status"
echo "   4. Los logs: tail -f /var/log/nginx/rhm-error.log"
echo ""

