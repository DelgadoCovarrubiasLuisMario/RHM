const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

// Buscar el archivo Excel
const files = fs.readdirSync(path.join(__dirname, '../..')).filter(f => 
    f.endsWith('.xlsx') && 
    (f.includes('INFORMACION PERSONAL') || f.includes('PERSONAL RHM'))
);
const EXCEL_PATH = files.length > 0 
    ? path.join(__dirname, '../..', files[0])
    : null;

if (!EXCEL_PATH || !fs.existsSync(EXCEL_PATH)) {
    console.error('❌ No se encontró el archivo Excel');
    process.exit(1);
}

// Función para convertir número de Excel a fecha DD/MM/YYYY
function excelDateToDDMMYYYY(excelDate) {
    if (!excelDate || excelDate === '' || excelDate === 'N/A' || excelDate === 'PEN' || isNaN(excelDate)) {
        return null;
    }
    
    // Excel cuenta desde el 1 de enero de 1900, pero tiene un bug que cuenta 1900 como año bisiesto
    // Por eso restamos 1 día (o 2 si es antes de 1900-03-01)
    const excelEpoch = new Date(1899, 11, 30); // 30 de diciembre de 1899
    const date = new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
    
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    
    return `${dia}/${mes}/${año}`;
}

// Función para separar nombre completo (apellidos primero) en nombre y apellido
function separarNombreCompleto(nombreCompleto) {
    const partes = nombreCompleto.trim().split(/\s+/).filter(p => p);
    
    if (partes.length === 0) return { nombre: '', apellido: '' };
    if (partes.length === 1) return { nombre: partes[0], apellido: '' };
    if (partes.length === 2) return { nombre: partes[1], apellido: partes[0] };
    
    // Para 3 o más partes: las últimas 1-2 son nombres, el resto son apellidos
    // Generalmente: si tiene 3 partes -> [apellido1, apellido2, nombre]
    // Si tiene 4+ partes -> [apellido1, apellido2, ..., nombre1, nombre2]
    if (partes.length === 3) {
        return { nombre: partes[2], apellido: `${partes[0]} ${partes[1]}` };
    } else {
        // Para 4+ partes, tomar las últimas 2 como nombre
        const nombre = partes.slice(-2).join(' ');
        const apellido = partes.slice(0, -2).join(' ');
        return { nombre, apellido };
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

// Función para comparar nombres (flexible)
function nombresCoinciden(nombre1, apellido1, nombre2, apellido2) {
    const n1 = normalizar(`${nombre1} ${apellido1}`);
    const n2 = normalizar(`${nombre2} ${apellido2}`);
    
    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;
    
    // Comparar sin considerar orden de apellidos
    const palabras1 = n1.split(' ').sort();
    const palabras2 = n2.split(' ').sort();
    if (palabras1.length === palabras2.length && palabras1.length > 0) {
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

// Función para convertir checkmark a número
function checkmarkToNumber(valor) {
    if (valor === '✔' || valor === 'SI' || valor === 1 || valor === '1' || valor === true) {
        return 1;
    }
    return 0;
}

console.log('📋 Leyendo archivo Excel...');
console.log(`📄 Archivo: ${path.basename(EXCEL_PATH)}\n`);

const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['PERSONAL RHM'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Buscar la fila de encabezados (debe contener "OCUPACIÓN" y "NOMBRE")
let headerRowIndex = -1;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join('|').toUpperCase();
    if (rowStr.includes('OCUPACIÓN') && rowStr.includes('NOMBRE')) {
        headerRowIndex = i;
        break;
    }
}

if (headerRowIndex === -1) {
    console.error('❌ No se encontró la fila de encabezados');
    process.exit(1);
}

console.log(`✅ Encabezados encontrados en fila ${headerRowIndex + 1}\n`);

// Extraer índices de columnas
const headers = data[headerRowIndex];
const colIndices = {
    ocupacion: headers.findIndex(h => h.toString().toUpperCase().includes('OCUPACIÓN')),
    nombre: headers.findIndex(h => h.toString().toUpperCase().includes('NOMBRE') && h.toString().toUpperCase().includes('APELLIDO')),
    quimica: headers.findIndex(h => h.toString().toUpperCase().includes('QUIMICA')),
    antidoping: headers.findIndex(h => h.toString().toUpperCase().includes('ANTIDOPING')),
    electro: headers.findIndex(h => h.toString().toUpperCase().includes('ELECTROCARDIOGRAMA')),
    espiro: headers.findIndex(h => h.toString().toUpperCase().includes('ESPIROMETRIAS')),
    audio: headers.findIndex(h => h.toString().toUpperCase().includes('AUDIOMETRIAS')),
    vigencia: headers.findIndex(h => h.toString().toUpperCase().includes('VIGENCIA')),
    nacimiento: headers.findIndex(h => h.toString().toUpperCase().includes('NACIMIENTO')),
    vence: headers.findIndex(h => h.toString().toUpperCase().includes('VENCE INDUCCIÓN')),
    curso: headers.findIndex(h => h.toString().toUpperCase().includes('MANDAR A CURSO'))
};

console.log('📊 Índices de columnas:', colIndices);
console.log('');

// Procesar datos
const empleadosExcel = [];
for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    
    const ocupacion = row[colIndices.ocupacion]?.toString().trim() || '';
    const nombreCompleto = row[colIndices.nombre]?.toString().trim() || '';
    
    // Saltar filas vacías
    if (!ocupacion && !nombreCompleto) continue;
    
    // Saltar si no tiene nombre
    if (!nombreCompleto) continue;
    
    const { nombre, apellido } = separarNombreCompleto(nombreCompleto);
    
    empleadosExcel.push({
        cargo: ocupacion,
        nombreCompleto: nombreCompleto,
        nombre: nombre,
        apellido: apellido,
        quimica: checkmarkToNumber(row[colIndices.quimica]),
        antidoping: checkmarkToNumber(row[colIndices.antidoping]),
        electro: checkmarkToNumber(row[colIndices.electro]),
        espiro: checkmarkToNumber(row[colIndices.espiro]),
        audio: checkmarkToNumber(row[colIndices.audio]),
        vigencia: excelDateToDDMMYYYY(row[colIndices.vigencia]),
        nacimiento: excelDateToDDMMYYYY(row[colIndices.nacimiento]),
        vence: excelDateToDDMMYYYY(row[colIndices.vence]),
        curso: excelDateToDDMMYYYY(row[colIndices.curso])
    });
}

console.log(`✅ ${empleadosExcel.length} empleados encontrados en Excel\n`);

// Conectar a base de datos
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
    
    // Obtener todos los empleados activos
    db.all('SELECT id, nombre, apellido FROM empleados WHERE activo = 1', [], (err, todosEmpleados) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        const idsProcesados = new Set();
        let actualizados = 0;
        let noEncontrados = 0;
        const promises = [];
        
        // Procesar cada empleado del Excel
        empleadosExcel.forEach(dato => {
            // Buscar empleado en la BD
            const encontrado = todosEmpleados.find(empBD => 
                nombresCoinciden(dato.nombre, dato.apellido, empBD.nombre, empBD.apellido)
            );
            
            if (encontrado) {
                idsProcesados.add(encontrado.id);
                actualizados++;
                
                promises.push(new Promise((resolve, reject) => {
                    // Actualizar cargo
                    db.run(
                        'UPDATE empleados SET cargo = ? WHERE id = ?',
                        [dato.cargo || 'Desconocido', encontrado.id],
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
                                             mandar_a_curso = ?,
                                             actualizado_en = CURRENT_TIMESTAMP
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
                noEncontrados++;
                console.log(`   ⚠️  No encontrado en BD: ${dato.nombreCompleto} (${dato.cargo})`);
            }
        });
        
        // Limpiar datos de empleados que NO están en la lista
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
                console.log(`   - ${noEncontrados} empleados del Excel no encontrados en BD`);
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

