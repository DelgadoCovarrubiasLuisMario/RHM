# 📋 Copiar Empleados al Servidor

## ✅ Ya Tienes Preparado
- ✅ Archivo `rhr_base64.txt` con la base de datos codificada
- ✅ 77 empleados en tu base de datos local

---

## 🔧 Método 1: Usando SSH (Si Funciona)

### Paso 1: Conectar por SSH
```bash
ssh root@167.172.201.83
```
Contraseña: `RHM1industry`

### Paso 2: Ir al directorio de la base de datos
```bash
cd /root/RHM/database
```

### Paso 3: Crear archivo base64
```bash
cat > /tmp/rhr_base64.txt
```

### Paso 4: Pegar el contenido
1. **Abre el archivo:** `C:\Users\Colibecas\Documents\apprhr\rhr_base64.txt`
2. **Selecciona TODO** (Ctrl+A) y **copia** (Ctrl+C)
3. **Vuelve a la terminal SSH**
4. **Pega el contenido** (click derecho → Paste, o Ctrl+V)
5. **Presiona Enter**
6. **Presiona Ctrl+D** para guardar y salir

### Paso 5: Decodificar y guardar
```bash
base64 -d /tmp/rhr_base64.txt > /root/RHM/database/rhr.db
```

### Paso 6: Verificar
```bash
# Ver tamaño del archivo
ls -lh /root/RHM/database/rhr.db

# Verificar empleados
cd /root/RHM
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('database/rhr.db'); db.get('SELECT COUNT(*) as count FROM empleados', (err, row) => { if(err) console.error(err); else console.log('Empleados:', row.count); db.close(); });"
```

Deberías ver: `Empleados: 77`

### Paso 7: Reiniciar aplicación
```bash
pm2 restart rhm-app
```

---

## 🔧 Método 2: Usando Consola de Recuperación

Si SSH no funciona, usa la consola de recuperación:

### Paso 1: Abrir Consola de Recuperación
1. Ve al panel de DigitalOcean
2. Selecciona tu Droplet
3. Click en "Recovery"
4. Click en "Launch Recovery Console"

### Paso 2: Montar Sistema
```bash
mount /dev/sda1 /mnt
chroot /mnt
```

### Paso 3: Ir al directorio
```bash
cd /root/RHM/database
```

### Paso 4: Crear archivo base64
```bash
cat > /tmp/rhr_base64.txt
```

### Paso 5: Pegar contenido
1. Abre `C:\Users\Colibecas\Documents\apprhr\rhr_base64.txt`
2. Copia TODO (Ctrl+A, Ctrl+C)
3. Pega en la consola (Ctrl+V)
4. Presiona Enter
5. Presiona **Ctrl+D**

### Paso 6: Decodificar
```bash
base64 -d /tmp/rhr_base64.txt > /root/RHM/database/rhr.db
```

### Paso 7: Salir y Reiniciar
```bash
exit
umount /mnt
```

Luego reinicia el Droplet desde el panel de DigitalOcean.

---

## 🔧 Método 3: Usando GitHub (Temporal)

Si los otros métodos no funcionan:

### Paso 1: Forzar subir base de datos a GitHub
```powershell
cd C:\Users\Colibecas\Documents\apprhr
git add -f database/rhr.db
git commit -m "Temporal: agregar BD para migración"
git push
```

### Paso 2: En el Servidor
```bash
cd /root/RHM
git pull
pm2 restart rhm-app
```

### Paso 3: Eliminar del Repositorio (IMPORTANTE)
```powershell
git rm database/rhr.db
git commit -m "Eliminar BD del repositorio"
git push
```

---

## ✅ Verificación Final

Después de copiar, verifica en el navegador:

1. **Accede a:** `http://167.172.201.83:3000`
2. **Login:** `admin` / `admin123`
3. **Ve a "Empleados"**
4. **Deberías ver tus 77 empleados** ✅

---

## 🎯 Recomendación

**Usa el Método 1 (SSH)** si funciona. Es el más directo.

Si SSH no funciona, usa el **Método 2 (Consola de Recuperación)**.

El **Método 3 (GitHub)** es el último recurso.

---

**¿Puedes conectarte por SSH ahora? Si sí, usa el Método 1. Si no, usa el Método 2.**

