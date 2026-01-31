const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../database');
const DB_PATH = path.join(DB_DIR, 'rhr.db');

// Crear carpeta database si no existe
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada');
        initData();
    }
});

function initData() {
    // Verificar si ya existe un admin
    db.get('SELECT COUNT(*) as count FROM administradores', [], (err, row) => {
        if (err) {
            console.error('Error al verificar administradores:', err);
            db.close();
            return;
        }

        if (row.count === 0) {
            // Insertar admin por defecto
            db.run(
                `INSERT INTO administradores (usuario, password, nombre) 
                 VALUES (?, ?, ?)`,
                ['admin', 'admin123', 'Administrador'],
                function(err) {
                    if (err) {
                        console.error('Error al insertar administrador:', err);
                    } else {
                        console.log('✅ Administrador creado:');
                        console.log('   Usuario: admin');
                        console.log('   Contraseña: admin123');
                    }
                    checkEmployees();
                }
            );
        } else {
            console.log('✅ Administrador ya existe');
            checkEmployees();
        }
    });
}

function checkEmployees() {
    // Verificar si hay empleados
    db.get('SELECT COUNT(*) as count FROM empleados', [], (err, row) => {
        if (err) {
            console.error('Error al verificar empleados:', err);
            db.close();
            return;
        }

        if (row.count === 0) {
            console.log('⚠️  No hay empleados en la base de datos');
            console.log('📝 Puedes agregar empleados desde el panel de administración');
        } else {
            console.log(`✅ ${row.count} empleado(s) encontrado(s)`);
        }

        db.close();
        console.log('\n✅ Inicialización completada');
        process.exit(0);
    });
}

