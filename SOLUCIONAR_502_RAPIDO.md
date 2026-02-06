# 🔧 Solución Rápida para Error 502 Bad Gateway

## Comandos para ejecutar en el servidor (Recovery Console)

### 1. Verificar estado de la aplicación
```bash
pm2 status
```

### 2. Si NO está corriendo, iniciarla
```bash
cd /root/RHM
pm2 start backend/server.js --name rhm-app
```

### 3. Si está corriendo pero con error, reiniciarla
```bash
pm2 restart rhm-app
```

### 4. Ver logs para identificar el error
```bash
pm2 logs rhm-app --lines 50
```

### 5. Verificar que responda localmente
```bash
curl http://localhost:3000
```

### 6. Reiniciar Nginx
```bash
systemctl restart nginx
```

---

## Solución Completa (Ejecutar todo seguido)

```bash
cd /root/RHM
pm2 restart rhm-app
sleep 3
pm2 logs rhm-app --lines 30
systemctl restart nginx
```

---

## Si la app crashea al iniciar

### Ver el error completo:
```bash
cd /root/RHM
node backend/server.js
```

Esto mostrará el error exacto. Los errores comunes son:

1. **Error de sintaxis en el código** → Revisar logs
2. **Dependencias faltantes** → Ejecutar `npm install`
3. **Base de datos bloqueada** → Reiniciar servidor o verificar permisos
4. **Puerto 3000 ocupado** → Verificar con `netstat -tuln | grep 3000`

---

## Solución paso a paso

### Paso 1: Verificar estado
```bash
pm2 status
```

### Paso 2: Ver logs de error
```bash
pm2 logs rhm-app --err --lines 50
```

### Paso 3: Si hay errores de dependencias
```bash
cd /root/RHM
npm install
pm2 restart rhm-app
```

### Paso 4: Si hay errores de código
```bash
cd /root/RHM
git pull  # Asegurarse de tener la última versión
npm install
pm2 restart rhm-app
```

### Paso 5: Verificar que funciona
```bash
curl http://localhost:3000
# Debería responder con HTML o redirección
```

---

## Si nada funciona

### Reiniciar todo desde cero:
```bash
cd /root/RHM
pm2 delete rhm-app
npm install
pm2 start backend/server.js --name rhm-app
pm2 save
systemctl restart nginx
```

---

## Verificar puertos

```bash
# Verificar que el puerto 3000 esté en uso
netstat -tuln | grep 3000

# Verificar que Nginx esté corriendo
systemctl status nginx
```

