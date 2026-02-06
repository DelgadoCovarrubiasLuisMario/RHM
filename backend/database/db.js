const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../database');
const DB_PATH = path.join(DB_DIR, 'rhr.db');

let db = null;

// Inicializar base de datos
function initDatabase() {
    // Crear carpeta database si no existe
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Error al conectar con la base de datos:', err.message);
        } else {
            console.log('✅ Base de datos SQLite conectada');
            createTables();
        }
    });
}

// Crear tablas iniciales
function createTables() {
    // Tabla de administradores
    db.run(`
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
        }
    });

    // Tabla de empleados
    db.run(`
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
        } else {
            // Agregar columna sueldo_base si no existe (para bases de datos existentes)
            db.run(`ALTER TABLE empleados ADD COLUMN sueldo_base REAL DEFAULT 2000`, (err) => {
                // Ignorar error si la columna ya existe
            });
            // Agregar columna foto si no existe (para bases de datos existentes)
            db.run(`ALTER TABLE empleados ADD COLUMN foto TEXT`, (err) => {
                // Ignorar error si la columna ya existe
            });
            // Agregar columna cargo si no existe (para bases de datos existentes)
            db.run(`ALTER TABLE empleados ADD COLUMN cargo TEXT`, (err) => {
                // Ignorar error si la columna ya existe
            });
        }
    });

    // Tabla de cortes automáticos de jornadas
    db.run(`
        CREATE TABLE IF NOT EXISTS cortes_automaticos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            horas_originales REAL NOT NULL,
            horas_cortadas REAL NOT NULL DEFAULT 9.5,
            horas_extra REAL NOT NULL DEFAULT 1.5,
            estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'aprobado', 'rechazado')),
            procesado_por INTEGER,
            procesado_en DATETIME,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla cortes_automaticos:', err);
        }
    });

    // Tabla de asistencia (secuencial para asegurar que se cree antes de los índices)
    db.run(`
        CREATE TABLE IF NOT EXISTS asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            movimiento TEXT NOT NULL CHECK(movimiento IN ('ENTRADA', 'SALIDA', 'INGRESO')),
            turno INTEGER NOT NULL CHECK(turno IN (1, 2, 3)),
            area TEXT NOT NULL CHECK(area IN ('Planta', 'GeoCycle')),
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla asistencia:', err);
        } else {
            // Migración: hacer area nullable
            db.all(`PRAGMA table_info(asistencia)`, [], (err, columns) => {
                if (!err && columns && columns.length > 0) {
                    const areaColumn = columns.find(col => col.name === 'area');
                    // Si la columna existe y tiene restricción NOT NULL, hacemos migración
                    if (areaColumn && areaColumn.notnull === 1) {
                        console.log('🔄 Migrando tabla asistencia para hacer area nullable...');
                        // Crear tabla temporal con estructura correcta
                        db.run(`
                            CREATE TABLE asistencia_new (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                empleado_id INTEGER NOT NULL,
                                fecha TEXT NOT NULL,
                                hora TEXT NOT NULL,
                                movimiento TEXT NOT NULL CHECK(movimiento IN ('ENTRADA', 'SALIDA', 'INGRESO')),
                                turno INTEGER NOT NULL CHECK(turno IN (1, 2, 3)),
                                area TEXT,
                                creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (empleado_id) REFERENCES empleados(id)
                            )
                        `, (err) => {
                            if (!err) {
                                // Copiar datos
                                db.run(`INSERT INTO asistencia_new SELECT id, empleado_id, fecha, hora, movimiento, turno, area, creado_en FROM asistencia`, (err) => {
                                    if (!err) {
                                        // Eliminar tabla vieja
                                        db.run(`DROP TABLE asistencia`, (err) => {
                                            if (!err) {
                                                // Renombrar nueva tabla
                                                db.run(`ALTER TABLE asistencia_new RENAME TO asistencia`, (err) => {
                                                    if (!err) {
                                                        console.log('✅ Migración completada: area ahora es nullable en asistencia');
                                                        // Recrear índices
                                                        db.run(`CREATE INDEX IF NOT EXISTS idx_asistencia_fecha_area ON asistencia(fecha, area)`, (err) => {
                                                            if (err) console.error('Error al crear índice fecha_area:', err);
                                                        });
                                                        db.run(`CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON asistencia(empleado_id)`, (err) => {
                                                            if (err) console.error('Error al crear índice empleado:', err);
                                                        });
                                                    } else {
                                                        console.error('Error al renombrar tabla asistencia:', err);
                                                    }
                                                });
                                            } else {
                                                console.error('Error al eliminar tabla asistencia:', err);
                                            }
                                        });
                                    } else {
                                        console.error('Error al copiar datos en asistencia:', err);
                                    }
                                });
                            } else {
                                console.error('Error al crear tabla asistencia_new:', err);
                            }
                        });
                    } else {
                        // Si no necesita migración, solo crear índices
                        db.run(`CREATE INDEX IF NOT EXISTS idx_asistencia_fecha_area ON asistencia(fecha, area)`, (err) => {
                            if (err) {
                                console.error('Error al crear índice fecha_area:', err);
                            }
                        });
                        
                        db.run(`CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON asistencia(empleado_id)`, (err) => {
                            if (err) {
                                console.error('Error al crear índice empleado:', err);
                            }
                        });
                    }
                }
            });
        }
    });

    // Tabla de descuentos varios
    db.run(`
        CREATE TABLE IF NOT EXISTS descuentos_varios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha_inicio TEXT NOT NULL,
            fecha_fin TEXT NOT NULL,
            monto REAL NOT NULL DEFAULT 0,
            descripcion TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla descuentos_varios:', err);
        } else {
            // Crear índice para búsquedas rápidas
            db.run(`CREATE INDEX IF NOT EXISTS idx_descuentos_empleado_periodo ON descuentos_varios(empleado_id, fecha_inicio, fecha_fin)`, (err) => {
                if (err) {
                    console.error('Error al crear índice descuentos:', err);
                }
            });
        }
    });

    // Tabla de uniformes y botas (entregas)
    db.run(`
        CREATE TABLE IF NOT EXISTS uniformes_y_botas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('uniforme', 'botas', 'ambos')),
            fecha_entrega TEXT NOT NULL,
            cantidad_uniformes INTEGER DEFAULT 0,
            cantidad_botas INTEGER DEFAULT 0,
            observaciones TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla uniformes_y_botas:', err);
        } else {
            // Crear índices para búsquedas rápidas
            db.run(`CREATE INDEX IF NOT EXISTS idx_uniformes_empleado ON uniformes_y_botas(empleado_id)`, (err) => {
                if (err) {
                    console.error('Error al crear índice uniformes empleado:', err);
                }
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_uniformes_fecha ON uniformes_y_botas(fecha_entrega)`, (err) => {
                if (err) {
                    console.error('Error al crear índice uniformes fecha:', err);
                }
            });
        }
    });

    // Tabla de pagos (historial de nóminas)
    db.run(`
        CREATE TABLE IF NOT EXISTS pagos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha_inicio TEXT NOT NULL,
            fecha_fin TEXT NOT NULL,
            area TEXT NOT NULL CHECK(area IN ('Planta', 'GeoCycle')),
            sueldo_base REAL NOT NULL,
            total_pagado REAL NOT NULL,
            desglose TEXT NOT NULL,
            fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla pagos:', err);
        } else {
            // Migración: hacer area nullable
            db.all(`PRAGMA table_info(pagos)`, [], (err, columns) => {
                if (!err && columns && columns.length > 0) {
                    const areaColumn = columns.find(col => col.name === 'area');
                    // Si la columna existe y tiene restricción NOT NULL, hacemos migración
                    if (areaColumn && areaColumn.notnull === 1) {
                        console.log('🔄 Migrando tabla pagos: haciendo area nullable...');
                        db.serialize(() => {
                            // Crear nueva tabla sin restricción NOT NULL en area
                            db.run(`
                                CREATE TABLE IF NOT EXISTS pagos_new (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    empleado_id INTEGER NOT NULL,
                                    fecha_inicio TEXT NOT NULL,
                                    fecha_fin TEXT NOT NULL,
                                    area TEXT,
                                    sueldo_base REAL NOT NULL,
                                    total_pagado REAL NOT NULL,
                                    desglose TEXT NOT NULL,
                                    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
                                    FOREIGN KEY (empleado_id) REFERENCES empleados(id)
                                )
                            `, (err) => {
                                if (err) {
                                    console.error('Error al crear tabla pagos_new:', err);
                                    return;
                                }
                                
                                // Copiar datos
                                db.run(`INSERT INTO pagos_new SELECT * FROM pagos`, (err) => {
                                    if (err) {
                                        console.error('Error al copiar datos a pagos_new:', err);
                                        return;
                                    }
                                    
                                    // Eliminar tabla vieja
                                    db.run(`DROP TABLE pagos`, (err) => {
                                        if (err) {
                                            console.error('Error al eliminar tabla pagos:', err);
                                            return;
                                        }
                                        
                                        // Renombrar nueva tabla
                                        db.run(`ALTER TABLE pagos_new RENAME TO pagos`, (err) => {
                                            if (err) {
                                                console.error('Error al renombrar tabla pagos_new:', err);
                                            } else {
                                                console.log('✅ Migración de pagos completada');
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    }
                }
            });
            
            // Crear índices para búsquedas rápidas
            db.run(`CREATE INDEX IF NOT EXISTS idx_pagos_empleado ON pagos(empleado_id)`, (err) => {
                if (err) {
                    console.error('Error al crear índice pagos empleado:', err);
                }
            });
            
            db.run(`CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago)`, (err) => {
                if (err) {
                    console.error('Error al crear índice pagos fecha:', err);
                }
            });
        }
    });

    // Tabla de vacaciones
    db.run(`
        CREATE TABLE IF NOT EXISTS vacaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha_inicio TEXT NOT NULL,
            fecha_fin TEXT NOT NULL,
            dias INTEGER NOT NULL,
            año INTEGER NOT NULL,
            observaciones TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla vacaciones:', err);
        } else {
            db.run(`CREATE INDEX IF NOT EXISTS idx_vacaciones_empleado ON vacaciones(empleado_id)`, (err) => {
                if (err) console.error('Error al crear índice vacaciones_empleado:', err);
            });
            db.run(`CREATE INDEX IF NOT EXISTS idx_vacaciones_año ON vacaciones(empleado_id, año)`, (err) => {
                if (err) console.error('Error al crear índice vacaciones_año:', err);
            });
            db.run(`CREATE INDEX IF NOT EXISTS idx_vacaciones_fechas ON vacaciones(fecha_inicio, fecha_fin)`, (err) => {
                if (err) {
                    console.error('Error al crear índice vacaciones_fechas:', err);
                } else {
                    console.log('✅ Tablas creadas correctamente');
                }
            });
        }
    });

    // Tabla de exámenes médicos (para Inducción y cursos)
    db.run(`
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
            FOREIGN KEY (empleado_id) REFERENCES empleados(id),
            UNIQUE(empleado_id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla examenes_medicos:', err);
        } else {
            db.run(`CREATE INDEX IF NOT EXISTS idx_examenes_empleado ON examenes_medicos(empleado_id)`, (err) => {
                if (err) console.error('Error al crear índice examenes_empleado:', err);
            });
            // Agregar columnas de fechas si no existen (para bases de datos existentes)
            db.run(`ALTER TABLE examenes_medicos ADD COLUMN vigencia_de TEXT`, (err) => {});
            db.run(`ALTER TABLE examenes_medicos ADD COLUMN fecha_nacimiento TEXT`, (err) => {});
            db.run(`ALTER TABLE examenes_medicos ADD COLUMN vence_induccion TEXT`, (err) => {});
            db.run(`ALTER TABLE examenes_medicos ADD COLUMN mandar_a_curso TEXT`, (err) => {});
        }
    });

    // Tabla de producción de trituración (registro diario)
    db.run(`
        CREATE TABLE IF NOT EXISTS produccion_trituracion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER,
            nombre_encargado TEXT,
            fecha TEXT NOT NULL,
            turno INTEGER NOT NULL CHECK(turno IN (1, 2, 3)),
            toneladas REAL NOT NULL,
            area TEXT,
            puntos_rango_25_30 REAL DEFAULT 0,
            puntos_rango_30_35 REAL DEFAULT 0,
            puntos_rango_35_40 REAL DEFAULT 0,
            puntos_rango_40_plus REAL DEFAULT 0,
            fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla produccion_trituracion:', err);
        } else {
            // Migración: hacer empleado_id nullable si la tabla ya existe con NOT NULL
            // SQLite no permite ALTER COLUMN directamente, así que verificamos y migramos si es necesario
            db.all(`PRAGMA table_info(produccion_trituracion)`, [], (err, columns) => {
                if (!err && columns && columns.length > 0) {
                    const empleadoIdColumn = columns.find(col => col.name === 'empleado_id');
                    const areaColumn = columns.find(col => col.name === 'area');
                    // Si alguna columna tiene restricción NOT NULL, hacemos migración
                    if ((empleadoIdColumn && empleadoIdColumn.notnull === 1) || (areaColumn && areaColumn.notnull === 1)) {
                        console.log('🔄 Migrando tabla produccion_trituracion para hacer empleado_id y area nullable...');
                        
                        db.run(`
                            CREATE TABLE produccion_trituracion_new (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                empleado_id INTEGER,
                                nombre_encargado TEXT,
                                fecha TEXT NOT NULL,
                                turno INTEGER NOT NULL CHECK(turno IN (1, 2, 3)),
                                toneladas REAL NOT NULL,
                                area TEXT,
                                puntos_rango_25_30 REAL DEFAULT 0,
                                puntos_rango_30_35 REAL DEFAULT 0,
                                puntos_rango_35_40 REAL DEFAULT 0,
                                puntos_rango_40_plus REAL DEFAULT 0,
                                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (empleado_id) REFERENCES empleados(id)
                            )
                        `, (err) => {
                            if (!err) {
                                // Copiar datos (incluyendo nombre_encargado)
                                db.run(`INSERT INTO produccion_trituracion_new (id, empleado_id, nombre_encargado, fecha, turno, toneladas, area, puntos_rango_25_30, puntos_rango_30_35, puntos_rango_35_40, puntos_rango_40_plus, fecha_registro) 
                                        SELECT id, empleado_id, nombre_encargado, fecha, turno, toneladas, area, puntos_rango_25_30, puntos_rango_30_35, puntos_rango_35_40, puntos_rango_40_plus, fecha_registro FROM produccion_trituracion`, (err) => {
                                    if (!err) {
                                        // Eliminar tabla vieja
                                        db.run(`DROP TABLE produccion_trituracion`, (err) => {
                                            if (!err) {
                                                // Renombrar nueva tabla
                                                db.run(`ALTER TABLE produccion_trituracion_new RENAME TO produccion_trituracion`, (err) => {
                                                    if (!err) {
                                                        console.log('✅ Migración completada: empleado_id y area ahora son nullable');
                                                    } else {
                                                        console.error('Error al renombrar tabla:', err);
                                                    }
                                                });
                                            } else {
                                                console.error('Error al eliminar tabla vieja:', err);
                                            }
                                        });
                                    } else {
                                        console.error('Error al copiar datos:', err);
                                    }
                                });
                            } else {
                                console.error('Error al crear tabla temporal:', err);
                            }
                        });
                    }
                }
            });

            // Agregar columna nombre_encargado si no existe (para bases de datos existentes)
            db.run(`ALTER TABLE produccion_trituracion ADD COLUMN nombre_encargado TEXT`, (err) => {
                // Ignorar error si la columna ya existe
            });
            // Agregar columna comentarios si no existe
            db.run(`ALTER TABLE produccion_trituracion ADD COLUMN comentarios TEXT`, (err) => {
                // Ignorar error si la columna ya existe
            });
            db.run(`CREATE INDEX IF NOT EXISTS idx_produccion_empleado ON produccion_trituracion(empleado_id)`, (err) => {
                if (err) console.error('Error al crear índice produccion_empleado:', err);
            });
            db.run(`CREATE INDEX IF NOT EXISTS idx_produccion_fecha_area ON produccion_trituracion(fecha, area)`, (err) => {
                if (err) console.error('Error al crear índice produccion_fecha_area:', err);
            });
            db.run(`CREATE INDEX IF NOT EXISTS idx_produccion_nombre_encargado ON produccion_trituracion(nombre_encargado)`, (err) => {
                if (err) console.error('Error al crear índice produccion_nombre_encargado:', err);
            });
        }
    });

    // Tabla de configuración de precios de bonos
    db.run(`
        CREATE TABLE IF NOT EXISTS configuracion_precios_bono (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo_empleado TEXT NOT NULL CHECK(tipo_empleado IN ('Operario', 'Ayudante')),
            rango TEXT NOT NULL CHECK(rango IN ('25-30', '30-35', '35-40', '40+')),
            precio REAL NOT NULL,
            activo INTEGER DEFAULT 1,
            fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tipo_empleado, rango)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla configuracion_precios_bono:', err);
        } else {
            // Insertar precios iniciales si la tabla está vacía
            db.get(`SELECT COUNT(*) as count FROM configuracion_precios_bono`, (err, row) => {
                if (!err && row.count === 0) {
                    const precios = [
                        ['Operario', '25-30', 19.33],
                        ['Operario', '30-35', 24.17],
                        ['Operario', '35-40', 29.00],
                        ['Operario', '40+', 33.03],
                        ['Ayudante', '25-30', 20.20],
                        ['Ayudante', '30-35', 27.07],
                        ['Ayudante', '35-40', 30.93],
                        ['Ayudante', '40+', 34.80]
                    ];
                    const stmt = db.prepare(`INSERT INTO configuracion_precios_bono (tipo_empleado, rango, precio) VALUES (?, ?, ?)`);
                    precios.forEach(precio => {
                        stmt.run(precio[0], precio[1], precio[2]);
                    });
                    stmt.finalize();
                }
            });
        }
    });

    // Tabla de bonos mensuales calculados
    db.run(`
        CREATE TABLE IF NOT EXISTS bonos_mensuales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            mes TEXT NOT NULL,
            area TEXT NOT NULL CHECK(area IN ('Planta', 'GeoCycle')),
            tipo_empleado TEXT NOT NULL CHECK(tipo_empleado IN ('Operario', 'Ayudante')),
            puntos_rango_25_30 REAL DEFAULT 0,
            puntos_rango_30_35 REAL DEFAULT 0,
            puntos_rango_35_40 REAL DEFAULT 0,
            puntos_rango_40_plus REAL DEFAULT 0,
            bono_calculado REAL DEFAULT 0,
            fecha_calculo DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id),
            UNIQUE(empleado_id, mes, area)
        )
    `, (err) => {
        if (err) {
            console.error('Error al crear tabla bonos_mensuales:', err);
        } else {
            db.run(`CREATE INDEX IF NOT EXISTS idx_bonos_mensuales_empleado ON bonos_mensuales(empleado_id)`, (err) => {
                if (err) console.error('Error al crear índice bonos_mensuales_empleado:', err);
            });
            db.run(`CREATE INDEX IF NOT EXISTS idx_bonos_mensuales_mes_area ON bonos_mensuales(mes, area)`, (err) => {
                if (err) console.error('Error al crear índice bonos_mensuales_mes_area:', err);
            });
        }
    });
}

// Obtener instancia de la base de datos
function getDB() {
    return db;
}

module.exports = {
    initDatabase,
    getDB
};

