const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar:', err.message);
        process.exit(1);
    }
    
    eliminarColumnaArea();
});

function eliminarColumnaArea() {
    console.log('🔄 Eliminando columna área de la base de datos...\n');
    
    db.serialize(() => {
        // Crear nueva tabla sin columna area
        db.run(`
            CREATE TABLE empleados_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                email TEXT,
                telefono TEXT,
                sueldo_base REAL DEFAULT 2000,
                activo INTEGER DEFAULT 1,
                foto TEXT,
                cargo TEXT,
                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) {
                console.error('Error al crear tabla:', err.message);
                db.close();
                return;
            }
            
            console.log('✅ Tabla temporal creada');
            
            // Copiar datos sin la columna area
            db.run(`
                INSERT INTO empleados_new 
                (id, codigo, nombre, apellido, email, telefono, sueldo_base, activo, foto, cargo, creado_en)
                SELECT id, codigo, nombre, apellido, email, telefono, sueldo_base, activo, foto, cargo, creado_en
                FROM empleados
            `, (err) => {
                if (err) {
                    console.error('Error al copiar datos:', err.message);
                    db.close();
                    return;
                }
                
                console.log('✅ Datos copiados');
                
                // Eliminar tabla vieja
                db.run('DROP TABLE empleados', (err) => {
                    if (err) {
                        console.error('Error al eliminar tabla vieja:', err.message);
                        db.close();
                        return;
                    }
                    
                    console.log('✅ Tabla vieja eliminada');
                    
                    // Renombrar nueva tabla
                    db.run('ALTER TABLE empleados_new RENAME TO empleados', (err) => {
                        if (err) {
                            console.error('Error al renombrar tabla:', err.message);
                            db.close();
                            return;
                        }
                        
                        console.log('✅ Tabla renombrada');
                        
                        // Recrear índices
                        db.run('CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo)', () => {});
                        
                        console.log('\n✅ Columna área eliminada completamente de la base de datos.');
                        db.close();
                    });
                });
            });
        });
    });
}

