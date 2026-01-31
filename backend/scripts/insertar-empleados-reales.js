const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

// Datos de empleados reales
const empleadosData = {
    Planta: [
        { codigo: 'e07833e2', nombre: 'NESTOR RAFAEL', apellido: 'CORTES TORRES', sueldo_base: 5000 },
        { codigo: '4e92dc82', nombre: 'RAMIRO', apellido: 'ROJAS AGUILAR', sueldo_base: 4000 },
        { codigo: '121662dc', nombre: 'IRMA MARGARITA', apellido: 'ARREOLA MONTAÑO', sueldo_base: 2200 },
        { codigo: '0236a7cc', nombre: 'GUILLERMO', apellido: 'ALVARADO PONCE', sueldo_base: 5000 },
        { codigo: 'de3ed8ec', nombre: 'SAMUEL GERONIMO', apellido: 'MEDINA', sueldo_base: 4300 },
        { codigo: '015ae7dc', nombre: 'ALAN', apellido: 'MONTES MARMOLEJO', sueldo_base: 3700 },
        { codigo: '924f3bf5', nombre: 'CESAR', apellido: 'ALCALÁ GARCIA', sueldo_base: 3000 },
        { codigo: 'f3fb78c1', nombre: 'JOSÉ', apellido: 'BEJARANO HERNÁNDEZ', sueldo_base: 3000 },
        { codigo: 'cc6345ca', nombre: 'CHRISTIAN', apellido: 'SÁNCHEZ SOLANO', sueldo_base: 3000 },
        { codigo: 'c79a9c67', nombre: 'ERICK', apellido: 'LLERENAS VALDOVINOS', sueldo_base: 3000 },
        { codigo: '61652422', nombre: 'JAIME', apellido: 'GARCÍA ECHEVERRÍA', sueldo_base: 5500 },
        { codigo: '2a0ca8ab', nombre: 'ROGELIO', apellido: 'CONTRERAS REGALADO', sueldo_base: 2300 },
        { codigo: 'd11d3a99', nombre: 'PABLO ENRIQUE', apellido: 'RODRIGUEZ RAMIREZ', sueldo_base: 2500 },
        { codigo: '6573ad27', nombre: 'LUCIO', apellido: 'CALIXTO PASTRANA', sueldo_base: 3500 },
        { codigo: '434621a5', nombre: 'JESUS', apellido: 'ONTIVEROS SUAREZ', sueldo_base: 3700 }
    ],
    GeoCycle: [
        { codigo: '4f4c873b', nombre: 'ELIODORO', apellido: 'GONZÁLEZ MARTÍNEZ', sueldo_base: 2900 },
        { codigo: 'cac946a7', nombre: 'JULIÁN ADOLFO', apellido: 'GARCÍA GÓMEZ', sueldo_base: 2300 },
        { codigo: '25f05ba7', nombre: 'JOSÉ RODRIGO', apellido: 'HERNÁNDEZ ROSAS', sueldo_base: 2900 },
        { codigo: '49746a77', nombre: 'JESÚS', apellido: 'ONTIVEROS SUÁREZ', sueldo_base: 3700 }, // DUPLICADO con 434621a5
        { codigo: '1c282440', nombre: 'ANTONIO GUADALUPE', apellido: 'RAMÍREZ ESCAREÑO', sueldo_base: 2300 },
        { codigo: '0a3f5613', nombre: 'Iker Ismael', apellido: 'Cervantes Muñiz', sueldo_base: 2300 },
        { codigo: '8892e3ce', nombre: 'DIEGO ESTEBAN', apellido: 'RAMOS JURADO', sueldo_base: 2300 },
        { codigo: 'eac38e1d', nombre: 'PABLO ENRIQUE', apellido: 'RODRÍGUEZ RAMÍREZ', sueldo_base: 2500 }, // DUPLICADO con d11d3a99
        { codigo: '3dd5d398', nombre: 'MARINO', apellido: 'ROMERO PALMERO', sueldo_base: 3000 },
        { codigo: '8f7a2b84', nombre: 'ANABEL', apellido: 'OCHOA GARCÍA', sueldo_base: 1800 },
        { codigo: '2247f2fa', nombre: 'LUZ MERCEDES', apellido: 'PUENTE MALDONADO', sueldo_base: 1800 },
        { codigo: 'b0402dba', nombre: 'William Axel', apellido: 'Gonzalez Rosales', sueldo_base: 2900 }
    ]
};

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada');
        procesarEmpleados();
    }
});

// Función para normalizar nombre (para detectar duplicados)
function normalizarNombre(nombre, apellido) {
    return (nombre + ' ' + apellido).toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .trim();
}

// Función para limpiar empleados existentes (mantener solo los que están en la lista)
function limpiarEmpleados(callback) {
    console.log('🧹 Limpiando empleados existentes...\n');
    
    // Obtener códigos válidos de la lista
    const codigosValidos = new Set();
    Object.values(empleadosData).forEach(areaEmpleados => {
        areaEmpleados.forEach(emp => {
            codigosValidos.add(emp.codigo);
        });
    });
    
    // Eliminar empleados que no están en la lista
    db.all('SELECT id, codigo, nombre, apellido FROM empleados WHERE activo = 1', [], (err, empleados) => {
        if (err) {
            return callback(err);
        }
        
        let eliminados = 0;
        let procesados = 0;
        
        if (empleados.length === 0) {
            return callback(null);
        }
        
        empleados.forEach(emp => {
            // Verificar si el código está en la lista válida
            const codigoLimpio = emp.codigo.replace(/[^a-f0-9]/gi, '').substring(0, 8);
            const estaEnLista = Array.from(codigosValidos).some(cod => emp.codigo === cod || codigoLimpio === cod);
            
            if (!estaEnLista) {
                db.run('UPDATE empleados SET activo = 0 WHERE id = ?', [emp.id], (err) => {
                    if (!err) {
                        eliminados++;
                        console.log(`  Eliminado: ${emp.nombre} ${emp.apellido} (${emp.codigo})`);
                    }
                    procesados++;
                    if (procesados === empleados.length) {
                        console.log(`\n✅ ${eliminados} empleados desactivados\n`);
                        callback(null);
                    }
                });
            } else {
                procesados++;
                if (procesados === empleados.length) {
                    console.log(`\n✅ ${eliminados} empleados desactivados\n`);
                    callback(null);
                }
            }
        });
    });
}

// Función para insertar o actualizar empleado
function insertarEmpleado(empleado, area, callback) {
    const nombreNormalizado = normalizarNombre(empleado.nombre, empleado.apellido);
    
    // Buscar si ya existe un empleado con el mismo código o nombre similar
    db.all(
        `SELECT id, codigo, nombre, apellido, area FROM empleados 
         WHERE codigo = ? OR (UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nombre || ' ' || apellido, 'Á', 'A'), 'É', 'E'), 'Í', 'I'), 'Ó', 'O'), 'Ú', 'U')) = ?)`,
        [empleado.codigo, nombreNormalizado],
        (err, existentes) => {
            if (err) {
                return callback(err);
            }
            
            if (existentes && existentes.length > 0) {
                // Empleado ya existe, actualizar código y datos si es necesario
                const existente = existentes[0];
                
                // Si el código es diferente, usar el código nuevo (preferir el más corto/limpio)
                const codigoFinal = existente.codigo.length > 8 ? empleado.codigo : existente.codigo;
                
                db.run(
                    `UPDATE empleados SET codigo = ?, nombre = ?, apellido = ?, area = ?, sueldo_base = ?, activo = 1 
                     WHERE id = ?`,
                    [codigoFinal, empleado.nombre, empleado.apellido, area, empleado.sueldo_base, existente.id],
                    (err) => {
                        if (err) {
                            console.error(`❌ Error al actualizar ${empleado.codigo}:`, err.message);
                            callback(err);
                        } else {
                            console.log(`🔄 Actualizado: ${empleado.nombre} ${empleado.apellido} (${codigoFinal}) - ${area} - $${empleado.sueldo_base}`);
                            callback(null, existente.id);
                        }
                    }
                );
            } else {
                // Insertar nuevo empleado
                db.run(
                    `INSERT INTO empleados (codigo, nombre, apellido, area, sueldo_base, activo)
                     VALUES (?, ?, ?, ?, ?, 1)`,
                    [empleado.codigo, empleado.nombre, empleado.apellido, area, empleado.sueldo_base],
                    function(err) {
                        if (err) {
                            if (err.message.includes('UNIQUE constraint')) {
                                // Código duplicado, buscar y actualizar
                                db.get('SELECT id FROM empleados WHERE codigo = ?', [empleado.codigo], (err, row) => {
                                    if (!err && row) {
                                        db.run(
                                            `UPDATE empleados SET nombre = ?, apellido = ?, area = ?, sueldo_base = ?, activo = 1 WHERE id = ?`,
                                            [empleado.nombre, empleado.apellido, area, empleado.sueldo_base, row.id],
                                            (err) => {
                                                if (err) callback(err);
                                                else {
                                                    console.log(`🔄 Actualizado (código duplicado): ${empleado.nombre} ${empleado.apellido} (${empleado.codigo})`);
                                                    callback(null, row.id);
                                                }
                                            }
                                        );
                                    } else {
                                        callback(err);
                                    }
                                });
                            } else {
                                console.error(`❌ Error al insertar ${empleado.codigo}:`, err.message);
                                callback(err);
                            }
                        } else {
                            console.log(`✅ Insertado: ${empleado.nombre} ${empleado.apellido} (${empleado.codigo}) - ${area} - $${empleado.sueldo_base}`);
                            callback(null, this.lastID);
                        }
                    }
                );
            }
        }
    );
}

// Función principal
function procesarEmpleados() {
    limpiarEmpleados((err) => {
        if (err) {
            console.error('❌ Error al limpiar:', err);
            db.close();
            process.exit(1);
        }
        
        console.log('📋 Procesando empleados...\n');
        
        // Combinar empleados duplicados: usar el código de Planta si existe en ambas áreas
        const empleadosUnicos = new Map();
        
        // Primero procesar Planta
        empleadosData.Planta.forEach(emp => {
            const key = normalizarNombre(emp.nombre, emp.apellido);
            empleadosUnicos.set(key, { ...emp, area: 'Planta' });
        });
        
        // Luego GeoCycle, pero solo si no existe en Planta
        empleadosData.GeoCycle.forEach(emp => {
            const key = normalizarNombre(emp.nombre, emp.apellido);
            if (!empleadosUnicos.has(key)) {
                empleadosUnicos.set(key, { ...emp, area: 'GeoCycle' });
            } else {
                // Duplicado encontrado, mantener el de Planta
                console.log(`⚠️  Duplicado detectado: ${emp.nombre} ${emp.apellido} - Se mantiene registro de Planta`);
            }
        });
        
        const empleadosFinales = Array.from(empleadosUnicos.values());
        console.log(`Total de empleados únicos: ${empleadosFinales.length}\n`);
        
        let procesados = 0;
        const total = empleadosFinales.length;
        
        empleadosFinales.forEach((empleado) => {
            insertarEmpleado(empleado, empleado.area, (err) => {
                procesados++;
                
                if (procesados === total) {
                    console.log(`\n✅ Proceso completado`);
                    
                    // Listar todos los empleados ordenados
                    db.all(
                        `SELECT codigo, nombre, apellido, area, sueldo_base 
                         FROM empleados 
                         WHERE activo = 1 
                         ORDER BY nombre, apellido`,
                        [],
                        (err, empleados) => {
                            if (!err) {
                                console.log('\n📋 LISTA DE EMPLEADOS (Ordenada alfabéticamente):\n');
                                empleados.forEach((emp, index) => {
                                    console.log(`${(index + 1).toString().padStart(2, '0')}. ${emp.nombre} ${emp.apellido} - ${emp.area} - $${emp.sueldo_base} - Código: ${emp.codigo}`);
                                });
                                console.log(`\nTotal: ${empleados.length} empleados`);
                            }
                            db.close();
                            process.exit(0);
                        }
                    );
                }
            });
        });
    });
}
