# RHM - Sistema de Recursos Humanos

Sistema web para gestión de recursos humanos con registro de asistencia por código QR.
**RHM - Operación para tu empresa**

## Características

- Panel de administración
- Vista de empleado para tablets
- Registro de asistencia con QR
- Cálculo de horas y sueldos
- Gestión de vacaciones y nómina
- Diseño responsive (funciona en cualquier pantalla)
- Sincronización en tiempo real entre dispositivos

## Instalación Local

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor:
```bash
npm start
```

3. Abrir en el navegador:
```
http://localhost:3000
```

## 🚀 Despliegue en DigitalOcean

El proyecto está listo para desplegar en DigitalOcean ($4/mes).

**Guía completa:** Ver `GUIA_DIGITALOCEAN.md`

**Despliegue rápido:**
```bash
# En el servidor DigitalOcean
curl -o deploy.sh https://raw.githubusercontent.com/DelgadoCovarrubiasLuisMario/RHM/main/deploy.sh
chmod +x deploy.sh
bash deploy.sh
```

## Despliegue en DigitalOcean ($4/mes)

DigitalOcean ofrece servidores VPS confiables y económicos.

### Pasos para desplegar:

1. **Crear cuenta en DigitalOcean:**
   - Ve a https://www.digitalocean.com
   - Regístrate y verifica tu email
   - Agrega método de pago

2. **Crear Droplet:**
   - Haz clic en "Create" → "Droplets"
   - Imagen: Ubuntu 22.04 (LTS)
   - Plan: Basic ($4/mes - 512 MB RAM, 1 CPU, 10 GB SSD)
   - Región: La más cercana a tu ubicación
   - Crear Droplet

3. **Conectar al servidor:**
   - Conecta por SSH: `ssh root@TU_IP_DROPLET`
   - O usa PuTTY en Windows

4. **Desplegar aplicación:**
   - Sigue la guía completa en `GUIA_DIGITALOCEAN.md`
   - O ejecuta el script: `bash deploy.sh`

5. **Acceder a la aplicación:**
   - URL: `http://TU_IP_DROPLET:3000`
   - O configura un dominio (opcional)

### Alternativa: Servidor Local (Gratis)

Si prefieres no pagar hosting:
- Instalar en una PC servidor de la empresa
- 100% Gratis
- Datos quedan en la empresa
- Ver `GUIA_SERVIDOR_LOCAL.md` (si existe)

## Estructura del Proyecto

```
apprhr/
├── frontend/          # Interfaz web (HTML/CSS/JS)
│   ├── admin/        # Panel de administración
│   ├── empleado/     # Vista de empleado (tablets)
│   ├── js/           # JavaScript
│   └── styles/       # CSS
├── backend/          # API Node.js
│   ├── routes/       # Rutas de la API
│   ├── database/     # Configuración de base de datos
│   └── server.js     # Servidor principal
└── database/         # SQLite (archivo .db)
```

## Credenciales por Defecto

- **Admin:** usuario=`admin`, password=`admin123`
- **Empleados:** Usar códigos QR generados

## Notas

- La base de datos SQLite se crea automáticamente
- Los datos se sincronizan entre todos los dispositivos
- Funciona offline en tablets (guarda localmente y sincroniza después)
