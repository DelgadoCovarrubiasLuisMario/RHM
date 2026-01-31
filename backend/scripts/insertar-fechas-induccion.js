const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

// Datos completos de la imagen
const datosCompletos = [
    { nombre: 'JESUS', apellido: 'ONTIVEROS SUAREZ', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '29/07/2026', nacimiento: '22/08/2002', vence: '18/01/2026', curso: '14/01/2026' },
    { nombre: 'PABLO ENRIQUE', apellido: 'RODRIGUEZ RAMIREZ', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '19/06/2026', nacimiento: '30/11/2005', vence: '15/01/2026', curso: '14/01/2026' },
    { nombre: 'NESTOR RAFAEL', apellido: 'CORTES TORRES', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '12/08/1987', vence: '24/06/2026', curso: '17/06/2026' },
    { nombre: 'JAIME EMMANUEL', apellido: 'ECHEVERRIA GARCIA', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '09/09/2026', nacimiento: '19/06/1990', vence: '08/04/2026', curso: '01/04/2026' },
    { nombre: 'GUILLERMO', apellido: 'PONCE ALVARADO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '23/07/2026', nacimiento: '23/02/1998', vence: '10/06/2026', curso: '03/06/2026' },
    { nombre: 'RAMIRO', apellido: 'ROJAS AGUILAR', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '23/07/2026', nacimiento: '14/12/1999', vence: '23/07/2026', curso: '15/07/2026' },
    { nombre: 'ALAN', apellido: 'MARMOLEJO MONTES', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '31/10/2026', nacimiento: '20/09/2005', vence: '31/01/2026', curso: '28/01/2026' },
    { nombre: 'ELIODORO', apellido: 'GONZALEZ MARTINEZ', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '01/02/2026', nacimiento: '06/04/1966', vence: '30/01/2026', curso: '28/01/2026' },
    { nombre: 'WILLIAM AXEL', apellido: 'GONZALEZ ROSALES', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '21/07/2026', nacimiento: '18/12/1999', vence: '11/02/2026', curso: '04/02/2026' },
    { nombre: 'MARINO', apellido: 'ROMERO PALMEROS', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '21/07/2026', nacimiento: '26/12/1979', vence: '30/01/2026', curso: '28/01/2026' },
    { nombre: 'JULIAN ADOLFO', apellido: 'GARCIA GOMEZ', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '21/07/2026', nacimiento: '20/08/2004', vence: '24/03/2026', curso: '18/03/2026' },
    { nombre: 'ROGELIO', apellido: 'REGALADO CONTRERAS', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 0, vigencia: '13/05/2026', nacimiento: '16/09/1970', vence: '30/01/2026', curso: '28/01/2026' },
    { nombre: 'JOSÉ FRANCISCO', apellido: 'MARTINEZ HUERTA', quimica: 1, antidoping: 1, electro: 1, espiro: 0, audio: 0, vigencia: '09/01/2027', nacimiento: '09/01/1998', vence: '24/03/2026', curso: '18/03/2026' },
    { nombre: 'JULIAN', apellido: 'MARTINEZ MAGAÑA', quimica: 1, antidoping: 1, electro: 1, espiro: 0, audio: 0, vigencia: '03/12/2026', nacimiento: '30/07/1965', vence: '30/01/2026', curso: '28/01/2026' },
    { nombre: 'JOSE FERNANDO', apellido: 'HERNANDEZ BEJARANO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '30/05/1983', vence: '19/05/2026', curso: '13/05/2026' },
    { nombre: 'IKER ISMAEL', apellido: 'CERVANTES MUÑIZ', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '18/11/2026', nacimiento: '15/02/2005', vence: '25/05/2026', curso: '20/05/2026' },
    { nombre: 'CESAR DANIEL', apellido: 'ALCALA GARCIA', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '18/11/2026', nacimiento: '26/09/2005', vence: '12/05/2026', curso: '06/05/2026' },
    { nombre: 'IRMA MARGARITA', apellido: 'MONTAÑO ARREOLA', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '04/02/2026', nacimiento: '03/06/2006', vence: '25/05/2026', curso: '20/05/2026' },
    { nombre: 'JOSE RODRIGO', apellido: 'HERNANDEZ ROSAS', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '13/05/2026', nacimiento: '11/11/1993', vence: '25/05/2026', curso: '20/05/2026' },
    { nombre: 'SAMUEL', apellido: 'MEDINA GENORIMO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '18/12/2026', nacimiento: '07/02/1994', vence: '10/06/2026', curso: '03/06/2026' },
    { nombre: 'CARLOS ISMAEL', apellido: 'MORFIN SANDOVAL', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '11/11/2026', nacimiento: '18/03/2003', vence: '12/05/2026', curso: '05/05/2026' },
    { nombre: 'LUZ MERCEDES', apellido: 'PUENTE MALDONADO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 0, vigencia: '12/03/2026', nacimiento: '03/08/1971', vence: '03/03/2026', curso: '25/03/2026' },
    { nombre: 'ANTONIO GUADALUPE', apellido: 'RAMIREZ ESCAREÑO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '06/09/2026', nacimiento: '29/03/1988', vence: '29/03/2026', curso: '25/03/2026' },
    { nombre: 'DIEGO ESTEBAN', apellido: 'RAMOS JURADO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '03/03/2026', nacimiento: '24/02/2006', vence: '02/06/2026', curso: '27/05/2026' },
    { nombre: 'CHRISTIAN NOEL', apellido: 'SANCHEZ SOLANO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '02/12/2026', nacimiento: '21/08/2006', vence: '03/06/2026', curso: '27/05/2026' },
    { nombre: 'ERICK MANUEL', apellido: 'VALDOVINOS LLERENAS', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '12/08/2002', vence: '30/01/2026', curso: '28/01/2026' },
    { nombre: 'AMELIA', apellido: 'MARTINEZ HUERTA', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 0, vigencia: '01/07/2026', nacimiento: '25/11/1999', vence: '06/02/2026', curso: '04/02/2026' },
    { nombre: 'JOSÉ ALBERTO', apellido: 'BELTRAN GARCÍA', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '17/09/2026', nacimiento: '25/11/1999', vence: '29/04/2026', curso: '22/04/2026' },
    { nombre: 'EDY LEONEL', apellido: 'CAMARRO GONZALEZ', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '26/12/2026', nacimiento: '21/06/2007', vence: '24/06/2026', curso: '17/06/2026' },
    { nombre: 'CHRISTIAN EMMANUEL', apellido: 'CASTREJON GARCIA', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '18/07/2002', vence: '04/01/2026', curso: '' },
    { nombre: 'JOSE EFREN', apellido: 'MARMOLEJO CERVANTES', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '30/12/2026', nacimiento: '22/04/1996', vence: '02/06/2026', curso: '27/05/2026' },
    { nombre: 'RICARDO ALBERTO', apellido: 'MOTAÑO CRUZ', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '30/12/2026', nacimiento: '06/06/1991', vence: '02/06/2026', curso: '27/05/2026' },
    { nombre: 'PABLO ZAID', apellido: 'RODRIGUEZ MUÑIZ', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '22/12/2026', nacimiento: '20/11/2007', vence: '24/06/2026', curso: '17/06/2026' }
];

// Función para normalizar nombres
function normalizar(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Mapeo de nombres con variaciones conocidas
const mapeoNombres = {
    'jesus ontiveros suarez': 'jesus ontiveros suerez',
    'irma margarita montaño arreola': 'irma margarita arreola montaño',
    'samuel medina genorimo': 'samuel medina geronimo',
    'christian emmanuel castrejon garcia': 'christhian emmanuel castrejon garcia'
};

// Función para comparar nombres (flexible)
function nombresCoinciden(nombre1, apellido1, nombre2, apellido2) {
    const n1 = normalizar(`${nombre1} ${apellido1}`);
    const n2 = normalizar(`${nombre2} ${apellido2}`);
    
    // Verificar mapeo directo
    if (mapeoNombres[n1] === n2 || mapeoNombres[n2] === n1) return true;
    
    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Comparar sin considerar orden de apellidos
    const palabras1 = n1.split(' ').sort();
    const palabras2 = n2.split(' ').sort();
    if (palabras1.length === palabras2.length) {
        const todasCoinciden = palabras1.every((pal, idx) => pal === palabras2[idx]);
        if (todasCoinciden) return true;
    }
    
    // Comparar primer nombre y último apellido
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
        insertarDatos();
    }
});

function insertarDatos() {
    console.log('📋 Insertando datos de exámenes y fechas...\n');
    
    db.all('SELECT id, nombre, apellido FROM empleados WHERE activo = 1', [], (err, empleadosBD) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        let actualizados = 0;
        const promises = [];
        
        datosCompletos.forEach(dato => {
            const encontrado = empleadosBD.find(empBD => 
                nombresCoinciden(dato.nombre, dato.apellido, empBD.nombre, empBD.apellido)
            );
            
            if (encontrado) {
                promises.push(new Promise((resolve, reject) => {
                    db.get('SELECT id FROM examenes_medicos WHERE empleado_id = ?', [encontrado.id], (err, row) => {
                        if (err) {
                            console.error(`❌ Error al verificar ${encontrado.nombre}:`, err.message);
                            reject(err);
                            return;
                        }
                        
                        if (row) {
                            // Actualizar registro existente
                            db.run(
                                `UPDATE examenes_medicos 
                                 SET quimica_sanguinea = ?,
                                     antidoping = ?,
                                     electrocardiogram = ?,
                                     espirometrias = ?,
                                     audiometrias = ?,
                                     vigencia_de = ?,
                                     fecha_nacimiento = ?,
                                     vence_induccion = ?,
                                     mandar_a_curso = ?
                                 WHERE empleado_id = ?`,
                                [
                                    dato.quimica,
                                    dato.antidoping,
                                    dato.electro,
                                    dato.espiro,
                                    dato.audio,
                                    dato.vigencia || null,
                                    dato.nacimiento || null,
                                    dato.vence || null,
                                    dato.curso || null,
                                    encontrado.id
                                ],
                                function(updateErr) {
                                    if (updateErr) {
                                        console.error(`❌ Error al actualizar ${encontrado.nombre}:`, updateErr.message);
                                        reject(updateErr);
                                    } else {
                                        actualizados++;
                                        console.log(`✅ ${encontrado.nombre} ${encontrado.apellido}`);
                                        resolve();
                                    }
                                }
                            );
                        } else {
                            // Insertar nuevo registro
                            db.run(
                                `INSERT INTO examenes_medicos 
                                 (empleado_id, quimica_sanguinea, antidoping, electrocardiogram, espirometrias, audiometrias,
                                  vigencia_de, fecha_nacimiento, vence_induccion, mandar_a_curso)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    encontrado.id,
                                    dato.quimica,
                                    dato.antidoping,
                                    dato.electro,
                                    dato.espiro,
                                    dato.audio,
                                    dato.vigencia || null,
                                    dato.nacimiento || null,
                                    dato.vence || null,
                                    dato.curso || null
                                ],
                                function(insertErr) {
                                    if (insertErr) {
                                        console.error(`❌ Error al insertar ${encontrado.nombre}:`, insertErr.message);
                                        reject(insertErr);
                                    } else {
                                        actualizados++;
                                        console.log(`✅ ${encontrado.nombre} ${encontrado.apellido}`);
                                        resolve();
                                    }
                                }
                            );
                        }
                    });
                }));
            } else {
                console.log(`⚠️  No encontrado: ${dato.nombre} ${dato.apellido}`);
            }
        });
        
        Promise.all(promises)
            .then(() => {
                console.log(`\n✅ Proceso completado: ${actualizados} registros actualizados/insertados`);
                db.close();
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Error durante el proceso:', error);
                db.close();
                process.exit(1);
            });
    });
}
