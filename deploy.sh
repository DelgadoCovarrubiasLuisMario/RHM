#!/bin/bash
# Script de despliegue para DigitalOcean

echo "🚀 Iniciando despliegue de RHM..."

# Actualizar sistema
echo "📦 Actualizando sistema..."
apt update && apt upgrade -y

# Instalar Node.js si no está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Instalar PM2 si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# Instalar git si no está instalado
if ! command -v git &> /dev/null; then
    echo "📦 Instalando git..."
    apt install -y git
fi

# Clonar o actualizar proyecto
if [ -d "/root/RHM" ]; then
    echo "🔄 Actualizando proyecto..."
    cd /root/RHM
    git pull
else
    echo "📥 Clonando proyecto..."
    cd /root
    git clone https://github.com/DelgadoCovarrubiasLuisMario/RHM.git
    cd RHM
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install --production

# Crear directorio de base de datos si no existe
mkdir -p database

# Inicializar base de datos (crear admin si no existe)
echo "🔧 Inicializando base de datos..."
npm run init-db

# Configurar firewall (HTTPS cámara + redirect HTTP)
echo "🔥 Configurando firewall..."
ufw allow 3000/tcp
ufw allow 3080/tcp
ufw --force enable

# Token kiosk (tablets) — OBLIGATORIO en producción para POST /api/asistencia/registrar
if [ -z "$KIOSK_TOKEN" ]; then
    echo "⚠️  Define KIOSK_TOKEN antes del despliegue (ej. export KIOSK_TOKEN=\$(openssl rand -hex 24))"
    echo "    Sin esto, el registro de asistencia rechazará checadas en NODE_ENV=production."
else
    echo "🔑 Generando frontend/js/kiosk-token.local.js para tablets..."
    export KIOSK_TOKEN
    node -e "const fs=require('fs');const t=process.env.KIOSK_TOKEN||'';fs.writeFileSync('frontend/js/kiosk-token.local.js','window.__RHM_KIOSK_TOKEN__='+JSON.stringify(t)+';\\n');"
    echo "✅ Token kiosk escrito en frontend/js/kiosk-token.local.js (gitignored)"
fi

# Entorno de producción (asistencia: KIOSK_TOKEN obligatorio si NODE_ENV=production)
export NODE_ENV="${NODE_ENV:-production}"
export TZ="${TZ:-America/Mexico_City}"

# Iniciar o reiniciar aplicación con PM2
echo "🚀 Iniciando aplicación..."
if pm2 list | grep -q "rhm-app"; then
    pm2 restart rhm-app --update-env
else
    # USE_HTTPS=1 (default): tablets pueden usar cámara sin dominio
    # -i 1: SQLite + locks de asistencia requieren un solo proceso Node
    pm2 start backend/server.js --name rhm-app -i 1
    pm2 startup
    pm2 save
fi

PUBLIC_IP=$(curl -s ifconfig.me || echo "TU_IP")
echo "✅ Despliegue completado!"
echo "📊 Ver estado: pm2 status"
echo "📋 Ver logs: pm2 logs rhm-app"
echo "🌐 Abrir en tablets (cámara): https://${PUBLIC_IP}:3000"
echo "↪️  Si abres http://${PUBLIC_IP}:3080 te redirige a HTTPS"
echo "⚠️  En cada tablet: aceptar certificado autofirmado (Avanzado → Continuar)"

