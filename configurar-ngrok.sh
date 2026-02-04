#!/bin/bash
# Configurar ngrok para HTTPS (más sencillo)

echo "🔒 Configurando ngrok para HTTPS..."

# Descargar ngrok
cd /root
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xzf ngrok-v3-stable-linux-amd64.tgz
mv ngrok /usr/local/bin/
chmod +x /usr/local/bin/ngrok

echo "✅ ngrok instalado"
echo ""
echo "📋 Siguiente paso:"
echo "1. Ve a https://ngrok.com y crea cuenta gratuita"
echo "2. Obtén tu authtoken"
echo "3. Ejecuta: ngrok config add-authtoken TU_AUTHTOKEN"
echo "4. Ejecuta: ngrok http 3000"
echo ""
echo "ngrok te dará una URL HTTPS como: https://abc123.ngrok-free.app"
echo "Usa esa URL para acceder a la aplicación"

