const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

// Datos completos de la imagen - orden: OCUPACIÓN, NOMBRE COMPLETO (apellidos primero), exámenes, fechas
// Formato: nombre completo tiene apellidos primero, luego nombre(s)
const datosCompletos = [
    { cargo: 'AYUDANTE GENERAL', nombreCompleto: 'ONTIVEROS SUAREZ JESUS', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '29/07/2026', nacimiento: '22/08/2002', vence: '18/01/2026', curso: '14/01/2026' },
    { cargo: 'AYUDANTE GENERAL', nombreCompleto: 'RODRIGUEZ RAMIREZ PABLO ENRIQUE', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '19/06/2026', nacimiento: '30/11/2005', vence: '15/01/2026', curso: '14/01/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'CORTES TORRES NESTOR RAFAEL', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '12/08/1987', vence: '24/06/2026', curso: '17/06/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'ECHEVERRIA GARCIA JAIME EMMANUEL', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '09/09/2026', nacimiento: '19/06/1990', vence: '08/04/2026', curso: '01/04/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'PONCE ALVARADO GUILLERMO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '23/07/2026', nacimiento: '23/02/1998', vence: '10/06/2026', curso: '03/06/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'ROJAS AGUILAR RAMIRO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '23/07/2026', nacimiento: '14/12/1999', vence: '23/07/2026', curso: '15/07/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'MARMOLEJO MONTES ALAN', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '31/10/2026', nacimiento: '20/09/2005', vence: '31/01/2026', curso: '28/01/2026' },
    { cargo: 'OPERADOR GEOCYCLE', nombreCompleto: 'GONZALEZ MARTINEZ ELIODORO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '01/02/2026', nacimiento: '06/04/1966', vence: '30/01/2026', curso: '28/01/2026' },
    { cargo: 'OPERADOR GEOCYCLE', nombreCompleto: 'GONZALEZ ROSALES WILLIAM AXEL', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '21/07/2026', nacimiento: '18/12/1999', vence: '11/02/2026', curso: '04/02/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'ROMERO PALMEROS MARINO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '21/07/2026', nacimiento: '26/12/1979', vence: '30/01/2026', curso: '28/01/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'GARCIA GOMEZ JULIAN ADOLFO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '21/07/2026', nacimiento: '20/08/2004', vence: '24/03/2026', curso: '18/03/2026' },
    { cargo: 'AYUDANTE GENERAL', nombreCompleto: 'REGALADO CONTRERAS ROGELIO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 0, vigencia: '13/05/2026', nacimiento: '16/09/1970', vence: '30/01/2026', curso: '28/01/2026' },
    { cargo: 'SUPERVISOR GENERAL', nombreCompleto: 'MARTINEZ HUERTA JOSÉ FRANCISCO', quimica: 1, antidoping: 1, electro: 1, espiro: 0, audio: 0, vigencia: '09/01/2027', nacimiento: '09/01/1998', vence: '24/03/2026', curso: '18/03/2026' },
    { cargo: 'DIRECTOR OPERATIVO', nombreCompleto: 'MARTINEZ MAGAÑA JULIAN', quimica: 1, antidoping: 1, electro: 1, espiro: 0, audio: 0, vigencia: '03/12/2026', nacimiento: '30/07/1965', vence: '30/01/2026', curso: '28/01/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'HERNANDEZ BEJARANO JOSE FERNANDO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '30/05/1983', vence: '19/05/2026', curso: '13/05/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'CERVANTES MUÑIZ IKER ISMAEL', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '18/11/2026', nacimiento: '15/02/2005', vence: '25/05/2026', curso: '20/05/2026' },
    { cargo: 'AYUDANTE GENERAL', nombreCompleto: 'ALCALA GARCIA CESAR DANIEL', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '18/11/2026', nacimiento: '26/09/2005', vence: '12/05/2026', curso: '06/05/2026' },
    { cargo: 'ALMACEN', nombreCompleto: 'MONTAÑO ARREOLA IRMA MARGARITA', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '04/02/2026', nacimiento: '03/06/2006', vence: '25/05/2026', curso: '20/05/2026' },
    { cargo: 'OPERADOR GEOCYCLE', nombreCompleto: 'HERNANDEZ ROSAS JOSE RODRIGO', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '13/05/2026', nacimiento: '11/11/1993', vence: '25/05/2026', curso: '20/05/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'MEDINA GENORIMO SAMUEL', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '18/12/2026', nacimiento: '07/02/1994', vence: '10/06/2026', curso: '03/06/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'MORFIN SANDOVAL CARLOS ISMAEL', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '11/11/2026', nacimiento: '18/03/2003', vence: '12/05/2026', curso: '05/05/2026' },
    { cargo: 'LIMPIEZA', nombreCompleto: 'PUENTE MALDONADO LUZ MERCEDES', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 0, vigencia: '12/03/2026', nacimiento: '03/08/1971', vence: '03/03/2026', curso: '25/03/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'RAMIREZ ESCAREÑO ANTONIO GUADALUPE', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '06/09/2026', nacimiento: '29/03/1988', vence: '29/03/2026', curso: '25/03/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'RAMOS JURADO DIEGO ESTEBAN', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '03/03/2026', nacimiento: '24/02/2006', vence: '02/06/2026', curso: '27/05/2026' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'SANCHEZ SOLANO CHRISTIAN NOEL', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '02/12/2026', nacimiento: '21/08/2006', vence: '03/06/2026', curso: '27/05/2026' },
    { cargo: 'SUPERVISOR DE SEGURIDAD', nombreCompleto: 'VALDOVINOS LLERENAS ERICK MANUEL', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '12/08/2002', vence: '30/01/2026', curso: '28/01/2026' },
    { cargo: 'DIRECTORA GENERAL', nombreCompleto: 'MARTINEZ HUERTA AMELIA', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 0, vigencia: '01/07/2026', nacimiento: '25/11/1999', vence: '06/02/2026', curso: '04/02/2026' },
    { cargo: 'OFICIAL ALBAÑIL', nombreCompleto: 'BELTRAN GARCÍA JOSÉ ALBERTO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '17/09/2026', nacimiento: '25/11/1999', vence: '29/04/2026', curso: '22/04/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'CAMARRO GONZALEZ EDY LEONEL', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '26/12/2026', nacimiento: '21/06/2007', vence: '24/06/2026', curso: '17/06/2026' },
    { cargo: 'AYUDANTE GENERAL', nombreCompleto: 'CASTREJON GARCIA CHRISTIAN EMMANUEL', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '21/07/2026', nacimiento: '18/07/2002', vence: '04/01/2026', curso: '' },
    { cargo: 'OFICIAL ELECTRICO', nombreCompleto: 'MARMOLEJO CERVANTES JOSE EFREN', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '30/12/2026', nacimiento: '22/04/1996', vence: '02/06/2026', curso: '27/05/2026' },
    { cargo: 'OFICIAL ALBAÑIL', nombreCompleto: 'MOTAÑO CRUZ RICARDO ALBERTO', quimica: 1, antidoping: 1, electro: 1, espiro: 1, audio: 1, vigencia: '30/12/2026', nacimiento: '06/06/1991', vence: '02/06/2026', curso: '27/05/2026' },
    { cargo: 'AYUDANTE GEOCYCLE', nombreCompleto: 'RODRIGUEZ MUÑIZ PABLO ZAID', quimica: 1, antidoping: 1, electro: 0, espiro: 0, audio: 1, vigencia: '22/12/2026', nacimiento: '20/11/2007', vence: '24/06/2026', curso: '17/06/2026' }
];

// Función para separar nombre completo (apellidos primero) en nombre y apellido
// Los nombres en la lista tienen formato: "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
// Necesitamos separar: los últimos 1-2 elementos son nombres, el resto son apellidos
function separarNombreCompleto(nombreCompleto) {
    const partes = nombreCompleto.trim().split(/\s+/);
    
    // Casos especiales conocidos
    const casosEspeciales = {
        'CAMARRO GONZALEZ EDY LEONEL': { nombre: 'EDY LEONEL', apellido: 'CAMARRO GONZALEZ' },
        'CASTREJON GARCIA CHRISTIAN EMMANUEL': { nombre: 'CHRISTIAN EMMANUEL', apellido: 'CASTREJON GARCIA' },
        'MARMOLEJO CERVANTES JOSE EFREN': { nombre: 'JOSE EFREN', apellido: 'MARMOLEJO CERVANTES' },
        'MOTAÑO CRUZ RICARDO ALBERTO': { nombre: 'RICARDO ALBERTO', apellido: 'MOTAÑO CRUZ' },
        'RODRIGUEZ MUÑIZ PABLO ZAID': { nombre: 'PABLO ZAID', apellido: 'RODRIGUEZ MUÑIZ' },
        'RODRIGUEZ RAMIREZ PABLO ENRIQUE': { nombre: 'PABLO ENRIQUE', apellido: 'RODRIGUEZ RAMIREZ' },
        'HERNANDEZ BEJARANO JOSE FERNANDO': { nombre: 'JOSE FERNANDO', apellido: 'HERNANDEZ BEJARANO' },
        'HERNANDEZ ROSAS JOSE RODRIGO': { nombre: 'JOSE RODRIGO', apellido: 'HERNANDEZ ROSAS' },
        'RAMIREZ ESCAREÑO ANTONIO GUADALUPE': { nombre: 'ANTONIO GUADALUPE', apellido: 'RAMIREZ ESCAREÑO' },
        'CORTES TORRES NESTOR RAFAEL': { nombre: 'NESTOR RAFAEL', apellido: 'CORTES TORRES' },
        'ECHEVERRIA GARCIA JAIME EMMANUEL': { nombre: 'JAIME EMMANUEL', apellido: 'ECHEVERRIA GARCIA' },
        'GARCIA GOMEZ JULIAN ADOLFO': { nombre: 'JULIAN ADOLFO', apellido: 'GARCIA GOMEZ' },
        'MARTINEZ HUERTA JOSÉ FRANCISCO': { nombre: 'JOSÉ FRANCISCO', apellido: 'MARTINEZ HUERTA' },
        'CERVANTES MUÑIZ IKER ISMAEL': { nombre: 'IKER ISMAEL', apellido: 'CERVANTES MUÑIZ' },
        'ALCALA GARCIA CESAR DANIEL': { nombre: 'CESAR DANIEL', apellido: 'ALCALA GARCIA' },
        'MORFIN SANDOVAL CARLOS ISMAEL': { nombre: 'CARLOS ISMAEL', apellido: 'MORFIN SANDOVAL' },
        'RAMOS JURADO DIEGO ESTEBAN': { nombre: 'DIEGO ESTEBAN', apellido: 'RAMOS JURADO' },
        'SANCHEZ SOLANO CHRISTIAN NOEL': { nombre: 'CHRISTIAN NOEL', apellido: 'SANCHEZ SOLANO' },
        'VALDOVINOS LLERENAS ERICK MANUEL': { nombre: 'ERICK MANUEL', apellido: 'VALDOVINOS LLERENAS' },
        'BELTRAN GARCÍA JOSÉ ALBERTO': { nombre: 'JOSÉ ALBERTO', apellido: 'BELTRAN GARCÍA' },
        'ONTIVEROS SUAREZ JESUS': { nombre: 'JESUS', apellido: 'ONTIVEROS SUAREZ' },
        'PONCE ALVARADO GUILLERMO': { nombre: 'GUILLERMO', apellido: 'PONCE ALVARADO' },
        'ROJAS AGUILAR RAMIRO': { nombre: 'RAMIRO', apellido: 'ROJAS AGUILAR' },
        'ROMERO PALMEROS MARINO': { nombre: 'MARINO', apellido: 'ROMERO PALMEROS' },
        'REGALADO CONTRERAS ROGELIO': { nombre: 'ROGELIO', apellido: 'REGALADO CONTRERAS' },
        'MARMOLEJO MONTES ALAN': { nombre: 'ALAN', apellido: 'MARMOLEJO MONTES' },
        'GONZALEZ MARTINEZ ELIODORO': { nombre: 'ELIODORO', apellido: 'GONZALEZ MARTINEZ' },
        'GONZALEZ ROSALES WILLIAM AXEL': { nombre: 'WILLIAM AXEL', apellido: 'GONZALEZ ROSALES' },
        'MONTAÑO ARREOLA IRMA MARGARITA': { nombre: 'IRMA MARGARITA', apellido: 'MONTAÑO ARREOLA' },
        'MEDINA GENORIMO SAMUEL': { nombre: 'SAMUEL', apellido: 'MEDINA GENORIMO' },
        'PUENTE MALDONADO LUZ MERCEDES': { nombre: 'LUZ MERCEDES', apellido: 'PUENTE MALDONADO' },
        'MARTINEZ HUERTA AMELIA': { nombre: 'AMELIA', apellido: 'MARTINEZ HUERTA' },
        'MARTINEZ MAGAÑA JULIAN': { nombre: 'JULIAN', apellido: 'MARTINEZ MAGAÑA' }
    };
    
    const nombreCompletoUpper = nombreCompleto.trim().toUpperCase();
    if (casosEspeciales[nombreCompletoUpper]) {
        return casosEspeciales[nombreCompletoUpper];
    }
    
    // Lógica genérica: si tiene más de 3 partes, tomar las últimas 2 como nombre
    if (partes.length > 3) {
        const nombre = partes.slice(-2).join(' ');
        const apellido = partes.slice(0, -2).join(' ');
        return { nombre, apellido };
    } else if (partes.length === 3) {
        // Si tiene 3 partes, la última es nombre, las primeras 2 son apellidos
        const nombre = partes[2];
        const apellido = partes.slice(0, 2).join(' ');
        return { nombre, apellido };
    } else if (partes.length === 2) {
        return { nombre: partes[1], apellido: partes[0] };
    } else {
        return { nombre: partes[0] || '', apellido: '' };
    }
}

// Función para normalizar nombres
function normalizar(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Mapeo de nombres conocidos
const mapeoNombres = {
    'jesus ontiveros suarez': 'jesus ontiveros suerez',
    'irma margarita montaño arreola': 'irma margarita arreola montaño',
    'samuel medina genorimo': 'samuel medina geronimo',
    'christian emmanuel castrejon garcia': 'christhian emmanuel castrejon garcia',
    'alan marmolejo montes': 'alan daniel marmolejo montes'
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
    const p1 = n1.split(' ');
    const p2 = n2.split(' ');
    if (p1.length > 0 && p2.length > 0) {
        if (p1[0] === p2[0] && p1[p1.length - 1] === p2[p2.length - 1]) {
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
        procesarDatos();
    }
});

function procesarDatos() {
    console.log('📋 Procesando datos de inducción...\n');
    
    // Paso 1: Obtener todos los empleados activos
    db.all('SELECT id, nombre, apellido FROM empleados WHERE activo = 1', [], (err, todosEmpleados) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        // Paso 2: Procesar cada dato de la lista
        const idsProcesados = new Set();
        let actualizados = 0;
        const promises = [];
        
        datosCompletos.forEach(dato => {
            const { nombre, apellido } = separarNombreCompleto(dato.nombreCompleto);
            
            // Buscar empleado en la BD
            const encontrado = todosEmpleados.find(empBD => 
                nombresCoinciden(nombre, apellido, empBD.nombre, empBD.apellido)
            );
            
            if (encontrado) {
                idsProcesados.add(encontrado.id);
                actualizados++;
                
                promises.push(new Promise((resolve, reject) => {
                    // Actualizar cargo primero
                    db.run(
                        'UPDATE empleados SET cargo = ? WHERE id = ?',
                        [dato.cargo, encontrado.id],
                        (errCargo) => {
                            if (errCargo) {
                                console.error(`   ⚠️  Error al actualizar cargo de ${encontrado.nombre}:`, errCargo.message);
                            }
                            
                            // Verificar si existe registro de exámenes
                            db.get('SELECT id FROM examenes_medicos WHERE empleado_id = ?', [encontrado.id], (err, row) => {
                                if (err) {
                                    console.error(`   ❌ Error al verificar ${encontrado.nombre}:`, err.message);
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
                                                console.error(`   ❌ Error al actualizar ${encontrado.nombre}:`, updateErr.message);
                                                reject(updateErr);
                                            } else {
                                                console.log(`   ✅ ${encontrado.nombre} ${encontrado.apellido} (${dato.cargo})`);
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
                                                console.error(`   ❌ Error al insertar ${encontrado.nombre}:`, insertErr.message);
                                                reject(insertErr);
                                            } else {
                                                console.log(`   ✅ ${encontrado.nombre} ${encontrado.apellido} (${dato.cargo})`);
                                                resolve();
                                            }
                                        }
                                    );
                                }
                            });
                        }
                    );
                }));
            } else {
                console.log(`   ⚠️  No encontrado en BD: ${nombre} ${apellido} (${dato.cargo})`);
            }
        });
        
        // Paso 3: Limpiar datos de empleados que NO están en la lista
        Promise.all(promises).then(() => {
            console.log('\n🧹 Limpiando datos de empleados que NO están en la lista...\n');
            
            const limpiarPromises = [];
            let limpiados = 0;
            
            todosEmpleados.forEach(emp => {
                if (!idsProcesados.has(emp.id)) {
                    limpiarPromises.push(new Promise((resolve) => {
                        // Marcar cargo como 'Desconocido'
                        db.run(
                            "UPDATE empleados SET cargo = 'Desconocido' WHERE id = ?",
                            [emp.id],
                            () => {
                                // Limpiar datos de exámenes
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
                                    [emp.id],
                                    () => {
                                        limpiados++;
                                        console.log(`   🗑️  Limpiado: ${emp.nombre} ${emp.apellido}`);
                                        resolve();
                                    }
                                );
                            }
                        );
                    }));
                }
            });
            
            Promise.all(limpiarPromises).then(() => {
                console.log(`\n✅ Proceso completado:`);
                console.log(`   - ${actualizados} empleados actualizados con datos`);
                console.log(`   - ${limpiados} empleados limpiados (no están en la lista)`);
                db.close();
                process.exit(0);
            });
        }).catch((error) => {
            console.error('❌ Error durante el proceso:', error);
            db.close();
            process.exit(1);
        });
    });
}

