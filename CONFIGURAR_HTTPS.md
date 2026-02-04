# Configuración de HTTPS para RHM

## Opción 1: Con Dominio (Recomendado)

Si tienes un dominio (ej: `rhm.midominio.com`):

```bash
cd /root/RHM
chmod +x backend/scripts/configurar-https.sh
bash backend/scripts/configurar-https.sh tu-dominio.com
```

**Requisitos:**
- El dominio debe apuntar a la IP del servidor
- Verifica con: `nslookup tu-dominio.com`

## Opción 2: Sin Dominio (HTTP solamente)

Si no tienes dominio todavía:

```bash
cd /root/RHM
chmod +x backend/scripts/configurar-https-ip.sh
bash backend/scripts/configurar-https-ip.sh
```

Esto configurará Nginx pero sin SSL. La cámara puede no funcionar en algunos navegadores.

## Opción 3: Dominio Gratuito con DuckDNS

1. Ve a https://www.duckdns.org/
2. Crea una cuenta y un subdominio (ej: `rhm-app.duckdns.org`)
3. Configura la IP de tu servidor
4. Ejecuta:

```bash
cd /root/RHM
chmod +x backend/scripts/configurar-https.sh
bash backend/scripts/configurar-https.sh rhm-app.duckdns.org
```

## Verificar Configuración

```bash
# Ver estado de Nginx
systemctl status nginx

# Ver logs de Nginx
tail -f /var/log/nginx/error.log

# Verificar certificado SSL
certbot certificates

# Probar renovación manual
certbot renew --dry-run
```

## Acceder a la Aplicación

- **Con HTTPS:** `https://tu-dominio.com`
- **Con IP (HTTP):** `http://IP_DEL_SERVIDOR`

## Notas

- Los certificados SSL se renuevan automáticamente
- Nginx redirige HTTP a HTTPS automáticamente
- La aplicación Node.js sigue corriendo en el puerto 3000
- Nginx actúa como proxy reverso

