#!/bin/bash
# Script rápido para diagnosticar error 502 Bad Gateway

echo "🔍 Diagnóstico de Error 502 Bad Gateway"
echo "========================================"
echo ""

# 1. Verificar si la app Node.js está corriendo
echo "1️⃣ Verificando aplicación Node.js..."
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
        echo "   Revisando logs..."
        pm2 logs rhm-app --lines 20 --nostream
    fi
fi
echo ""

# 2. Verificar puerto 3000
echo "2️⃣ Verificando puerto 3000..."
if netstat -tuln | grep -q ":3000 "; then
    echo "   ✅ Puerto 3000 está en uso"
    netstat -tuln | grep ":3000"
else
    echo "   ❌ Puerto 3000 NO está en uso"
    echo "   La aplicación no está escuchando en el puerto 3000"
fi
echo ""

# 3. Probar conexión local
echo "3️⃣ Probando conexión local a Node.js..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "   ✅ Node.js responde correctamente (código: $HTTP_CODE)"
else
    echo "   ❌ Node.js NO responde (código: $HTTP_CODE)"
fi
echo ""

# 4. Verificar Nginx
echo "4️⃣ Verificando Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx está corriendo"
else
    echo "   ❌ Nginx NO está corriendo"
    echo "   Iniciando Nginx..."
    systemctl start nginx
fi
echo ""

# 5. Verificar configuración de Nginx
echo "5️⃣ Verificando configuración de Nginx..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Configuración de Nginx válida"
else
    echo "   ❌ Error en configuración de Nginx:"
    nginx -t
fi
echo ""

# 6. Ver logs de Nginx
echo "6️⃣ Últimos errores de Nginx:"
tail -10 /var/log/nginx/error.log 2>/dev/null | tail -5
echo ""

# 7. Ver logs de la aplicación
echo "7️⃣ Últimos logs de la aplicación:"
pm2 logs rhm-app --lines 10 --nostream 2>/dev/null || echo "   No se pudieron obtener logs"
echo ""

# 8. Verificar configuración del proxy
echo "8️⃣ Verificando configuración del proxy en Nginx:"
if [ -f "/etc/nginx/sites-available/rhm" ]; then
    echo "   Configuración encontrada:"
    grep -E "proxy_pass|listen|server_name" /etc/nginx/sites-available/rhm | head -5
else
    echo "   ❌ Archivo de configuración no encontrado"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  SOLUCIÓN RÁPIDA"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Si la aplicación no está corriendo, ejecuta:"
echo "  cd /root/RHM"
echo "  pm2 restart rhm-app"
echo ""
echo "Si Nginx tiene errores, ejecuta:"
echo "  systemctl restart nginx"
echo ""
echo "Si todo está bien pero sigue el error, verifica:"
echo "  - Que la app esté en el puerto 3000"
echo "  - Que el proxy_pass en Nginx apunte a http://localhost:3000"
echo ""

