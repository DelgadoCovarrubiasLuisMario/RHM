#!/bin/bash
# Configurar HTTPS sin dominio (usando la IP directamente)
# NOTA: Let's Encrypt requiere un dominio, pero podemos usar un túnel

echo "🔒 Opciones para HTTPS sin dominio:"
echo ""
echo "Opción 1: Usar Cloudflare Tunnel (Gratis)"
echo "  1. Crear cuenta en Cloudflare"
echo "  2. Instalar cloudflared"
echo "  3. Crear túnel"
echo ""
echo "Opción 2: Usar ngrok (Gratis con limitaciones)"
echo "  1. Crear cuenta en ngrok.com"
echo "  2. Descargar ngrok"
echo "  3. Ejecutar: ngrok http 3000"
echo ""
echo "Opción 3: Comprar dominio barato (~$10/año)"
echo "  - Namecheap, GoDaddy, etc."
echo "  - Luego usar Let's Encrypt"
echo ""
echo "¿Cuál prefieres?"

