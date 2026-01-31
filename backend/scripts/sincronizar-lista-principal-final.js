const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

// Lista PRINCIPAL de empleados con sueldos (de la tabla de sueldos)
const listaPrincipal = [
    { nombre: 'César Daniel', apellido: 'Alcalá García', sueldo: 3000 },
    { nombre: 'Irma Margarita', apellido: 'Arreola Montaño', sueldo: 2200 },
    { nombre: 'José Alberto', apellido: 'Beltran Garcia', sueldo: 4800 },
    { nombre: 'Lucio', apellido: 'Calixto Pastrana', sueldo: 3500 },
    { nombre: 'Christhian Emmanuel', apellido: 'Castrejon Garcia', sueldo: 2500 },
    { nombre: 'Iker Ismael', apellido: 'Cervantes Muñiz', sueldo: 2300 },
    { nombre: 'Nestor Rafael', apellido: 'Cortes Torres', sueldo: 5000 },
    { nombre: 'Jaime Emmanuel', apellido: 'Echeverria Garcia', sueldo: 5500 },
    { nombre: 'Gabriel Omar', apellido: 'Oriz Rincón', sueldo: 2300 },
    { nombre: 'Julian Adolfo', apellido: 'Garcia Gomez', sueldo: 2300 },
    { nombre: 'José Miguel', apellido: 'Gomez Ramos', sueldo: 2300 },
    { nombre: 'Eliodoro', apellido: 'González Martínez', sueldo: 2900 },
    { nombre: 'William Axel', apellido: 'Gonzalez Rosales', sueldo: 2900 },
    { nombre: 'José Rodrigo', apellido: 'Hernandez Rosas', sueldo: 2900 },
    { nombre: 'José Fernando', apellido: 'Hernández Bejarano', sueldo: 3000 },
    { nombre: 'Alan Daniel', apellido: 'Marmolejo Montes', sueldo: 3700 },
    { nombre: 'Isabel', apellido: 'Marmolejo', sueldo: 1500 },
    { nombre: 'José Francisco', apellido: 'Martinez Huerta', sueldo: 6000 },
    { nombre: 'Amelia', apellido: 'Martinez Huerta', sueldo: 6000 },
    { nombre: 'Samuel', apellido: 'Medina Geronimo', sueldo: 4300 },
    { nombre: 'Carlos Ismael', apellido: 'Morfin Sandoval', sueldo: 2300 },
    { nombre: 'José Ernesto', apellido: 'Murillo Pérez', sueldo: 2300 },
    { nombre: 'Maria Anabel', apellido: 'Ochoa Garcia', sueldo: 1800 },
    { nombre: 'Jesus', apellido: 'Ontiveros Suerez', sueldo: 3700 },
    { nombre: 'Guillermo', apellido: 'Ponce Alvarado', sueldo: 5000 },
    { nombre: 'Luz Mercedes', apellido: 'Puente Maldonado', sueldo: 1800 },
    { nombre: 'Antonio Guadalupe', apellido: 'Ramirez Escareño', sueldo: 2300 },
    { nombre: 'Diego Esteban', apellido: 'Ramos Jurado', sueldo: 2300 },
    { nombre: 'Rogelio', apellido: 'Regalado Contreras', sueldo: 2300 },
    { nombre: 'Pablo Enrique', apellido: 'Rodriguez Ramirez', sueldo: 2500 },
    { nombre: 'Ramiro', apellido: 'Rojas Aguilar', sueldo: 4000 },
    { nombre: 'Marino', apellido: 'Romero Palmero', sueldo: 3000 },
    { nombre: 'Miguel Angel', apellido: 'Sanchez Nava', sueldo: 3500 },
    { nombre: 'Christian Noel', apellido: 'Sánchez Solano', sueldo: 3000 },
    { nombre: 'Veronica', apellido: 'Solano Pulgarin', sueldo: 1800 },
    { nombre: 'Erick Manuel', apellido: 'Valdovinos Llerenas', sueldo: 3000 },
    { nombre: 'Abraham', apellido: 'Valencia', sueldo: 2900 }
];

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
    const nombreCompleto = (nombre + ' ' + apellido).toUpperCase()
        .replace(/Á/g, 'A')
        .replace(/É/g, 'E')
        .replace(/Í/g, 'I')
        .replace(/Ó/g, 'O')
        .replace(/Ú/g, 'U')
        .replace(/Ñ/g, 'N')
        .replace(/\s+/g, ' ')
        .trim();
    
    // Crear array de palabras y ordenarlas para comparación más flexible
    const palabras = nombreCompleto.split(' ').filter(p => p.length > 0);
    return palabras.sort().join(' ');
}

// Función para crear código (8 caracteres hexadecimales + nombre completo en mayúsculas)
function crearCodigo(nombre, apellido) {
    const nombreCompleto = `${nombre} ${apellido}`.toUpperCase();
    // Generar hash de 4 bytes (8 caracteres hexadecimales)
    const hash = crypto.createHash('md5').update(nombreCompleto + Date.now() + Math.random()).digest('hex').substring(0, 8);
    return hash + nombreCompleto;
}

// Función para encontrar empleado existente por nombre normalizado
function encontrarEmpleadoExistente(empleadosBD, nombreNorm) {
    for (const emp of empleadosBD) {
        const nombreBDNorm = normalizarNombre(emp.nombre, emp.apellido);
        if (nombreBDNorm === nombreNorm) {
            return emp;
        }
    }
    return null;
}

// Función principal
function procesarEmpleados() {
    console.log('📋 Sincronizando empleados con lista principal...\n');
    console.log(`Total en lista principal: ${listaPrincipal.length}\n`);
    
    // Obtener todos los empleados actuales
    db.all('SELECT id, codigo, nombre, apellido, area, sueldo_base, activo FROM empleados', [], (err, empleadosBD) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err);
            db.close();
            process.exit(1);
        }
        
        console.log(`Empleados en BD: ${empleadosBD.length}\n`);
        
        const empleadosMantenidos = new Set();
        const empleadosAEliminar = [];
        const empleadosAInsertar = [];
        const empleadosAActualizar = [];
        
        // Crear mapa de empleados de BD por nombre normalizado
        const mapaBD = new Map();
        empleadosBD.forEach(emp => {
            const key = normalizarNombre(emp.nombre, emp.apellido);
            mapaBD.set(key, emp);
        });
        
        // Procesar cada empleado de la lista principal
        listaPrincipal.forEach(empPrincipal => {
            const nombreNorm = normalizarNombre(empPrincipal.nombre, empPrincipal.apellido);
            const existente = mapaBD.get(nombreNorm);
            
            if (existente) {
                empleadosMantenidos.add(existente.id);
                
                // Verificar si necesita actualización
                if (existente.sueldo_base !== empPrincipal.sueldo || existente.activo !== 1) {
                    empleadosAActualizar.push({
                        id: existente.id,
                        nombre: empPrincipal.nombre,
                        apellido: empPrincipal.apellido,
                        sueldo: empPrincipal.sueldo,
                        codigo: existente.codigo // Mantener código existente
                    });
                }
            } else {
                empleadosAInsertar.push(empPrincipal);
            }
        });
        
        // Identificar empleados a eliminar (no están en lista principal)
        empleadosBD.forEach(empBD => {
            if (!empleadosMantenidos.has(empBD.id)) {
                empleadosAEliminar.push(empBD);
            }
        });
        
        let operacionesCompletadas = 0;
        const totalOperaciones = empleadosAEliminar.length + empleadosAInsertar.length + empleadosAActualizar.length;
        
        function verificarFinalizacion() {
            operacionesCompletadas++;
            if (operacionesCompletadas === totalOperaciones) {
                setTimeout(finalizar, 500);
            }
        }
        
        // Eliminar empleados que no están en lista principal
        if (empleadosAEliminar.length > 0) {
            console.log(`🗑️  Eliminando ${empleadosAEliminar.length} empleados que no están en lista principal:\n`);
            empleadosAEliminar.forEach(emp => {
                db.run('UPDATE empleados SET activo = 0 WHERE id = ?', [emp.id], (err) => {
                    if (!err) {
                        console.log(`  ❌ Desactivado: ${emp.nombre} ${emp.apellido} (${emp.codigo.substring(0, 8)}...)`);
                    }
                    verificarFinalizacion();
                });
            });
        }
        
        // Actualizar empleados existentes
        if (empleadosAActualizar.length > 0) {
            console.log(`\n💰 Actualizando ${empleadosAActualizar.length} empleados:\n`);
            empleadosAActualizar.forEach(emp => {
                db.run(
                    'UPDATE empleados SET nombre = ?, apellido = ?, sueldo_base = ?, activo = 1 WHERE id = ?',
                    [emp.nombre, emp.apellido, emp.sueldo, emp.id],
                    (err) => {
                        if (!err) {
                            console.log(`  💰 Actualizado: ${emp.nombre} ${emp.apellido} - $${emp.sueldo} (código: ${emp.codigo.substring(0, 8)}...)`);
                        } else {
                            console.error(`  ❌ Error al actualizar ${emp.nombre}:`, err.message);
                        }
                        verificarFinalizacion();
                    }
                );
            });
        }
        
        // Insertar nuevos empleados
        if (empleadosAInsertar.length > 0) {
            console.log(`\n✅ Insertando ${empleadosAInsertar.length} nuevos empleados:\n`);
            empleadosAInsertar.forEach(emp => {
                const codigo = crearCodigo(emp.nombre, emp.apellido);
                const area = 'Planta'; // Por defecto
                
                db.run(
                    `INSERT INTO empleados (codigo, nombre, apellido, area, sueldo_base, activo)
                     VALUES (?, ?, ?, ?, ?, 1)`,
                    [codigo, emp.nombre, emp.apellido, area, emp.sueldo],
                    function(err) {
                        if (!err) {
                            console.log(`  ✅ Insertado: ${emp.nombre} ${emp.apellido} - $${emp.sueldo} - Código: ${codigo.substring(0, 8)}...`);
                        } else {
                            console.error(`  ❌ Error al insertar ${emp.nombre}:`, err.message);
                        }
                        verificarFinalizacion();
                    }
                );
            });
        }
        
        if (totalOperaciones === 0) {
            finalizar();
        }
    });
}

function finalizar() {
    setTimeout(() => {
        // Listar todos los empleados activos ordenados
        db.all(
            `SELECT codigo, nombre, apellido, area, sueldo_base 
             FROM empleados 
             WHERE activo = 1 
             ORDER BY nombre, apellido`,
            [],
            (err, empleados) => {
                if (!err) {
                    console.log('\n📋 LISTA FINAL DE EMPLEADOS (Ordenada alfabéticamente):\n');
                    empleados.forEach((emp, index) => {
                        const codigoCorto = emp.codigo.length > 8 ? emp.codigo.substring(0, 8) : emp.codigo;
                        console.log(`${(index + 1).toString().padStart(2, '0')}. ${emp.nombre} ${emp.apellido} - ${emp.area} - $${emp.sueldo_base} - Código: ${codigoCorto}...`);
                    });
                    console.log(`\nTotal: ${empleados.length} empleados activos`);
                }
                db.close();
                process.exit(0);
            }
        );
    }, 500);
}

