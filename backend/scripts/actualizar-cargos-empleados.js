const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

// Lista de empleados con cargos de la imagen (columna OCUPACIÓN)
const empleadosConCargos = [
    { nombre: 'JESUS', apellido: 'ONTIVEROS SUAREZ', cargo: 'AYUDANTE GENERAL' },
    { nombre: 'PABLO ENRIQUE', apellido: 'RODRIGUEZ RAMIREZ', cargo: 'AYUDANTE GENERAL' },
    { nombre: 'NESTOR RAFAEL', apellido: 'CORTES TORRES', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'JAIME EMMANUEL', apellido: 'ECHEVERRIA GARCIA', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'GUILLERMO', apellido: 'PONCE ALVARADO', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'RAMIRO', apellido: 'ROJAS AGUILAR', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'ALAN', apellido: 'MARMOLEJO MONTES', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'ELIODORO', apellido: 'GONZALEZ MARTINEZ', cargo: 'OPERADOR GEOCYCLE' },
    { nombre: 'WILLIAM AXEL', apellido: 'GONZALEZ ROSALES', cargo: 'OPERADOR GEOCYCLE' },
    { nombre: 'MARINO', apellido: 'ROMERO PALMEROS', cargo: 'AYUDANTE GEOCYCLE' },
    { nombre: 'JULIAN ADOLFO', apellido: 'GARCIA GOMEZ', cargo: 'AYUDANTE GEOCYCLE' },
    { nombre: 'ROGELIO', apellido: 'REGALADO CONTRERAS', cargo: 'AYUDANTE GENERAL' },
    { nombre: 'JOSÉ FRANCISCO', apellido: 'MARTINEZ HUERTA', cargo: 'SUPERVISOR GENERAL' },
    { nombre: 'JULIAN', apellido: 'MARTINEZ MAGAÑA', cargo: 'DIRECTOR OPERATIVO' },
    { nombre: 'JOSE FERNANDO', apellido: 'HERNANDEZ BEJARANO', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'IKER ISMAEL', apellido: 'CERVANTES MUÑIZ', cargo: 'AYUDANTE GEOCYCLE' },
    { nombre: 'CESAR DANIEL', apellido: 'ALCALA GARCIA', cargo: 'AYUDANTE GENERAL' },
    { nombre: 'IRMA MARGARITA', apellido: 'MONTAÑO ARREOLA', cargo: 'ALMACEN' },
    { nombre: 'JOSE RODRIGO', apellido: 'HERNANDEZ ROSAS', cargo: 'OPERADOR GEOCYCLE' },
    { nombre: 'SAMUEL', apellido: 'MEDINA GENORIMO', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'CARLOS ISMAEL', apellido: 'MORFIN SANDOVAL', cargo: 'AYUDANTE GEOCYCLE' },
    { nombre: 'LUZ MERCEDES', apellido: 'PUENTE MALDONADO', cargo: 'LIMPIEZA' },
    { nombre: 'ANTONIO GUADALUPE', apellido: 'RAMIREZ ESCAREÑO', cargo: 'AYUDANTE GEOCYCLE' },
    { nombre: 'DIEGO ESTEBAN', apellido: 'RAMOS JURADO', cargo: 'AYUDANTE GEOCYCLE' },
    { nombre: 'CHRISTIAN NOEL', apellido: 'SANCHEZ SOLANO', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'ERICK MANUEL', apellido: 'VALDOVINOS LLERENAS', cargo: 'UPERVISOR DE SEGURIDA' },
    { nombre: 'AMELIA', apellido: 'MARTINEZ HUERTA', cargo: 'DIRECTORA GENERAL' },
    { nombre: 'JOSÉ ALBERTO', apellido: 'BELTRAN GARCÍA', cargo: 'OFICIAL ALBAÑIL' },
    { nombre: 'EDY LEONEL', apellido: 'CAMARRO GONZALEZ', cargo: 'AYUDANTE GEOCYCLE' },
    { nombre: 'CHRISTIAN EMMANUEL', apellido: 'CASTREJON GARCIA', cargo: 'AYUDANTE GENERAL' },
    { nombre: 'JOSE EFREN', apellido: 'MARMOLEJO CERVANTES', cargo: 'OFICIAL ELECTRICO' },
    { nombre: 'RICARDO ALBERTO', apellido: 'MOTAÑO CRUZ', cargo: 'OFICIAL ALBAÑIL' },
    { nombre: 'PABLO ZAID', apellido: 'RODRIGUEZ MUÑIZ', cargo: 'AYUDANTE GEOCYCLE' }
];

// Función para normalizar nombres (minúsculas, sin acentos, sin espacios extras)
function normalizar(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Función para comparar nombres (flexible)
function nombresCoinciden(nombre1, apellido1, nombre2, apellido2) {
    const n1 = normalizar(`${nombre1} ${apellido1}`);
    const n2 = normalizar(`${nombre2} ${apellido2}`);
    
    // Coincidencia exacta
    if (n1 === n2) return true;
    
    // Verificar si uno contiene al otro
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Verificar palabras clave (primer nombre y primer apellido)
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
        console.error('❌ Error al conectar:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada\n');
        actualizarCargos();
    }
});

function actualizarCargos() {
    console.log('📋 Actualizando cargos de empleados...\n');
    
    db.all('SELECT id, nombre, apellido, cargo FROM empleados WHERE activo = 1', [], (err, empleadosBD) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        let actualizados = 0;
        let noEncontrados = 0;
        const promises = [];
        
        // Actualizar cargos para empleados que coincidan
        empleadosConCargos.forEach(empLista => {
            const encontrado = empleadosBD.find(empBD => 
                nombresCoinciden(empLista.nombre, empLista.apellido, empBD.nombre, empBD.apellido)
            );
            
            if (encontrado) {
                promises.push(new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE empleados SET cargo = ? WHERE id = ?`,
                        [empLista.cargo, encontrado.id],
                        function(updateErr) {
                            if (updateErr) {
                                console.error(`❌ Error al actualizar ${encontrado.nombre} ${encontrado.apellido}:`, updateErr.message);
                                reject(updateErr);
                            } else {
                                actualizados++;
                                console.log(`✅ ${encontrado.nombre} ${encontrado.apellido} -> ${empLista.cargo}`);
                                resolve();
                            }
                        }
                    );
                }));
            } else {
                noEncontrados++;
                console.log(`⚠️  No encontrado: ${empLista.nombre} ${empLista.apellido} - ${empLista.cargo}`);
            }
        });
        
        Promise.all(promises)
            .then(() => {
                console.log(`\n✅ Proceso completado:`);
                console.log(`   - Cargos actualizados: ${actualizados}`);
                console.log(`   - Empleados no encontrados en BD: ${noEncontrados}`);
                console.log(`   - Total en lista: ${empleadosConCargos.length}\n`);
                db.close();
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Error durante la actualización:', error);
                db.close();
                process.exit(1);
            });
    });
}

