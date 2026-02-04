# 🔧 Solución Rápida para Git Pull

Si tienes cambios locales que bloquean el `git pull`, ejecuta esto:

## Solución Rápida (Descartar cambios locales)

```bash
cd /root/RHM
git checkout -- backend/scripts/configurar-https-ip.sh backend/scripts/descargar-bd-activos.sh backend/scripts/diagnosticar-https.sh
git pull
```

## Si los archivos fueron eliminados en el repo

```bash
cd /root/RHM
git reset --hard HEAD
git pull
```

## Después del pull, ejecuta el diagnóstico

```bash
chmod +x backend/scripts/diagnosticar-502.sh
./backend/scripts/diagnosticar-502.sh
```

