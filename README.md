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

## Despliegue en Railway (Gratis - Siempre Disponible)

Railway ofrece hosting gratuito para que tu app esté siempre disponible sin pagos mensuales.

### Pasos para desplegar:

1. **Crear cuenta en Railway:**
   - Ve a https://railway.app
   - Regístrate con GitHub (gratis)

2. **Conectar tu proyecto:**
   - Haz clic en "New Project"
   - Selecciona "Deploy from GitHub repo"
   - Conecta tu repositorio de GitHub (si no tienes uno, créalo primero)

3. **Configurar el proyecto:**
   - Railway detectará automáticamente que es un proyecto Node.js
   - El archivo `railway.json` ya está configurado
   - Railway iniciará el despliegue automáticamente

4. **Obtener tu URL:**
   - Una vez desplegado, Railway te dará una URL única
   - Ejemplo: `https://apprhr-production.up.railway.app`
   - Esta URL estará siempre disponible

5. **Actualizar el frontend:**
   - Después del despliegue, actualiza las URLs en los archivos JavaScript del frontend
   - Cambia `http://localhost:3000` por tu URL de Railway

### Alternativa: Render (También Gratis)

Si prefieres Render:
1. Ve a https://render.com
2. Crea una cuenta gratuita
3. Selecciona "New Web Service"
4. Conecta tu repositorio de GitHub
5. Configuración:
   - Build Command: (dejar vacío)
   - Start Command: `npm start`
   - Environment: Node

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
