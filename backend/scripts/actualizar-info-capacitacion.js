const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');
const BASE_DIR = path.join(__dirname, '../..');

// Buscar archivos Excel de capacitación
function buscarArchivoCapacitacion() {
    const archivos = fs.readdirSync(BASE_DIR);
    for (const archivo of archivos) {
        if (archivo.endsWith('.xlsx') && 
            (archivo.includes('INFORMACION') || archivo.includes('PERSONAL') || archivo.includes('CURSOS'))) {
            const rutaCompleta = path.join(BASE_DIR, archivo);
            if (fs.existsSync(rutaCompleta)) {
                return rutaCompleta;
            }
        }
    }
    return null;
}

const EXCEL_PATH = buscarArchivoCapacitacion();

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Base de datos conectada');
    procesarCapacitacion();
});

function normalizarNombre(nombre) {
    return nombre.toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function buscarEmpleadoPorNombre(db, nombreCompleto, callback) {
    const nombreNormalizado = normalizarNombre(nombreCompleto);
    
    db.all('SELECT id, nombre, apellido FROM empleados WHERE activo = 1', [], (err, empleados) => {
        if (err) {
            return callback(err, null);
        }
        
        // Buscar coincidencia exacta o parcial
        for (const emp of empleados) {
            const empNombreCompleto = `${emp.nombre} ${emp.apellido}`;
            const empNormalizado = normalizarNombre(empNombreCompleto);
            
            // Coincidencia exacta
            if (empNormalizado === nombreNormalizado) {
                return callback(null, emp);
            }
            
            // Coincidencia parcial (contiene apellidos o nombres)
            const partesNombre = nombreNormalizado.split(' ');
            const partesEmp = empNormalizado.split(' ');
            
            // Si al menos 2 partes coinciden
            let coincidencias = 0;
            for (const parte of partesNombre) {
                if (partesEmp.some(p => p.includes(parte) || parte.includes(p))) {
                    coincidencias++;
                }
            }
            
            if (coincidencias >= 2 && partesNombre.length >= 2) {
                return callback(null, emp);
            }
        }
        
        callback(null, null);
    });
}

function procesarCapacitacion() {
    if (!EXCEL_PATH) {
        console.log('⚠️ No se encontró archivo de capacitación');
        db.close();
        return;
    }
    
    console.log(`📖 Leyendo archivo: ${path.basename(EXCEL_PATH)}\n`);
    
    try {
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetName = 'PERSONAL RHM'; // Usar la hoja correcta
        const worksheet = workbook.Sheets[sheetName];
        
        // Leer datos sin header personalizado
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // La fila de encabezados está en índice 3, datos empiezan en índice 5
        const data = [];
        for (let i = 5; i < rawData.length; i++) {
            const row = rawData[i];
            const nombre = row[3] ? row[3].toString().trim() : '';
            
            // Saltar filas vacías o de encabezados
            if (!nombre || nombre === '' || nombre.includes('PERSONAL RHM') || nombre === 'NOMBRE Y APELLIDOS') {
                continue;
            }
            
            data.push({
                numero: row[0],
                ocupacion: row[1],
                nombre: nombre,
                quimica: row[7],
                antidoping: row[8],
                electro: row[9],
                espiro: row[10],
                audio: row[11],
                vigencia: row[12],
                fecha_nac: row[14],
                vence_ind: row[16],
                mandar_curso: row[18]
            });
        }
        
        console.log(`✅ ${data.length} registros encontrados en el Excel\n`);
        
        let procesados = 0;
        let actualizados = 0;
        let noEncontrados = [];
        
        // Función para convertir fecha de Excel a formato DD/MM/YYYY
        function convertirFechaExcel(fechaExcel) {
            if (!fechaExcel || fechaExcel === 'N/A' || fechaExcel === '') {
                return null;
            }
            
            // Si es un número (fecha de Excel), convertir
            if (typeof fechaExcel === 'number') {
                const fecha = XLSX.SSF.parse_date_code(fechaExcel);
                if (fecha) {
                    const dia = String(fecha.d).padStart(2, '0');
                    const mes = String(fecha.m).padStart(2, '0');
                    const año = fecha.y;
                    return `${dia}/${mes}/${año}`;
                }
            }
            
            // Si ya es una fecha en formato texto, devolverla
            if (typeof fechaExcel === 'string') {
                return fechaExcel;
            }
            
            return null;
        }
        
        data.forEach((row, index) => {
            const nombreExcel = (row.nombre || row['__EMPTY_3'] || '').toString().trim();
            
            if (!nombreExcel || nombreExcel === 'NOMBRE Y APELLIDOS' || nombreExcel.includes('PERSONAL RHM')) {
                return;
            }
            
            procesados++;
            
            buscarEmpleadoPorNombre(db, nombreExcel, (err, empleado) => {
                if (err) {
                    console.error(`Error al buscar empleado: ${err.message}`);
                    return;
                }
                
                if (!empleado) {
                    noEncontrados.push(nombreExcel);
                    return;
                }
                
                // Mapear campos del Excel
                const quimica = row.quimica || row['__EMPTY_7'] || '';
                const antidoping = row.antidoping || row['__EMPTY_8'] || '';
                const electro = row.electro || row['__EMPTY_9'] || '';
                const espiro = row.espiro || row['__EMPTY_10'] || '';
                const audio = row.audio || row['__EMPTY_11'] || '';
                
                const vigencia = convertirFechaExcel(row.vigencia || row['__EMPTY_12']);
                const fechaNac = convertirFechaExcel(row.fecha_nac || row['__EMPTY_14']);
                const venceInd = convertirFechaExcel(row.vence_ind || row['__EMPTY_16']);
                const mandarCurso = convertirFechaExcel(row.mandar_curso || row['__EMPTY_18']);
                
                // Convertir valores a 1 o 0 (✔, SI, SÍ = 1, otros = 0)
                const quimicaVal = (quimica === '✔' || quimica === 'SI' || quimica === 'SÍ' || quimica === 'Si') ? 1 : 0;
                const antidopingVal = (antidoping === '✔' || antidoping === 'SI' || antidoping === 'SÍ' || antidoping === 'Si') ? 1 : 0;
                const electroVal = (electro === '✔' || electro === 'SI' || electro === 'SÍ' || electro === 'Si') ? 1 : 0;
                const espiroVal = (espiro === '✔' || espiro === 'SI' || espiro === 'SÍ' || espiro === 'Si') ? 1 : 0;
                const audioVal = (audio === '✔' || audio === 'SI' || audio === 'SÍ' || audio === 'Si') ? 1 : 0;
                
                // Insertar o actualizar exámenes médicos
                db.run(
                    `INSERT OR REPLACE INTO examenes_medicos 
                     (empleado_id, quimica_sanguinea, antidoping, electrocardiogram, espirometrias, audiometrias, 
                      vigencia_de, fecha_nacimiento, vence_induccion, mandar_a_curso)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        empleado.id,
                        quimicaVal,
                        antidopingVal,
                        electroVal,
                        espiroVal,
                        audioVal,
                        vigencia,
                        fechaNac,
                        venceInd,
                        mandarCurso
                    ],
                    function(err) {
                        if (err) {
                            console.error(`❌ Error al actualizar ${empleado.nombre} ${empleado.apellido}:`, err.message);
                        } else {
                            actualizados++;
                            console.log(`✅ ${actualizados}. ${empleado.nombre} ${empleado.apellido} - Información actualizada`);
                        }
                    }
                );
            });
        });
        
        setTimeout(() => {
            console.log(`\n✅ Proceso completado:`);
            console.log(`   - Registros procesados: ${procesados}`);
            console.log(`   - Empleados actualizados: ${actualizados}`);
            if (noEncontrados.length > 0) {
                console.log(`\n⚠️ Empleados no encontrados en la BD (${noEncontrados.length}):`);
                noEncontrados.forEach(n => console.log(`   - ${n}`));
            }
            db.close();
        }, 5000);
        
    } catch (error) {
        console.error('Error al leer Excel:', error.message);
        db.close();
    }
}

