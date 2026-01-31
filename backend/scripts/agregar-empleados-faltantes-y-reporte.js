const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
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

// Función para generar código único
function generarCodigo(nombre, apellido) {
    const texto = `${nombre}${apellido}${Date.now()}`;
    return crypto.createHash('md5').update(texto).digest('hex').substring(0, 8);
}

// Función para convertir número de Excel a fecha DD/MM/YYYY
function excelDateToDDMMYYYY(excelDate) {
    if (!excelDate || excelDate === '' || excelDate === 'N/A' || excelDate === 'PEN' || isNaN(excelDate)) {
        return null;
    }
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const año = date.getFullYear();
    return `${dia}/${mes}/${año}`;
}

// Función para separar nombre completo
function separarNombreCompleto(nombreCompleto) {
    const partes = nombreCompleto.trim().split(/\s+/).filter(p => p);
    if (partes.length === 0) return { nombre: '', apellido: '' };
    if (partes.length === 1) return { nombre: partes[0], apellido: '' };
    if (partes.length === 2) return { nombre: partes[1], apellido: partes[0] };
    if (partes.length === 3) {
        return { nombre: partes[2], apellido: `${partes[0]} ${partes[1]}` };
    } else {
        const nombre = partes.slice(-2).join(' ');
        const apellido = partes.slice(0, -2).join(' ');
        return { nombre, apellido };
    }
}

// Función para determinar área basándose en el cargo
function determinarArea(cargo) {
    const cargoUpper = cargo.toUpperCase();
    if (cargoUpper.includes('GEOCYCLE')) {
        return 'GeoCycle';
    }
    // Por defecto, si no tiene "GEOCYCLE" en el cargo, es Planta
    return 'Planta';
}

// Función para convertir checkmark a número
function checkmarkToNumber(valor) {
    if (valor === '✔' || valor === 'SI' || valor === 1 || valor === '1' || valor === true) {
        return 1;
    }
    return 0;
}

// Empleados que no se encontraron en la BD
const empleadosFaltantes = [
    { nombreCompleto: 'GRANA VIRGEN JOSE GUADALUPE', cargo: 'LOGISTICA' },
    { nombreCompleto: 'MARTINEZ MAGAÑA JULIAN', cargo: 'DIRECTOR OPERATIVO' },
    { nombreCompleto: 'MEDINA GENORIMO SAMUEL', cargo: 'OFICIAL ELECTRICO' },
    { nombreCompleto: 'CAMARRO GONZALEZ EDY LEONEL', cargo: 'AYUDANTE GEOCYCLE' },
    { nombreCompleto: 'CASTREJON GARCIA CHRISTIAN EMMANUEL', cargo: 'AYUDANTE GENERAL' },
    { nombreCompleto: 'MARMOLEJO CERVANTES JOSE EFREN', cargo: 'OFICIAL ELECTRICO' },
    { nombreCompleto: 'MOTAÑO CRUZ RICARDO ALBERTO', cargo: 'OFICIAL ALBAÑIL' },
    { nombreCompleto: 'RODRIGUEZ MUÑIZ PABLO ZAID', cargo: 'AYUDANTE GEOCYCLE' },
    { nombreCompleto: 'FLORES GUITIERREZ ORLANDO GABANIEL', cargo: 'AYUDANTE GENERAL' },
    { nombreCompleto: 'MONTES FUENTES CARLOS ANTONIO', cargo: 'AYUDANTE GEOCYCLE' }
];

console.log('📋 Leyendo archivo Excel para obtener datos completos...\n');

const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['PERSONAL RHM'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Buscar encabezados
let headerRowIndex = -1;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowStr = row.join('|').toUpperCase();
    if (rowStr.includes('OCUPACIÓN') && rowStr.includes('NOMBRE')) {
        headerRowIndex = i;
        break;
    }
}

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

// Crear mapa de datos del Excel
const datosExcel = new Map();
for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const nombreCompleto = row[colIndices.nombre]?.toString().trim() || '';
    if (!nombreCompleto) continue;
    
    datosExcel.set(nombreCompleto.toUpperCase(), {
        cargo: row[colIndices.ocupacion]?.toString().trim() || '',
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

// Conectar a base de datos
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada\n');
        agregarEmpleados();
    }
});

function agregarEmpleados() {
    console.log('👥 Agregando empleados faltantes...\n');
    
    let agregados = 0;
    const promises = [];
    
    empleadosFaltantes.forEach(emp => {
        const { nombre, apellido } = separarNombreCompleto(emp.nombreCompleto);
        const datos = datosExcel.get(emp.nombreCompleto.toUpperCase()) || {};
        const area = determinarArea(emp.cargo);
        const codigo = generarCodigo(nombre, apellido);
        
        promises.push(new Promise((resolve, reject) => {
            // Insertar empleado
            db.run(
                `INSERT INTO empleados (codigo, nombre, apellido, area, sueldo_base, cargo, activo)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [codigo, nombre, apellido, area, 2000, emp.cargo, 1],
                function(err) {
                    if (err) {
                        console.error(`   ❌ Error al insertar ${nombre} ${apellido}:`, err.message);
                        reject(err);
                        return;
                    }
                    
                    const empleadoId = this.lastID;
                    agregados++;
                    console.log(`   ✅ Agregado: ${nombre} ${apellido} (${emp.cargo}) - ${area} - Código: ${codigo}`);
                    
                    // Insertar datos de exámenes médicos si existen
                    if (datos.quimica !== undefined || datos.antidoping !== undefined) {
                        db.run(
                            `INSERT INTO examenes_medicos 
                             (empleado_id, quimica_sanguinea, antidoping, electrocardiogram, espirometrias, audiometrias,
                              vigencia_de, fecha_nacimiento, vence_induccion, mandar_a_curso)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                empleadoId,
                                datos.quimica || 0,
                                datos.antidoping || 0,
                                datos.electro || 0,
                                datos.espiro || 0,
                                datos.audio || 0,
                                datos.vigencia || null,
                                datos.nacimiento || null,
                                datos.vence || null,
                                datos.curso || null
                            ],
                            (errExamen) => {
                                if (errExamen) {
                                    console.error(`   ⚠️  Error al insertar exámenes de ${nombre}:`, errExamen.message);
                                }
                                resolve();
                            }
                        );
                    } else {
                        resolve();
                    }
                }
            );
        }));
    });
    
    Promise.all(promises).then(() => {
        console.log(`\n✅ ${agregados} empleados agregados\n`);
        generarReporte();
    }).catch((error) => {
        console.error('❌ Error durante la inserción:', error);
        db.close();
        process.exit(1);
    });
}

function generarReporte() {
    console.log('📊 Generando reporte de información pendiente...\n');
    
    // Obtener todos los empleados activos
    db.all(`
        SELECT 
            e.id,
            e.codigo,
            e.nombre,
            e.apellido,
            e.area,
            e.sueldo_base,
            e.cargo,
            e.email,
            e.telefono,
            em.quimica_sanguinea,
            em.antidoping,
            em.electrocardiogram,
            em.espirometrias,
            em.audiometrias,
            em.vigencia_de,
            em.fecha_nacimiento,
            em.vence_induccion,
            em.mandar_a_curso
        FROM empleados e
        LEFT JOIN examenes_medicos em ON e.id = em.empleado_id
        WHERE e.activo = 1
        ORDER BY e.nombre, e.apellido
    `, [], (err, empleados) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        const reporte = {
            sinSueldo: [],
            sinEmail: [],
            sinTelefono: [],
            examenesPendientes: [],
            fechasPendientes: []
        };
        
        empleados.forEach(emp => {
            const nombreCompleto = `${emp.nombre} ${emp.apellido}`;
            
            // Verificar sueldo base (si es 2000, probablemente es el default)
            if (!emp.sueldo_base || emp.sueldo_base === 2000) {
                reporte.sinSueldo.push({
                    nombre: nombreCompleto,
                    cargo: emp.cargo || 'Sin cargo',
                    area: emp.area,
                    sueldo_actual: emp.sueldo_base || 'No definido'
                });
            }
            
            // Verificar email
            if (!emp.email) {
                reporte.sinEmail.push({
                    nombre: nombreCompleto,
                    cargo: emp.cargo || 'Sin cargo',
                    area: emp.area
                });
            }
            
            // Verificar teléfono
            if (!emp.telefono) {
                reporte.sinTelefono.push({
                    nombre: nombreCompleto,
                    cargo: emp.cargo || 'Sin cargo',
                    area: emp.area
                });
            }
            
            // Verificar exámenes médicos
            const examenesCompletos = 
                (emp.quimica_sanguinea === 1) &&
                (emp.antidoping === 1) &&
                (emp.electrocardiogram === 1) &&
                (emp.espirometrias === 1) &&
                (emp.audiometrias === 1);
            
            if (!examenesCompletos) {
                const examenesPend = [];
                if (emp.quimica_sanguinea !== 1) examenesPend.push('Química Sanguínea');
                if (emp.antidoping !== 1) examenesPend.push('Antidoping');
                if (emp.electrocardiogram !== 1) examenesPend.push('Electrocardiograma');
                if (emp.espirometrias !== 1) examenesPend.push('Espirometrías');
                if (emp.audiometrias !== 1) examenesPend.push('Audiometrías');
                
                reporte.examenesPendientes.push({
                    nombre: nombreCompleto,
                    cargo: emp.cargo || 'Sin cargo',
                    area: emp.area,
                    pendientes: examenesPend.join(', ')
                });
            }
            
            // Verificar fechas importantes
            const fechasPend = [];
            if (!emp.vigencia_de) fechasPend.push('Vigencia de Estudios');
            if (!emp.fecha_nacimiento) fechasPend.push('Fecha de Nacimiento');
            if (!emp.vence_induccion) fechasPend.push('Vence Inducción');
            if (!emp.mandar_a_curso) fechasPend.push('Mandar a Curso');
            
            if (fechasPend.length > 0) {
                reporte.fechasPendientes.push({
                    nombre: nombreCompleto,
                    cargo: emp.cargo || 'Sin cargo',
                    area: emp.area,
                    pendientes: fechasPend.join(', ')
                });
            }
        });
        
        // Mostrar reporte
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📋 REPORTE DE INFORMACIÓN PENDIENTE');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        console.log(`💰 EMPLEADOS SIN SUELDO BASE DEFINIDO (${reporte.sinSueldo.length}):`);
        console.log('───────────────────────────────────────────────────────────────');
        if (reporte.sinSueldo.length === 0) {
            console.log('   ✅ Todos los empleados tienen sueldo base definido\n');
        } else {
            reporte.sinSueldo.forEach(emp => {
                console.log(`   • ${emp.nombre}`);
                console.log(`     Cargo: ${emp.cargo} | Área: ${emp.area} | Sueldo actual: $${emp.sueldo_actual}\n`);
            });
        }
        
        console.log(`\n📧 EMPLEADOS SIN EMAIL (${reporte.sinEmail.length}):`);
        console.log('───────────────────────────────────────────────────────────────');
        if (reporte.sinEmail.length === 0) {
            console.log('   ✅ Todos los empleados tienen email\n');
        } else {
            reporte.sinEmail.forEach(emp => {
                console.log(`   • ${emp.nombre} (${emp.cargo} - ${emp.area})\n`);
            });
        }
        
        console.log(`\n📱 EMPLEADOS SIN TELÉFONO (${reporte.sinTelefono.length}):`);
        console.log('───────────────────────────────────────────────────────────────');
        if (reporte.sinTelefono.length === 0) {
            console.log('   ✅ Todos los empleados tienen teléfono\n');
        } else {
            reporte.sinTelefono.forEach(emp => {
                console.log(`   • ${emp.nombre} (${emp.cargo} - ${emp.area})\n`);
            });
        }
        
        console.log(`\n🏥 EMPLEADOS CON EXÁMENES MÉDICOS PENDIENTES (${reporte.examenesPendientes.length}):`);
        console.log('───────────────────────────────────────────────────────────────');
        if (reporte.examenesPendientes.length === 0) {
            console.log('   ✅ Todos los empleados tienen exámenes médicos completos\n');
        } else {
            reporte.examenesPendientes.forEach(emp => {
                console.log(`   • ${emp.nombre} (${emp.cargo} - ${emp.area})`);
                console.log(`     Pendientes: ${emp.pendientes}\n`);
            });
        }
        
        console.log(`\n📅 EMPLEADOS CON FECHAS PENDIENTES (${reporte.fechasPendientes.length}):`);
        console.log('───────────────────────────────────────────────────────────────');
        if (reporte.fechasPendientes.length === 0) {
            console.log('   ✅ Todos los empleados tienen fechas completas\n');
        } else {
            reporte.fechasPendientes.forEach(emp => {
                console.log(`   • ${emp.nombre} (${emp.cargo} - ${emp.area})`);
                console.log(`     Pendientes: ${emp.pendientes}\n`);
            });
        }
        
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('✅ Reporte completado\n');
        
        // Guardar reporte en archivo
        const reporteTexto = `
═══════════════════════════════════════════════════════════════
📋 REPORTE DE INFORMACIÓN PENDIENTE - ${new Date().toLocaleDateString('es-MX')}
═══════════════════════════════════════════════════════════════

💰 EMPLEADOS SIN SUELDO BASE DEFINIDO (${reporte.sinSueldo.length}):
───────────────────────────────────────────────────────────────
${reporte.sinSueldo.length === 0 ? '✅ Todos los empleados tienen sueldo base definido' : reporte.sinSueldo.map(emp => `• ${emp.nombre} | Cargo: ${emp.cargo} | Área: ${emp.area} | Sueldo actual: $${emp.sueldo_actual}`).join('\n')}

📧 EMPLEADOS SIN EMAIL (${reporte.sinEmail.length}):
───────────────────────────────────────────────────────────────
${reporte.sinEmail.length === 0 ? '✅ Todos los empleados tienen email' : reporte.sinEmail.map(emp => `• ${emp.nombre} (${emp.cargo} - ${emp.area})`).join('\n')}

📱 EMPLEADOS SIN TELÉFONO (${reporte.sinTelefono.length}):
───────────────────────────────────────────────────────────────
${reporte.sinTelefono.length === 0 ? '✅ Todos los empleados tienen teléfono' : reporte.sinTelefono.map(emp => `• ${emp.nombre} (${emp.cargo} - ${emp.area})`).join('\n')}

🏥 EMPLEADOS CON EXÁMENES MÉDICOS PENDIENTES (${reporte.examenesPendientes.length}):
───────────────────────────────────────────────────────────────
${reporte.examenesPendientes.length === 0 ? '✅ Todos los empleados tienen exámenes médicos completos' : reporte.examenesPendientes.map(emp => `• ${emp.nombre} (${emp.cargo} - ${emp.area})\n  Pendientes: ${emp.pendientes}`).join('\n\n')}

📅 EMPLEADOS CON FECHAS PENDIENTES (${reporte.fechasPendientes.length}):
───────────────────────────────────────────────────────────────
${reporte.fechasPendientes.length === 0 ? '✅ Todos los empleados tienen fechas completas' : reporte.fechasPendientes.map(emp => `• ${emp.nombre} (${emp.cargo} - ${emp.area})\n  Pendientes: ${emp.pendientes}`).join('\n\n')}
`;
        
        const reportePath = path.join(__dirname, '../../REPORTE_INFORMACION_PENDIENTE.txt');
        fs.writeFileSync(reportePath, reporteTexto, 'utf8');
        console.log(`📄 Reporte guardado en: ${reportePath}\n`);
        
        db.close();
        process.exit(0);
    });
}

