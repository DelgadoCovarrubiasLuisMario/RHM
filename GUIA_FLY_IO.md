# 🚀 Guía de Despliegue en Fly.io - RHM

## 📋 Requisitos Previos

1. **Cuenta de GitHub** (ya tienes el código subido)
2. **Cuenta de Fly.io** (gratis)
3. **Node.js instalado** (para la CLI)

---

## 🔧 Paso 1: Crear Cuenta en Fly.io

1. Ve a https://fly.io
2. Haz clic en "Sign Up" o "Get Started"
3. Regístrate con GitHub (más fácil)
4. Confirma tu email

---

## 🔧 Paso 2: Instalar CLI de Fly.io

Abre PowerShell o Terminal y ejecuta:

```bash
# Instalar CLI globalmente
npm install -g @fly/cli

# O si usas winget (Windows)
winget install --id=Fly.Flyctl
```

Verifica la instalación:
```bash
fly version
```

---

## 🔧 Paso 3: Login en Fly.io

```bash
fly auth login
```

Esto abrirá tu navegador para autenticarte.

---

## 🔧 Paso 4: Desplegar la Aplicación

Desde la carpeta del proyecto (`C:\Users\Colibecas\Documents\apprhr`):

```bash
# Inicializar Fly.io en el proyecto
fly launch

# Te preguntará:
# - App name: rhm-app (o el que prefieras)
# - Region: iad (Washington DC) o el más cercano
# - PostgreSQL: No (estamos usando SQLite)
# - Redis: No
```

**O si prefieres usar la configuración ya creada:**

```bash
# Solo hacer deploy
fly deploy
```

---

## 🔧 Paso 5: Configurar Variables (Si es necesario)

Por ahora no necesitas variables de entorno, pero si en el futuro necesitas:

```bash
fly secrets set VARIABLE_NAME=valor
```

---

## 🔧 Paso 6: Obtener tu URL

Después del despliegue, Fly.io te dará una URL:

```
https://rhm-app.fly.dev
```

Esta URL estará **siempre disponible** y es **gratis permanente**.

---

## 🔧 Paso 7: Verificar el Despliegue

1. Abre la URL en tu navegador
2. Deberías ver la pantalla de login de RHM
3. Prueba login con:
   - Usuario: `admin`
   - Contraseña: `admin123`

---

## 🔄 Actualizar la Aplicación

Cada vez que hagas cambios:

```bash
# Hacer commit en git
git add .
git commit -m "Descripción de cambios"
git push

# Desplegar en Fly.io
fly deploy
```

---

## 📊 Ver Logs

Para ver los logs de la aplicación:

```bash
fly logs
```

---

## 🛠️ Comandos Útiles

```bash
# Ver estado de la app
fly status

# Ver información de la app
fly info

# Abrir la app en el navegador
fly open

# Ver métricas
fly metrics

# Reiniciar la app
fly apps restart rhm-app
```

---

## ⚠️ Solución de Problemas

### Error: "No app name specified"
```bash
fly launch
```

### Error: "Database not found"
- La base de datos SQLite se crea automáticamente
- Verifica que el directorio `database/` exista

### La app no carga
```bash
# Ver logs
fly logs

# Verificar estado
fly status
```

### Error de memoria
- El plan gratuito incluye 256MB (suficiente para tu app)
- Si necesitas más, puedes aumentar en `fly.toml`

---

## 💰 Costos

**Plan Gratuito (Hobby):**
- ✅ 3 apps gratis
- ✅ 3 GB almacenamiento
- ✅ 160 GB transferencia/mes
- ✅ Siempre disponible
- ✅ **GRATIS PERMANENTE**

**Tu aplicación usa:**
- ~50MB de almacenamiento (código + base de datos)
- ~1GB transferencia/mes (estimado)
- **Estás muy dentro de los límites gratuitos** ✅

---

## 🎯 Próximos Pasos

1. ✅ Crear cuenta en Fly.io
2. ✅ Instalar CLI
3. ✅ Hacer login
4. ✅ Ejecutar `fly launch` o `fly deploy`
5. ✅ Obtener URL
6. ✅ Compartir URL con empleados y admins

---

## 📞 Soporte

Si tienes problemas:
- Documentación: https://fly.io/docs
- Comunidad: https://community.fly.io
- Revisa logs: `fly logs`

---

**¡Listo para desplegar!** 🚀

