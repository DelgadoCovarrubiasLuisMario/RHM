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

// Mapeo de códigos existentes (de las listas de Planta/Geocycle)
// Estos son los códigos que ya tienen asignados
const codigosExistentes = {
    // Planta
    'NESTOR RAFAEL CORTES TORRES': 'e07833e2NESTOR RAFAEL CORTES TORRES',
    'RAMIRO ROJAS AGUILAR': '4e92dc82RAMIRO ROJAS AGUILAR',
    'IRMA MARGARITA ARREOLA MONTAÑO': '121662dcIRMA MARGARITA ARREOLA MONTAÑO',
    'GUILLERMO ALVARADO PONCE': '0236a7ccGUILLERMO ALVARADO PONCE',
    'SAMUEL GERONIMO MEDINA': 'de3ed8ecSAMUEL GERONIMO MEDINA',
    'ALAN MONTES MARMOLEJO': '015ae7dcALAN MONTES MARMOLEJO',
    'CESAR ALCALÁ GARCIA': '924f3bf5CESAR ALCALÁ GARCIA',
    'JOSÉ BEJARANO HERNÁNDEZ': 'f3fb78c1JOSÉ BEJARANO HERNÁNDEZ',
    'CHRISTIAN SÁNCHEZ SOLANO': 'cc6345caCHRISTIAN SÁNCHEZ SOLANO',
    'ERICK LLERENAS VALDOVINOS': 'c79a9c67ERICK LLERENAS VALDOVINOS',
    'JAIME GARCÍA ECHEVERRÍA': '61652422JAIME GARCÍA ECHEVERRÍA',
    'ROGELIO CONTRERAS REGALADO': '2a0ca8abROGELIO CONTRERAS REGALADO',
    'PABLO ENRIQUE RODRIGUEZ RAMIREZ': 'd11d3a99PABLO ENRIQUE RODRIGUEZ RAMIREZ',
    'LUCIO CALIXTO PASTRANA': '6573ad27LUCIO CALIXTO PASTRANA',
    'JESUS ONTIVEROS SUAREZ': '434621a5JESUS ONTIVEROS SUAREZ',
    // GeoCycle
    'ELIODORO GONZÁLEZ MARTÍNEZ': '4f4c873bELIODORO GONZÁLEZ MARTÍNEZ',
    'JULIÁN ADOLFO GARCÍA GÓMEZ': 'cac946a7JULIÁN ADOLFO GARCÍA GÓMEZ',
    'JOSÉ RODRIGO HERNÁNDEZ ROSAS': '25f05ba7JOSÉ RODRIGO HERNÁNDEZ ROSAS',
    'JESÚS ONTIVEROS SUÁREZ': '49746a77JESÚS ONTIVEROS SUÁREZ',
    'ANTONIO GUADALUPE RAMÍREZ ESCAREÑO': '1c282440ANTONIO GUADALUPE RAMÍREZ ESCAREÑO',
    'Iker Ismael Cervantes Muñiz': '0a3f5613Iker Ismael Cervantes Muñiz',
    'DIEGO ESTEBAN RAMOS JURADO': '8892e3ceDIEGO ESTEBAN RAMOS JURADO',
    'PABLO ENRIQUE RODRÍGUEZ RAMÍREZ': 'eac38e1dPABLO ENRIQUE RODRÍGUEZ RAMÍREZ',
    'MARINO ROMERO PALMERO': '3dd5d398MARINO ROMERO PALMERO',
    'ANABEL OCHOA GARCÍA': '8f7a2b84ANABEL OCHOA GARCÍA',
    'LUZ MERCEDES PUENTE MALDONADO': '2247f2faLUZ MERCEDES PUENTE MALDONADO',
    'William Axel Gonzalez Rosales': 'b0402dbaWilliam Axel Gonzalez Rosales'
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

// Función para generar código único (8 caracteres hexadecimales + nombre completo)
function generarCodigo(nombre, apellido) {
    const nombreCompleto = `${nombre} ${apellido}`.toUpperCase();
    // Generar hash de 4 bytes (8 caracteres hexadecimales)
    const hash = crypto.createHash('md5').update(nombreCompleto + Date.now()).digest('hex').substring(0, 8);
    return hash + nombreCompleto;
}

// Función para buscar código existente
function buscarCodigoExistente(nombre, apellido) {
    const nombreNorm = normalizarNombre(nombre, apellido);
    
    // Buscar en el mapeo por nombre normalizado
    for (const [key, codigo] of Object.entries(codigosExistentes)) {
        if (normalizarNombre('', key) === nombreNorm || normalizarNombre(key.split(' ')[0], key.split(' ').slice(1).join(' ')) === nombreNorm) {
            return codigo;
        }
    }
    
    // Buscar coincidencias parciales
    for (const [key, codigo] of Object.entries(codigosExistentes)) {
        const keyNorm = normalizarNombre('', key);
        if (keyNorm.includes(nombreNorm) || nombreNorm.includes(keyNorm)) {
            return codigo;
        }
    }
    
    return null;
}

// Función principal
function procesarEmpleados() {
    console.log('📋 Sincronizando empleados con lista principal...\n');
    console.log(`Total en lista principal: ${listaPrincipal.length}\n`);
    
    // Crear mapa de empleados de la lista principal (normalizados)
    const mapaPrincipal = new Map();
    listaPrincipal.forEach(emp => {
        const key = normalizarNombre(emp.nombre, emp.apellido);
        mapaPrincipal.set(key, emp);
    });
    
    // Obtener todos los empleados actuales
    db.all('SELECT id, codigo, nombre, apellido, area, sueldo_base, activo FROM empleados', [], (err, empleadosActuales) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err);
            db.close();
            process.exit(1);
        }
        
        console.log(`Empleados en BD: ${empleadosActuales.length}\n`);
        
        const empleadosAMantener = new Set();
        const empleadosAEliminar = [];
        
        // Procesar cada empleado de la lista principal
        const empleadosAInsertar = [];
        
        listaPrincipal.forEach(empPrincipal => {
            const keyNorm = normalizarNombre(empPrincipal.nombre, empPrincipal.apellido);
            let encontrado = false;
            
            // Buscar en empleados actuales
            empleadosActuales.forEach(empActual => {
                const keyActual = normalizarNombre(empActual.nombre, empActual.apellido);
                if (keyActual === keyNorm) {
                    encontrado = true;
                    empleadosAMantener.add(empActual.id);
                    
                    // Actualizar sueldo si es diferente
                    if (empActual.sueldo_base !== empPrincipal.sueldo) {
                        db.run(
                            'UPDATE empleados SET sueldo_base = ?, activo = 1 WHERE id = ?',
                            [empPrincipal.sueldo, empActual.id],
                            (err) => {
                                if (err) {
                                    console.error(`❌ Error al actualizar sueldo de ${empPrincipal.nombre}:`, err);
                                } else {
                                    console.log(`💰 Actualizado sueldo: ${empPrincipal.nombre} ${empPrincipal.apellido} - $${empPrincipal.sueldo}`);
                                }
                            }
                        );
                    } else {
                        // Asegurar que esté activo
                        db.run('UPDATE empleados SET activo = 1 WHERE id = ?', [empActual.id], () => {});
                    }
                }
            });
            
            if (!encontrado) {
                empleadosAInsertar.push(empPrincipal);
            }
        });
        
        // Identificar empleados a eliminar (no están en lista principal)
        empleadosActuales.forEach(empActual => {
            if (!empleadosAMantener.has(empActual.id)) {
                empleadosAEliminar.push(empActual);
            }
        });
        
        // Eliminar empleados que no están en lista principal
        if (empleadosAEliminar.length > 0) {
            console.log(`\n🗑️  Eliminando ${empleadosAEliminar.length} empleados que no están en lista principal:\n`);
            empleadosAEliminar.forEach(emp => {
                db.run('UPDATE empleados SET activo = 0 WHERE id = ?', [emp.id], (err) => {
                    if (!err) {
                        console.log(`  ❌ Desactivado: ${emp.nombre} ${emp.apellido} (${emp.codigo})`);
                    }
                });
            });
        }
        
        // Insertar nuevos empleados
        if (empleadosAInsertar.length > 0) {
            console.log(`\n✅ Insertando ${empleadosAInsertar.length} nuevos empleados:\n`);
            
            let insertados = 0;
            empleadosAInsertar.forEach(emp => {
                // Buscar código existente o generar uno nuevo
                let codigo = buscarCodigoExistente(emp.nombre, emp.apellido);
                if (!codigo) {
                    codigo = generarCodigo(emp.nombre, emp.apellido);
                }
                
                // Determinar área (por defecto Planta, pero podemos intentar detectar)
                let area = 'Planta'; // Por defecto
                
                // Insertar empleado
                db.run(
                    `INSERT INTO empleados (codigo, nombre, apellido, area, sueldo_base, activo)
                     VALUES (?, ?, ?, ?, ?, 1)`,
                    [codigo, emp.nombre, emp.apellido, area, emp.sueldo],
                    function(err) {
                        if (err) {
                            console.error(`❌ Error al insertar ${emp.nombre}:`, err.message);
                        } else {
                            console.log(`✅ Insertado: ${emp.nombre} ${emp.apellido} - $${emp.sueldo} - Código: ${codigo.substring(0, 8)}...`);
                        }
                        insertados++;
                        if (insertados === empleadosAInsertar.length) {
                            finalizar();
                        }
                    }
                );
            });
        } else {
            setTimeout(finalizar, 1000); // Dar tiempo a que se completen las actualizaciones
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
                        const codigoCorto = emp.codigo.substring(0, 8);
                        console.log(`${(index + 1).toString().padStart(2, '0')}. ${emp.nombre} ${emp.apellido} - ${emp.area} - $${emp.sueldo_base} - Código: ${codigoCorto}...`);
                    });
                    console.log(`\nTotal: ${empleados.length} empleados activos`);
                }
                db.close();
                process.exit(0);
            }
        );
    }, 2000);
}

