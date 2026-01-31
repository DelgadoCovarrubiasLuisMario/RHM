const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

function normalizar(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Los 33 empleados que SÍ deben tener datos (de la imagen)
const empleadosValidos = [
    { nombre: 'JESUS', apellido: 'ONTIVEROS SUAREZ' },
    { nombre: 'PABLO ENRIQUE', apellido: 'RODRIGUEZ RAMIREZ' },
    { nombre: 'NESTOR RAFAEL', apellido: 'CORTES TORRES' },
    { nombre: 'JAIME EMMANUEL', apellido: 'ECHEVERRIA GARCIA' },
    { nombre: 'GUILLERMO', apellido: 'PONCE ALVARADO' },
    { nombre: 'RAMIRO', apellido: 'ROJAS AGUILAR' },
    { nombre: 'ALAN', apellido: 'MARMOLEJO MONTES' },
    { nombre: 'ELIODORO', apellido: 'GONZALEZ MARTINEZ' },
    { nombre: 'WILLIAM AXEL', apellido: 'GONZALEZ ROSALES' },
    { nombre: 'MARINO', apellido: 'ROMERO PALMEROS' },
    { nombre: 'JULIAN ADOLFO', apellido: 'GARCIA GOMEZ' },
    { nombre: 'ROGELIO', apellido: 'REGALADO CONTRERAS' },
    { nombre: 'JOSÉ FRANCISCO', apellido: 'MARTINEZ HUERTA' },
    { nombre: 'JOSE FERNANDO', apellido: 'HERNANDEZ BEJARANO' },
    { nombre: 'IKER ISMAEL', apellido: 'CERVANTES MUÑIZ' },
    { nombre: 'CESAR DANIEL', apellido: 'ALCALA GARCIA' },
    { nombre: 'IRMA MARGARITA', apellido: 'MONTAÑO ARREOLA' },
    { nombre: 'JOSE RODRIGO', apellido: 'HERNANDEZ ROSAS' },
    { nombre: 'SAMUEL', apellido: 'MEDINA GENORIMO' },
    { nombre: 'CARLOS ISMAEL', apellido: 'MORFIN SANDOVAL' },
    { nombre: 'LUZ MERCEDES', apellido: 'PUENTE MALDONADO' },
    { nombre: 'ANTONIO GUADALUPE', apellido: 'RAMIREZ ESCAREÑO' },
    { nombre: 'DIEGO ESTEBAN', apellido: 'RAMOS JURADO' },
    { nombre: 'CHRISTIAN NOEL', apellido: 'SANCHEZ SOLANO' },
    { nombre: 'ERICK MANUEL', apellido: 'VALDOVINOS LLERENAS' },
    { nombre: 'AMELIA', apellido: 'MARTINEZ HUERTA' },
    { nombre: 'JOSÉ ALBERTO', apellido: 'BELTRAN GARCÍA' },
    { nombre: 'CHRISTIAN EMMANUEL', apellido: 'CASTREJON GARCIA' }
    // NOTA: Estos NO están en la BD, así que no tienen datos:
    // - JULIAN MARTINEZ MAGAÑA
    // - EDY LEONEL CAMARRO GONZALEZ
    // - JOSE EFREN MARMOLEJO CERVANTES
    // - RICARDO ALBERTO MOTAÑO CRUZ
    // - PABLO ZAID RODRIGUEZ MUÑIZ
];

function nombresCoinciden(nombre1, apellido1, nombre2, apellido2) {
    const n1 = normalizar(`${nombre1} ${apellido1}`);
    const n2 = normalizar(`${nombre2} ${apellido2}`);
    
    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    const palabras1 = n1.split(' ');
    const palabras2 = n2.split(' ');
    if (palabras1.length > 0 && palabras2.length > 0) {
        if (palabras1[0] === palabras2[0] && 
            palabras1[palabras1.length - 1] === palabras2[palabras2.length - 1]) {
            return true;
        }
    }
    
    return false;
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada\n');
        limpiarDatosIncorrectos();
    }
});

function limpiarDatosIncorrectos() {
    console.log('🧹 Limpiando datos de empleados que NO están en la lista de 33...\n');
    
    db.all('SELECT id, nombre, apellido FROM empleados WHERE activo = 1', [], (err, todosEmpleados) => {
        if (err) {
            console.error('❌ Error:', err.message);
            db.close();
            return;
        }
        
        db.all(`
            SELECT e.id, e.nombre, e.apellido, em.id as examen_id
            FROM empleados e
            INNER JOIN examenes_medicos em ON e.id = em.empleado_id
            WHERE e.activo = 1
        `, [], (err, empleadosConDatos) => {
            if (err) {
                console.error('❌ Error:', err.message);
                db.close();
                return;
            }
            
            let limpiados = 0;
            const promises = [];
            
            empleadosConDatos.forEach(empConDatos => {
                // Verificar si este empleado está en la lista de válidos
                const esValido = empleadosValidos.some(valido =>
                    nombresCoinciden(valido.nombre, valido.apellido, empConDatos.nombre, empConDatos.apellido)
                );
                
                if (!esValido) {
                    console.log(`🗑️  Limpiando datos de: ${empConDatos.nombre} ${empConDatos.apellido}`);
                    promises.push(new Promise((resolve, reject) => {
                        db.run(
                            `UPDATE examenes_medicos 
                             SET quimica_sanguinea = 0,
                                 antidoping = 0,
                                 electrocardiogram = 0,
                                 espirometrias = 0,
                                 audiometrias = 0,
                                 vigencia_de = NULL,
                                 fecha_nacimiento = NULL,
                                 vence_induccion = NULL,
                                 mandar_a_curso = NULL
                             WHERE empleado_id = ?`,
                            [empConDatos.id],
                            function(updateErr) {
                                if (updateErr) {
                                    console.error(`   ❌ Error:`, updateErr.message);
                                    reject(updateErr);
                                } else {
                                    limpiados++;
                                    console.log(`   ✅ Limpiado`);
                                    resolve();
                                }
                            }
                        );
                    }));
                }
            });
            
            Promise.all(promises)
                .then(() => {
                    console.log(`\n✅ Proceso completado: ${limpiados} registros limpiados`);
                    db.close();
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('❌ Error durante el proceso:', error);
                    db.close();
                    process.exit(1);
                });
        });
    });
}
