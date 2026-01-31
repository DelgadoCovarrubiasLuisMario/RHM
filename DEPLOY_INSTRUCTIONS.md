# 🚀 Instrucciones de Despliegue - DigitalOcean

## ✅ Proyecto Listo para Desplegar

El proyecto está completamente preparado y actualizado en GitHub:
- ✅ Código limpio (sin archivos innecesarios)
- ✅ Sin actualización automática
- ✅ Configurado para producción
- ✅ Script de despliegue incluido

---

## 📋 Pasos Rápidos para Desplegar

### 1. Crear Cuenta en DigitalOcean
- Ve a https://www.digitalocean.com
- Regístrate y verifica email
- Agrega método de pago

### 2. Crear Droplet
- "Create" → "Droplets"
- **Ubuntu 22.04 (LTS)**
- **Plan:** Basic $4/mes (512 MB RAM, 1 CPU, 10 GB SSD)
- **Región:** Más cercana a tu ubicación
- **Autenticación:** Password o SSH keys
- **Nombre:** `rhm-app`
- Click "Create Droplet"

### 3. Conectar al Servidor
```bash
ssh root@TU_IP_DROPLET
```

### 4. Desplegar (Opción Rápida)
```bash
# Descargar y ejecutar script de despliegue
curl -o deploy.sh https://raw.githubusercontent.com/DelgadoCovarrubiasLuisMario/RHM/main/deploy.sh
chmod +x deploy.sh
bash deploy.sh
```

### 5. Desplegar (Opción Manual)
Sigue la guía completa en `GUIA_DIGITALOCEAN.md`

---

## 🔗 Repositorio GitHub

**URL:** https://github.com/DelgadoCovarrubiasLuisMario/RHM

**Para clonar:**
```bash
git clone https://github.com/DelgadoCovarrubiasLuisMario/RHM.git
```

---

## ✅ Verificación Post-Despliegue

1. **Acceder a la aplicación:**
   ```
   http://TU_IP_DROPLET:3000
   ```

2. **Probar login:**
   - Usuario: `admin`
   - Contraseña: `admin123`

3. **Verificar que funciona:**
   - ✅ Login funciona
   - ✅ Panel admin carga
   - ✅ Puedes ver empleados
   - ✅ Puedes registrar asistencia

---

## 🔄 Actualizar Aplicación

Cuando hagas cambios:

```bash
# En el servidor
cd /root/RHM
git pull
npm install
pm2 restart rhm-app
```

---

## 📊 Comandos Útiles

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs rhm-app

# Reiniciar
pm2 restart rhm-app

# Detener
pm2 stop rhm-app
```

---

## 💰 Costo

- **Droplet:** $4 USD/mes (~$80 MXN/mes)
- **Total:** ~$4 USD/mes

---

**¡Listo para desplegar!** 🚀

