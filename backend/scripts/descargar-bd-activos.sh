#!/bin/bash
# Script para descargar y copiar base de datos de empleados activos

echo "📥 Descargando base de datos de empleados activos..."

cd /root/RHM/database

# Descargar desde GitHub (raw)
curl -L -o rhr_activos.db https://github.com/DelgadoCovarrubiasLuisMario/RHM/raw/main/database/rhr_activos.db

if [ -f "rhr_activos.db" ]; then
    # Hacer backup de la BD actual
    if [ -f "rhr.db" ]; then
        cp rhr.db rhr.db.backup
        echo "✅ Backup creado: rhr.db.backup"
    fi
    
    # Copiar la nueva BD
    cp rhr_activos.db rhr.db
    echo "✅ Base de datos copiada"
    
    # Verificar
    cd /root/RHM
    node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('database/rhr.db'); db.get('SELECT COUNT(*) as count FROM empleados WHERE activo = 1', (err, row) => { if(err) console.error(err); else console.log('Empleados activos:', row.count); db.close(); });"
    
    echo "🔄 Reiniciando aplicación..."
    pm2 restart rhm-app
    
    echo "✅ Completado!"
else
    echo "❌ Error al descargar el archivo"
    exit 1
fi

