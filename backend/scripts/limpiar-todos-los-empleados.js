const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada');
        limpiarTodo();
    }
});

function limpiarTodo() {
    console.log('🧹 Limpiando todos los empleados y sus datos relacionados...\n');
    
    const operaciones = [
        { tabla: 'asistencia', nombre: 'Registros de asistencia' },
        { tabla: 'descuentos_varios', nombre: 'Descuentos varios' },
        { tabla: 'pagos', nombre: 'Pagos' },
        { tabla: 'uniformes_y_botas', nombre: 'Uniformes y botas' },
        { tabla: 'vacaciones', nombre: 'Vacaciones' },
        { tabla: 'empleados', nombre: 'Empleados' }
    ];
    
    let completadas = 0;
    
    operaciones.forEach((op, index) => {
        db.run(`DELETE FROM ${op.tabla}`, (err) => {
            if (err) {
                console.error(`❌ Error al limpiar ${op.nombre}:`, err.message);
            } else {
                console.log(`✅ ${op.nombre} eliminados`);
            }
            completadas++;
            
            if (completadas === operaciones.length) {
                console.log('\n✅ Limpieza completada. Todas las tablas han sido vaciadas.\n');
                
                // Verificar que todo esté vacío
                db.all('SELECT COUNT(*) as count FROM empleados', [], (err, rows) => {
                    if (!err) {
                        console.log(`📊 Empleados restantes: ${rows[0].count}`);
                    }
                    db.close();
                    process.exit(0);
                });
            }
        });
    });
}

