#!/bin/bash
# Script rápido para arreglar el servidor

echo "🔧 Diagnosticando y arreglando servidor..."
echo ""

# 1. Verificar si la app está corriendo
echo "1️⃣ Verificando aplicación Node.js..."
if pm2 list | grep -q "rhm-app.*online"; then
    echo "   ✅ Aplicación está corriendo"
    pm2 list | grep rhm-app
else
    echo "   ❌ Aplicación NO está corriendo"
    echo "   Iniciando aplicación..."
    cd /root/RHM
    pm2 start backend/server.js --name rhm-app || pm2 restart rhm-app
    sleep 3
    if pm2 list | grep -q "rhm-app.*online"; then
        echo "   ✅ Aplicación iniciada"
    else
        echo "   ❌ Error al iniciar. Revisando logs..."
        pm2 logs rhm-app --lines 20 --nostream
        exit 1
    fi
fi
echo ""

# 2. Verificar puerto 3000
echo "2️⃣ Verificando puerto 3000..."
if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "   ✅ Puerto 3000 está en uso"
else
    echo "   ❌ Puerto 3000 NO está en uso"
    echo "   Reiniciando aplicación..."
    pm2 restart rhm-app
    sleep 3
fi
echo ""

# 3. Probar conexión local
echo "3️⃣ Probando conexión local..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo "   ✅ Node.js responde correctamente (código: $HTTP_CODE)"
else
    echo "   ❌ Node.js NO responde (código: $HTTP_CODE)"
    echo "   Revisando logs de error..."
    pm2 logs rhm-app --lines 30 --nostream | tail -20
    echo ""
    echo "   Intentando reiniciar..."
    pm2 restart rhm-app
    sleep 3
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
    sleep 2
fi

# Verificar configuración
if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Configuración de Nginx válida"
else
    echo "   ❌ Error en configuración de Nginx:"
    nginx -t
fi
echo ""

# 5. Reiniciar servicios
echo "5️⃣ Reiniciando servicios..."
pm2 restart rhm-app
sleep 2
systemctl restart nginx
sleep 2
echo "   ✅ Servicios reiniciados"
echo ""

# 6. Verificación final
echo "6️⃣ Verificación final..."
echo "   Estado de PM2:"
pm2 list | grep rhm-app
echo ""
echo "   Estado de Nginx:"
systemctl status nginx --no-pager | head -5
echo ""
echo "   Prueba de conexión:"
curl -s -o /dev/null -w "   Código HTTP: %{http_code}\n" http://localhost:3000/ 2>/dev/null || echo "   ❌ No responde"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "  RESUMEN"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Si sigue el error 502, verifica:"
echo "  1. Que la app esté corriendo: pm2 status"
echo "  2. Que responda localmente: curl http://localhost:3000"
echo "  3. Los logs: pm2 logs rhm-app"
echo "  4. La configuración de Nginx: nginx -t"
echo ""
echo "Si hay errores en los logs, compártelos para revisar."
echo ""

