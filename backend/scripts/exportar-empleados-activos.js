const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../database');
const DB_PATH = path.join(DB_DIR, 'rhr.db');
const DB_EXPORT_PATH = path.join(DB_DIR, 'rhr_activos.db');

// Crear carpeta database si no existe
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Eliminar BD de exportación si existe
if (fs.existsSync(DB_EXPORT_PATH)) {
    fs.unlinkSync(DB_EXPORT_PATH);
}

const dbOrigen = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos origen:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos origen conectada');
        crearBDExportacion();
    }
});

function crearBDExportacion() {
    const dbExport = new sqlite3.Database(DB_EXPORT_PATH, (err) => {
        if (err) {
            console.error('❌ Error al crear base de datos de exportación:', err.message);
            dbOrigen.close();
            process.exit(1);
        } else {
            console.log('✅ Base de datos de exportación creada');
            copiarDatos();
        }
    });

    function copiarDatos() {
        dbExport.serialize(() => {
            // Crear tabla administradores
            dbExport.run(`
                CREATE TABLE IF NOT EXISTS administradores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    usuario TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    nombre TEXT NOT NULL,
                    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error al crear tabla administradores:', err);
                    finalizar();
                    return;
                }
                
                // Crear tabla empleados
                dbExport.run(`
                    CREATE TABLE IF NOT EXISTS empleados (
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
                        console.error('Error al crear tabla empleados:', err);
                        finalizar();
                        return;
                    }
                    
                    copiarAdministradores();
                });
            });

            function copiarAdministradores() {
                dbOrigen.all('SELECT * FROM administradores', [], (err, admins) => {
                    if (err) {
                        console.error('Error al copiar administradores:', err);
                        copiarEmpleadosActivos();
                        return;
                    }
                    
                    if (admins && admins.length > 0) {
                        const stmt = dbExport.prepare('INSERT INTO administradores (id, usuario, password, nombre, creado_en) VALUES (?, ?, ?, ?, ?)');
                        admins.forEach(admin => {
                            stmt.run([admin.id, admin.usuario, admin.password, admin.nombre, admin.creado_en]);
                        });
                        stmt.finalize();
                        console.log(`✅ ${admins.length} administrador(es) copiado(s)`);
                    }
                    copiarEmpleadosActivos();
                });
            }

            function copiarEmpleadosActivos() {
                dbOrigen.all('SELECT * FROM empleados WHERE activo = 1', [], (err, empleados) => {
                    if (err) {
                        console.error('Error al obtener empleados activos:', err);
                        finalizar();
                        return;
                    }

                    if (!empleados || empleados.length === 0) {
                        console.log('⚠️ No hay empleados activos');
                        finalizar();
                        return;
                    }

                    const stmt = dbExport.prepare('INSERT INTO empleados (id, codigo, nombre, apellido, email, telefono, sueldo_base, activo, foto, cargo, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                    
                    empleados.forEach(empleado => {
                        stmt.run([
                            empleado.id,
                            empleado.codigo,
                            empleado.nombre,
                            empleado.apellido,
                            empleado.email,
                            empleado.telefono,
                            empleado.sueldo_base,
                            empleado.activo,
                            empleado.foto,
                            empleado.cargo,
                            empleado.creado_en
                        ]);
                    });
                    stmt.finalize();
                    console.log(`✅ ${empleados.length} empleado(s) activo(s) copiado(s)`);
                    
                    // Copiar exámenes médicos
                    const empleadosIds = empleados.map(e => e.id);
                    if (empleadosIds.length > 0) {
                        const placeholders = empleadosIds.map(() => '?').join(',');
                        
                        dbExport.run(`
                            CREATE TABLE IF NOT EXISTS examenes_medicos (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                empleado_id INTEGER NOT NULL,
                                quimica_sanguinea INTEGER DEFAULT 0,
                                antidoping INTEGER DEFAULT 0,
                                electrocardiogram INTEGER DEFAULT 0,
                                espirometrias INTEGER DEFAULT 0,
                                audiometrias INTEGER DEFAULT 0,
                                vigencia_de TEXT,
                                fecha_nacimiento TEXT,
                                vence_induccion TEXT,
                                mandar_a_curso TEXT,
                                actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (empleado_id) REFERENCES empleados(id)
                            )
                        `, (err) => {
                            if (err) {
                                console.error('Error al crear tabla examenes_medicos:', err);
                                finalizar();
                                return;
                            }
                            
                            dbOrigen.all(`SELECT * FROM examenes_medicos WHERE empleado_id IN (${placeholders})`, empleadosIds, (err, examenes) => {
                                if (err) {
                                    console.error('Error al copiar exámenes médicos:', err);
                                    finalizar();
                                    return;
                                }
                                
                                if (examenes && examenes.length > 0) {
                                    const stmtExamenes = dbExport.prepare('INSERT INTO examenes_medicos (id, empleado_id, quimica_sanguinea, antidoping, electrocardiogram, espirometrias, audiometrias, vigencia_de, fecha_nacimiento, vence_induccion, mandar_a_curso, actualizado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                                    examenes.forEach(examen => {
                                        stmtExamenes.run([
                                            examen.id,
                                            examen.empleado_id,
                                            examen.quimica_sanguinea,
                                            examen.antidoping,
                                            examen.electrocardiogram,
                                            examen.espirometrias,
                                            examen.audiometrias,
                                            examen.vigencia_de,
                                            examen.fecha_nacimiento,
                                            examen.vence_induccion,
                                            examen.mandar_a_curso,
                                            examen.actualizado_en
                                        ]);
                                    });
                                    stmtExamenes.finalize();
                                    console.log(`✅ ${examenes.length} registro(s) de exámenes médicos copiado(s)`);
                                }
                                finalizar();
                            });
                        });
                    } else {
                        finalizar();
                    }
                });
            }

            function finalizar() {
                dbExport.close((err) => {
                    if (err) {
                        console.error('Error al cerrar BD de exportación:', err);
                    } else {
                        console.log('\n✅ Exportación completada!');
                        console.log(`📁 Archivo: ${DB_EXPORT_PATH}`);
                        const stats = fs.statSync(DB_EXPORT_PATH);
                        console.log(`📊 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
                    }
                    dbOrigen.close();
                    process.exit(0);
                });
            }
        });
    }
}
