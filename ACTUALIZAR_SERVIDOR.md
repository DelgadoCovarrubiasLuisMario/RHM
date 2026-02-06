# 🚀 Actualizar Servidor con Nuevos Cambios

## Pasos para actualizar el servidor DigitalOcean

### Opción 1: Usando Git Pull (Recomendado)

1. **Conectarte al servidor** (Recovery Console o SSH si funciona):
   ```bash
   # Si usas SSH:
   ssh root@167.172.201.83
   
   # O usar Recovery Console desde DigitalOcean
   ```

2. **Ir al directorio del proyecto**:
   ```bash
   cd /root/RHM
   ```

3. **Actualizar código desde GitHub**:
   ```bash
   git pull
   ```

4. **Instalar nuevas dependencias** (si hay cambios en package.json):
   ```bash
   npm install
   ```

5. **Reiniciar la aplicación**:
   ```bash
   pm2 restart rhm-app
   ```

6. **Verificar que esté corriendo**:
   ```bash
   pm2 status
   pm2 logs rhm-app --lines 20
   ```

---

### Opción 2: Si Git Pull falla (por cambios locales)

Si `git pull` da error por cambios locales, ejecuta:

```bash
cd /root/RHM
git reset --hard HEAD
git pull
npm install
pm2 restart rhm-app
```

⚠️ **Cuidado**: `git reset --hard` eliminará cualquier cambio local en el servidor.

---

### Verificar que todo funciona

1. **Ver logs de la aplicación**:
   ```bash
   pm2 logs rhm-app --lines 50
   ```

2. **Probar la aplicación**:
   - Abre tu navegador
   - Ve a `https://167.172.201.83` (o tu dominio)
   - Inicia sesión como admin
   - Verifica que aparezca la alerta de cortes automáticos (si hay)

---

## Si hay problemas

### Error: "npm install" falla
```bash
# Limpiar cache y reinstalar
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Error: La app no inicia
```bash
# Ver logs detallados
pm2 logs rhm-app --err --lines 100

# Reiniciar desde cero
pm2 delete rhm-app
cd /root/RHM
pm2 start backend/server.js --name rhm-app
pm2 save
```

### Error: Base de datos no tiene la nueva tabla
```bash
# La tabla se crea automáticamente al iniciar la app
# Si no se crea, verifica los logs:
pm2 logs rhm-app | grep -i "cortes_automaticos"
```

---

## Comandos útiles

```bash
# Ver estado de la app
pm2 status

# Ver logs en tiempo real
pm2 logs rhm-app

# Reiniciar app
pm2 restart rhm-app

# Ver última versión en git
cd /root/RHM && git log --oneline -5
```

