const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');
const QR_DIR = path.join(__dirname, '../../qrs');

// Crear directorio de QRs si no existe
if (!fs.existsSync(QR_DIR)) {
    fs.mkdirSync(QR_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Base de datos conectada');
    generarQRs();
});

async function generarQRs() {
    db.all('SELECT id, codigo, nombre, apellido FROM empleados WHERE activo = 1 ORDER BY nombre, apellido', [], async (err, empleados) => {
        if (err) {
            console.error('Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        console.log(`\n📱 Generando QRs para ${empleados.length} empleados...\n`);
        
        let generados = 0;
        let errores = 0;
        
        for (const emp of empleados) {
            try {
                const qrDataURL = await QRCode.toDataURL(emp.codigo, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                
                // Guardar QR como archivo (opcional)
                const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
                const fileName = `${emp.codigo}_${emp.nombre.replace(/\s+/g, '_')}_${emp.apellido.replace(/\s+/g, '_')}.png`;
                const filePath = path.join(QR_DIR, fileName);
                fs.writeFileSync(filePath, base64Data, 'base64');
                
                generados++;
                console.log(`✅ ${generados}. ${emp.nombre} ${emp.apellido} - Código: ${emp.codigo} - QR generado`);
            } catch (error) {
                errores++;
                console.error(`❌ Error al generar QR para ${emp.nombre} ${emp.apellido}:`, error.message);
            }
        }
        
        console.log(`\n✅ Proceso completado:`);
        console.log(`   - QRs generados: ${generados}`);
        console.log(`   - Errores: ${errores}`);
        console.log(`   - QRs guardados en: ${QR_DIR}`);
        console.log(`\n💡 Los QRs también se generan automáticamente al acceder a cada empleado en el sistema.`);
        
        db.close();
    });
}

