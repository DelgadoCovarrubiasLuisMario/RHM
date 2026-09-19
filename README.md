# RHM - Sistema de Recursos Humanos

Sistema web para gestión de recursos humanos con **registro de asistencia en tablet** (código o nombre del empleado + foto).
**RHM - Operación para tu empresa**

## Características

- Panel de administración (JWT)
- Vista de empleado / kiosk para tablets
- Registro de asistencia con foto obligatoria (entrada y salida)
- Cálculo de horas y sueldos (misma lógica de emparejamiento que checadas)
- Gestión de vacaciones y nómina
- Diseño responsive

**No incluye:** escaneo QR en el flujo de checada, modo offline ni sincronización en tiempo real entre dispositivos. Los datos viven en el servidor SQLite; las tablets solo envían checadas por HTTPS.

## Instalación local

1. Instalar dependencias:

```bash
npm install
```

2. Variables opcionales en desarrollo:

```bash
# Hora de checadas (por defecto America/Mexico_City en server.js)
export TZ=America/Mexico_City
# Token para tablets (opcional en dev; obligatorio en producción)
export KIOSK_TOKEN=dev-kiosk-secreto
```

3. Iniciar el servidor:

```bash
npm start
```

4. Abrir en el navegador: `http://localhost:3000`

5. Pruebas de jornada / nómina:

```bash
npm test
```

## Flujo kiosk (tablets)

1. Desplegar el servidor con **HTTPS** (por defecto `USE_HTTPS` activo). La cámara en Chrome **no funciona** con `http://IP` salvo localhost.
2. En el servidor, definir `KIOSK_TOKEN` (secreto largo aleatorio).
3. En cada tablet, configurar el mismo token:
   - **Despliegue:** `deploy.sh` genera `frontend/js/kiosk-token.local.js` desde `KIOSK_TOKEN` (gitignored).
   - **Manual:** copiar `frontend/js/kiosk-token.example.js` → `kiosk-token.local.js`, **o** `localStorage.setItem('rhm_kiosk_token', 'TU_TOKEN')`.
   - La página carga el archivo local de forma **opcional** (`kiosk-token-loader.js`); si falta token y el servidor lo exige, se muestra un aviso antes de checar.
4. Abrir `https://TU_IP:3000` → menú empleado → **Registro de asistencia**.
5. Las checadas usan **fecha y hora del servidor** (zona `America/Mexico_City`), no el reloj de la tablet.

Las peticiones a `POST /api/asistencia/registrar` deben enviar el header:

`X-Kiosk-Token: <mismo valor que KIOSK_TOKEN>`

## Despliegue (DigitalOcean / PM2)

Ver `deploy.sh`. Puntos críticos para asistencia:

- **Una sola instancia PM2** (`-i 1`): SQLite y locks en memoria no son seguros con varios procesos Node compitiendo por la misma base de datos.
- Definir en el entorno del proceso:

```bash
export KIOSK_TOKEN='genera-un-secreto-largo'
export NODE_ENV=production
export TZ=America/Mexico_City
pm2 start backend/server.js --name rhm-app -i 1
```

- Puertos: HTTPS `3000`, redirect HTTP `3080` (ver logs al arrancar).

## Estructura del proyecto

```
├── frontend/          # Interfaz web (HTML/CSS/JS)
│   ├── admin/         # Panel de administración
│   ├── empleado/      # Registro en tablet
│   └── js/
├── backend/           # API Node.js
│   ├── routes/
│   ├── lib/           # Lógica compartida (jornadas, kiosk)
│   └── server.js
└── database/          # SQLite (rhr.db)
```

## Credenciales por defecto

- **Admin:** usuario `admin`, contraseña `admin123` (cambiar en producción con `npm run set-admin-password`)

## Notas de operación

- Cierre automático de jornada a **9.5 h** sin salida manual; en el listado de admin aparece la etiqueta **Auto** (con el texto completo al pasar el cursor).
- Eliminar checadas en admin es **borrado permanente** (`DELETE`); si se elimina una ENTRADA con SALIDA emparejada (FIFO), se borran ambas en la misma transacción. Eliminar solo una SALIDA borra esa fila (la ENTRADA queda como jornada abierta).
- La base de datos SQLite se crea al iniciar el servidor.
