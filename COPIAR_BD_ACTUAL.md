# 📋 Copiar Base de Datos al Servidor

## ✅ Estado Actual
- **Empleados activos:** 35
- **Total en BD:** 77 (incluye inactivos)
- **Archivo preparado:** `rhr_base64.txt` ✅

---

## 🔧 Pasos para Copiar

### Paso 1: Conectar al Servidor

**Opción A: SSH (si funciona)**
```bash
ssh root@167.172.201.83
```

**Opción B: Consola de Recuperación**
- Panel DigitalOcean → Droplet → Recovery → Launch Console

---

### Paso 2: Ir al Directorio
```bash
cd /root/RHM/database
```

---

### Paso 3: Crear Archivo Base64
```bash
cat > /tmp/rhr_base64.txt
```

---

### Paso 4: Pegar Contenido

1. **Abre:** `C:\Users\Colibecas\Documents\apprhr\rhr_base64.txt`
2. **Selecciona TODO:** Ctrl+A
3. **Copia:** Ctrl+C
4. **Pega en la terminal:** Ctrl+V (o click derecho → Paste)
5. **Presiona Enter**
6. **Presiona Ctrl+D** para guardar y salir

---

### Paso 5: Decodificar y Guardar
```bash
base64 -d /tmp/rhr_base64.txt > /root/RHM/database/rhr.db
```

---

### Paso 6: Verificar
```bash
cd /root/RHM
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('database/rhr.db'); db.get('SELECT COUNT(*) as count FROM empleados WHERE activo = 1', (err, row) => { if(err) console.error(err); else console.log('Empleados activos:', row.count); db.close(); });"
```

**Deberías ver:** `Empleados activos: 35`

---

### Paso 7: Reiniciar Aplicación
```bash
pm2 restart rhm-app
```

---

### Paso 8: Verificar en el Navegador

1. **Accede:** `http://167.172.201.83:3000`
2. **Login:** `admin` / `admin123`
3. **Ve a "Empleados"**
4. **Deberías ver tus 35 empleados activos** ✅

---

## 📋 Resumen de Comandos

```bash
cd /root/RHM/database
cat > /tmp/rhr_base64.txt
# [Pegar contenido de rhr_base64.txt]
# Ctrl+D

base64 -d /tmp/rhr_base64.txt > rhr.db
cd /root/RHM
pm2 restart rhm-app
```

---

**¿Puedes conectarte por SSH o consola de recuperación ahora?**

