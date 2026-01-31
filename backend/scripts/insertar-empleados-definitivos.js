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
        insertarEmpleados();
    }
});

// Función para crear código (8 caracteres hexadecimales + nombre completo en mayúsculas)
function crearCodigo(nombre, apellido) {
    const nombreCompleto = `${nombre} ${apellido}`.toUpperCase();
    // Generar hash de 4 bytes (8 caracteres hexadecimales)
    // Usar un seed más estable basado en el nombre
    const hash = crypto.createHash('md5').update(nombreCompleto).digest('hex').substring(0, 8);
    return hash + nombreCompleto;
}

// Función para insertar empleados
function insertarEmpleados() {
    console.log('📋 Insertando empleados...\n');
    console.log(`Total a insertar: ${listaPrincipal.length}\n`);
    
    let insertados = 0;
    let errores = 0;
    
    listaPrincipal.forEach((emp, index) => {
        const codigo = crearCodigo(emp.nombre, emp.apellido);
        const area = 'Planta'; // Por defecto, se puede cambiar después
        
        db.run(
            `INSERT INTO empleados (codigo, nombre, apellido, area, sueldo_base, activo)
             VALUES (?, ?, ?, ?, ?, 1)`,
            [codigo, emp.nombre, emp.apellido, area, emp.sueldo],
            function(err) {
                if (err) {
                    console.error(`❌ Error al insertar ${emp.nombre} ${emp.apellido}:`, err.message);
                    errores++;
                } else {
                    const codigoCorto = codigo.substring(0, 8);
                    console.log(`${(index + 1).toString().padStart(2, '0')}. ✅ ${emp.nombre} ${emp.apellido} - $${emp.sueldo} - Código: ${codigoCorto}...`);
                    insertados++;
                }
                
                if (insertados + errores === listaPrincipal.length) {
                    console.log(`\n✅ Proceso completado`);
                    console.log(`   Insertados: ${insertados}`);
                    console.log(`   Errores: ${errores}`);
                    
                    // Listar todos los empleados ordenados
                    db.all(
                        `SELECT codigo, nombre, apellido, area, sueldo_base 
                         FROM empleados 
                         WHERE activo = 1 
                         ORDER BY nombre, apellido`,
                        [],
                        (err, empleados) => {
                            if (!err) {
                                console.log(`\n📋 Total de empleados en BD: ${empleados.length}`);
                            }
                            db.close();
                            process.exit(0);
                        }
                    );
                }
            }
        );
    });
}

