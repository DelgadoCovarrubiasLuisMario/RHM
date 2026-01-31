# 🚀 Guía de Despliegue en DigitalOcean - RHM

## 📋 Requisitos Previos

1. **Cuenta de GitHub** (ya tienes el código subido)
2. **Cuenta de DigitalOcean** (crear en https://www.digitalocean.com)
3. **Tarjeta de crédito** (para crear cuenta, pero solo se cobra lo que uses)

---

## 🔧 Paso 1: Crear Cuenta en DigitalOcean

1. Ve a https://www.digitalocean.com
2. Haz clic en "Sign Up"
3. Completa el registro
4. Verifica tu email
5. Agrega método de pago (tarjeta de crédito)

**Nota:** DigitalOcean te da $200 de crédito gratis por 60 días para nuevos usuarios.

---

## 🔧 Paso 2: Crear Droplet (Servidor)

1. **Iniciar sesión** en DigitalOcean
2. **Haz clic en "Create"** → **"Droplets"**
3. **Configurar:**

   **Imagen:**
   - Selecciona **Ubuntu 22.04 (LTS)**

   **Plan:**
   - Selecciona **Basic**
   - **Regular Intel** → **$4/mes** (512 MB RAM, 1 CPU, 10 GB SSD)

   **Región:**
   - Selecciona la más cercana a México (ej: **New York** o **San Francisco**)

   **Autenticación:**
   - Selecciona **SSH keys** (recomendado) o **Password**
   - Si usas SSH keys, agrega tu clave pública
   - Si usas Password, crea una contraseña segura

   **Nombre del Droplet:**
   - `rhm-app` o el que prefieras

4. **Haz clic en "Create Droplet"**
5. **Espera 1-2 minutos** mientras se crea

---

## 🔧 Paso 3: Conectar al Servidor

### Opción A: Desde Windows (PowerShell)

1. **Abrir PowerShell**
2. **Conectar por SSH:**
   ```powershell
   ssh root@TU_IP_DROPLET
   ```
   (Reemplaza `TU_IP_DROPLET` con la IP que te dio DigitalOcean)

3. **Si es primera vez**, acepta la conexión (escribe `yes`)
4. **Ingresa la contraseña** (si usaste password)

### Opción B: Usar PuTTY (Windows)

1. Descargar PuTTY: https://www.putty.org
2. Abrir PuTTY
3. Host Name: `root@TU_IP_DROPLET`
4. Port: `22`
5. Connection type: `SSH`
6. Click "Open"
7. Ingresa contraseña

---

## 🔧 Paso 4: Instalar Node.js en el Servidor

Una vez conectado al servidor, ejecuta:

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

Deberías ver algo como: `v18.x.x` y `9.x.x`

---

## 🔧 Paso 5: Instalar PM2 (Para mantener servidor activo)

```bash
npm install -g pm2
```

PM2 mantendrá tu aplicación corriendo siempre, incluso si se reinicia el servidor.

---

## 🔧 Paso 6: Clonar el Proyecto

```bash
# Instalar git (si no está)
apt install -y git

# Clonar proyecto
cd /root
git clone https://github.com/DelgadoCovarrubiasLuisMario/RHM.git
cd RHM

# Instalar dependencias
npm install
```

---

## 🔧 Paso 7: Configurar Firewall

```bash
# Permitir puerto 3000
ufw allow 3000/tcp

# Habilitar firewall
ufw enable
```

---

## 🔧 Paso 8: Iniciar la Aplicación con PM2

```bash
# Iniciar aplicación
pm2 start backend/server.js --name rhm-app

# Configurar para que inicie automáticamente al reiniciar
pm2 startup
pm2 save

# Ver estado
pm2 status

# Ver logs
pm2 logs rhm-app
```

---

## 🔧 Paso 9: Configurar Nginx (Opcional - Para dominio)

Si quieres usar un dominio (ej: rhm-app.com):

```bash
# Instalar Nginx
apt install -y nginx

# Configurar
nano /etc/nginx/sites-available/rhm-app
```

Pegar esta configuración:
```nginx
server {
    listen 80;
    server_name TU_DOMINIO_O_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar configuración
ln -s /etc/nginx/sites-available/rhm-app /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## 🔧 Paso 10: Obtener tu URL

### Opción A: Usar IP directamente
```
http://TU_IP_DROPLET:3000
```

### Opción B: Configurar dominio (si tienes)
1. Comprar dominio (ej: en Namecheap, GoDaddy)
2. Configurar DNS:
   - Tipo: A
   - Host: @
   - Value: IP del Droplet
3. Acceder: `http://tu-dominio.com`

---

## ✅ Verificar que Funciona

1. **Abrir navegador**
2. **Ir a:** `http://TU_IP:3000`
3. **Deberías ver:** Login de RHM
4. **Probar:**
   - Usuario: `admin`
   - Contraseña: `admin123`

---

## 🔄 Actualizar la Aplicación

Cuando hagas cambios:

```bash
# Conectar al servidor
ssh root@TU_IP

# Ir al proyecto
cd /root/RHM

# Actualizar código
git pull

# Reinstalar dependencias (si hay cambios)
npm install

# Reiniciar aplicación
pm2 restart rhm-app

# Ver logs
pm2 logs rhm-app
```

---

## 📊 Comandos Útiles de PM2

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs rhm-app

# Reiniciar
pm2 restart rhm-app

# Detener
pm2 stop rhm-app

# Eliminar
pm2 delete rhm-app

# Monitoreo
pm2 monit
```

---

## 💰 Costos

- **Droplet:** $4 USD/mes (~$80 MXN/mes)
- **Dominio (opcional):** ~$10-15 USD/año
- **Total:** ~$4-5 USD/mes

---

## 🆘 Solución de Problemas

### No puedo conectar por SSH
- Verifica la IP del Droplet
- Verifica que el firewall permita SSH (puerto 22)
- Verifica tu contraseña/clave SSH

### La aplicación no carga
```bash
# Ver logs
pm2 logs rhm-app

# Verificar que esté corriendo
pm2 status

# Verificar puerto
netstat -tulpn | grep 3000
```

### Error de permisos
```bash
# Dar permisos
chmod -R 755 /root/RHM
```

---

## 📋 Checklist

- [ ] Cuenta de DigitalOcean creada
- [ ] Droplet creado ($4/mes)
- [ ] Conectado por SSH
- [ ] Node.js instalado
- [ ] PM2 instalado
- [ ] Proyecto clonado
- [ ] Dependencias instaladas
- [ ] Aplicación corriendo con PM2
- [ ] Firewall configurado
- [ ] Acceso desde navegador funciona

---

## 🎯 Resumen

1. **Crear Droplet** en DigitalOcean ($4/mes)
2. **Conectar por SSH**
3. **Instalar Node.js y PM2**
4. **Clonar proyecto** desde GitHub
5. **Iniciar con PM2**
6. **Acceder desde:** `http://TU_IP:3000`

**¡Listo!** Tu aplicación estará disponible 24/7. 🚀

---

**¿Necesitas ayuda con algún paso específico?**

