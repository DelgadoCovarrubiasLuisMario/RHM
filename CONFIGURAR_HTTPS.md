# 🔒 Guía para Configurar HTTPS en DigitalOcean

Esta guía te ayudará a configurar HTTPS de manera sencilla en tu servidor DigitalOcean.

## 📋 Requisitos Previos

- Servidor DigitalOcean funcionando
- Acceso SSH al servidor (o usar la Recovery Console)
- Node.js y la aplicación corriendo

## 🚀 Opción 1: Con Dominio (Recomendado para Producción)

### Paso 1: Configurar DNS

1. Ve a tu proveedor de DNS (donde compraste el dominio)
2. Crea un registro **A** apuntando a la IP de tu servidor:
   ```
   Tipo: A
   Nombre: rhm (o el subdominio que quieras)
   Valor: 167.172.201.83 (tu IP)
   TTL: 3600
   ```
3. Espera 5-10 minutos a que se propague el DNS

### Paso 2: Ejecutar Script de Configuración

En el servidor (por Recovery Console o SSH):

```bash
cd /root/RHM
chmod +x backend/scripts/configurar-https.sh
./backend/scripts/configurar-https.sh
```

El script te preguntará:
- Si tienes dominio → Ingresa tu dominio (ej: `rhm.tudominio.com`)
- Si ya configuraste el DNS → Responde `s`

### Paso 3: ¡Listo!

Accede a tu aplicación en: `https://rhm.tudominio.com`

---

## 🚀 Opción 2: Sin Dominio (Solo para Pruebas)

Si no tienes dominio, puedes usar un certificado autofirmado:

### Ejecutar Script

```bash
cd /root/RHM
chmod +x backend/scripts/configurar-https.sh
./backend/scripts/configurar-https.sh
```

Cuando pregunte si tienes dominio, responde: `n`

### ⚠️ Importante

- Los navegadores mostrarán una **advertencia de seguridad**
- Para acceder:
  1. Haz clic en **"Avanzado"** o **"Advanced"**
  2. Haz clic en **"Continuar al sitio"** o **"Proceed to site"**
- Esto es solo para desarrollo/pruebas
- Para producción, usa un dominio real

### Acceder

Accede a: `https://167.172.201.83` (tu IP)

---

## 🔧 Configuración Manual (Si el script falla)

### 1. Instalar Nginx y Certbot

```bash
apt update
apt install -y nginx certbot python3-certbot-nginx
```

### 2. Crear Configuración de Nginx

```bash
nano /etc/nginx/sites-available/rhm
```

Pega esta configuración (reemplaza `TU_DOMINIO` o `TU_IP`):

```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name TU_DOMINIO_O_IP;
    
    # Si usas dominio, Certbot agregará estas líneas:
    # ssl_certificate /etc/letsencrypt/live/TU_DOMINIO/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/TU_DOMINIO/privkey.pem;
    
    # Si NO usas dominio, descomenta estas líneas:
    # ssl_certificate /etc/nginx/ssl/rhm.crt;
    # ssl_certificate_key /etc/nginx/ssl/rhm.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Habilitar Sitio

```bash
ln -sf /etc/nginx/sites-available/rhm /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

### 4. Obtener Certificado (Solo si usas dominio)

```bash
certbot --nginx -d TU_DOMINIO --non-interactive --agree-tos --email tu@email.com --redirect
```

---

## ✅ Verificar que Funciona

1. Abre tu navegador
2. Ve a `https://tu-dominio-o-ip`
3. Deberías ver el login de RHM
4. El escáner QR debería funcionar sin problemas

---

## 🔄 Renovar Certificado (Let's Encrypt)

Los certificados de Let's Encrypt expiran cada 90 días. Para renovar automáticamente:

```bash
certbot renew --dry-run  # Prueba
certbot renew            # Renovar
```

O agregar a cron para renovación automática:

```bash
crontab -e
```

Agrega esta línea:

```
0 3 * * * certbot renew --quiet && systemctl reload nginx
```

---

## 🐛 Solución de Problemas

### Error: "Connection refused"
- Verifica que Nginx esté corriendo: `systemctl status nginx`
- Verifica que Node.js esté corriendo: `pm2 status`

### Error: "SSL certificate problem"
- Si usas certificado autofirmado, acepta la advertencia del navegador
- Si usas Let's Encrypt, verifica que el DNS esté configurado correctamente

### Error: "502 Bad Gateway"
- Verifica que la app Node.js esté corriendo en el puerto 3000
- Revisa los logs: `pm2 logs rhm-app`

### El escáner QR sigue sin funcionar
- Asegúrate de acceder por HTTPS (no HTTP)
- Verifica los permisos de cámara en el navegador
- Prueba en otro navegador o dispositivo

---

## 📞 Soporte

Si tienes problemas, revisa los logs:

```bash
# Logs de Nginx
tail -f /var/log/nginx/rhm-error.log

# Logs de la aplicación
pm2 logs rhm-app

# Estado de servicios
systemctl status nginx
pm2 status
```

