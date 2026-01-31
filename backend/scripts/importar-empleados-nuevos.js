const sqlite3 = require('sqlite3').verbose();
const XLSX = require('xlsx');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');
// Intentar con ambos archivos posibles
const EXCEL_PATH1 = path.join(__dirname, '../../INFORMACION PERSONAL RHM ESTUDIOS, INDUCCIÓN Y CURSOS (1).xlsx');
const EXCEL_PATH2 = path.join(__dirname, '../../PERSONAL RHM ESTUDIOS, INDUCCIÓN Y CURSOS.xlsx');
const EXCEL_PATH = fs.existsSync(EXCEL_PATH1) ? EXCEL_PATH1 : (fs.existsSync(EXCEL_PATH2) ? EXCEL_PATH2 : null);

// Función para generar código único
function generarCodigo(nombre, apellido) {
    const texto = `${nombre}${apellido}${Date.now()}${Math.random()}`;
    return crypto.createHash('md5').update(texto).digest('hex').substring(0, 8);
}

// Función para normalizar nombre (separar apellidos y nombres)
function normalizarNombre(nombreCompleto) {
    // El formato es: "Apellido1 Apellido2 Nombre1 Nombre2"
    const partes = nombreCompleto.trim().split(/\s+/);
    
    if (partes.length >= 2) {
        // Tomar los últimos 1-2 como nombres, el resto como apellidos
        if (partes.length === 2) {
            return { apellido: partes[0], nombre: partes[1] };
        } else if (partes.length === 3) {
            return { apellido: `${partes[0]} ${partes[1]}`, nombre: partes[2] };
        } else {
            // 4 o más partes: últimos 2 son nombres, resto apellidos
            const nombres = partes.slice(-2).join(' ');
            const apellidos = partes.slice(0, -2).join(' ');
            return { apellido: apellidos, nombre: nombres };
        }
    }
    
    return { apellido: nombreCompleto, nombre: '' };
}

// Lista de empleados del cliente
const empleadosNuevos = [
    { nombre: "Irma Margarita", apellido: "Arreola Montaño", sueldo: 2200.00 },
    { nombre: "Cesar Daniel", apellido: "Alcalá Garcia", sueldo: 3000.00 },
    { nombre: "José Alberto", apellido: "Beltran Garcia", sueldo: 4800.00 },
    { nombre: "Ricardo Alberto", apellido: "Montaño Cruz", sueldo: 3700.00 },
    { nombre: "Christhian Emmanuel", apellido: "Castrejón Garcia", sueldo: 2500.00 },
    { nombre: "Iker Ismael", apellido: "Cervantes Muñiz", sueldo: 2900.00 },
    { nombre: "Jaime Emmanuel", apellido: "Echeverria Garcia", sueldo: 5500.00 },
    { nombre: "Gabriel Omar", apellido: "Oriz Rincon", sueldo: 2300.00 },
    { nombre: "Julian Adolfo", apellido: "Garcia Gomez", sueldo: 2300.00 },
    { nombre: "José Miguel", apellido: "Gomez Ramos", sueldo: 2300.00 },
    { nombre: "Eliodoro", apellido: "González Martínez", sueldo: 2900.00 },
    { nombre: "William Axel", apellido: "González Rosales", sueldo: 2900.00 },
    { nombre: "José Rodrigo", apellido: "Hernandez Rosas", sueldo: 2900.00 },
    { nombre: "José Fernando", apellido: "Hernández Bejarano", sueldo: 3000.00 },
    { nombre: "Alan Daniel", apellido: "Marmolejo Montes", sueldo: 3700.00 },
    { nombre: "Samuel", apellido: "Medina Geronimo", sueldo: 4300.00 },
    { nombre: "José Ernesto", apellido: "Murillo Pérez", sueldo: 2300.00 },
    { nombre: "Maria Anabel", apellido: "Ochoa García", sueldo: 1800.00 },
    { nombre: "Guillermo", apellido: "Ponce Alvarado", sueldo: 6000.00 },
    { nombre: "Luz Mercedes", apellido: "Puente Maldonado", sueldo: 1800.00 },
    { nombre: "Antonio Guadalupe", apellido: "Ramirez Escareño", sueldo: 2300.00 },
    { nombre: "Diego Esteban", apellido: "Ramos Jurado", sueldo: 2300.00 },
    { nombre: "Rogelio", apellido: "Regalado Contreras", sueldo: 2300.00 },
    { nombre: "Pablo Enrique", apellido: "Rodriguez Ramírez", sueldo: 2500.00 },
    { nombre: "Ramiro", apellido: "Rojas Aguilar", sueldo: 4300.00 },
    { nombre: "Marino", apellido: "Romero Palmero", sueldo: 3000.00 },
    { nombre: "Miguel Angel", apellido: "Sánchez Nava", sueldo: 3500.00 },
    { nombre: "Christian Noel", apellido: "Sánchez Solano", sueldo: 3000.00 },
    { nombre: "Veronica", apellido: "Solano Pulgarin", sueldo: 2000.00 },
    { nombre: "Erick Manuel", apellido: "Valdovinos Llerenas", sueldo: 3000.00 },
    { nombre: "Edy Leonel", apellido: "Gonzalez Camargo", sueldo: 2300.00 },
    { nombre: "Pablo Zaid", apellido: "Rodriguez Muñiz", sueldo: 2300.00 },
    { nombre: "José Efren", apellido: "Marmolejo Cervantes", sueldo: 3700.00 },
    { nombre: "Carlos Antonio", apellido: "Montes Fuentes", sueldo: 2300.00 },
    { nombre: "Orlando Gabaniel", apellido: "Gonzalez Flores", sueldo: 3000.00 }
];

// Leer información de capacitación del Excel
let infoCapacitacion = {};

if (EXCEL_PATH && fs.existsSync(EXCEL_PATH)) {
    try {
        const workbook = XLSX.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        // Procesar datos del Excel
        data.forEach(row => {
            const nombreCompleto = (row['NOMBRE'] || row['Nombre'] || '').toString().trim();
            if (nombreCompleto) {
                // Normalizar nombre para búsqueda
                const nombreNormalizado = nombreCompleto.toUpperCase().replace(/\s+/g, ' ');
                infoCapacitacion[nombreNormalizado] = row;
            }
        });
        
        console.log(`✅ Archivo de capacitación leído: ${data.length} registros encontrados`);
    } catch (error) {
        console.log(`⚠️ No se pudo leer el archivo de capacitación: ${error.message}`);
    }
} else {
    console.log(`⚠️ Archivo de capacitación no encontrado: ${EXCEL_PATH}`);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Base de datos conectada');
    iniciarProceso();
});

function buscarInfoCapacitacion(nombre, apellido) {
    const nombreCompleto = `${nombre} ${apellido}`.toUpperCase().trim();
    
    // Buscar coincidencia exacta
    if (infoCapacitacion[nombreCompleto]) {
        return infoCapacitacion[nombreCompleto];
    }
    
    // Buscar coincidencia parcial
    for (const key in infoCapacitacion) {
        if (key.includes(nombre.toUpperCase()) || key.includes(apellido.toUpperCase())) {
            return infoCapacitacion[key];
        }
    }
    
    return null;
}

async function iniciarProceso() {
    console.log('\n🔄 Iniciando proceso de importación...\n');
    
    // Paso 1: Marcar todos los empleados actuales como inactivos
    db.run('UPDATE empleados SET activo = 0', (err) => {
        if (err) {
            console.error('Error al desactivar empleados:', err);
            db.close();
            return;
        }
        console.log('✅ Empleados anteriores marcados como inactivos');
        
        // Paso 2: Insertar nuevos empleados
        insertarEmpleados();
    });
}

async function insertarEmpleados() {
    console.log('\n📝 Insertando nuevos empleados...\n');
    
    let insertados = 0;
    let errores = 0;
    
    for (const emp of empleadosNuevos) {
        await new Promise((resolve) => {
            // Determinar área basado en el nombre (GeoCycle tiene nombres específicos)
            const nombresGeoCycle = ['Iker', 'Rodrigo', 'Eliodoro', 'Williams', 'William', 'Carlos Antonio', 'Edy Leonel', 'Pablo Zaid', 'Antonio Guadalupe', 'Diego Esteban', 'Julian Adolfo', 'Marino', 'Miguel Angel'];
            const esGeoCycle = nombresGeoCycle.some(n => emp.nombre.includes(n) || emp.apellido.includes('González') && emp.nombre.includes('Eliodoro'));
            
            // Ajustar área basado en nombres conocidos de GeoCycle
            let area = 'Planta';
            if (emp.nombre.includes('Iker') || 
                emp.nombre.includes('Rodrigo') && emp.apellido.includes('Hernandez') ||
                emp.nombre.includes('Eliodoro') ||
                emp.nombre.includes('William') ||
                emp.nombre.includes('Carlos Antonio') ||
                emp.nombre.includes('Edy Leonel') ||
                emp.nombre.includes('Pablo Zaid') ||
                emp.nombre.includes('Antonio Guadalupe') ||
                emp.nombre.includes('Diego Esteban') ||
                emp.nombre.includes('Julian Adolfo') ||
                emp.nombre.includes('Marino') ||
                (emp.nombre.includes('Miguel Angel') && emp.apellido.includes('Sánchez'))) {
                area = 'GeoCycle';
            }
            
            const codigo = generarCodigo(emp.nombre, emp.apellido);
            
            // Buscar información de capacitación
            const infoCap = buscarInfoCapacitacion(emp.nombre, emp.apellido);
            
            // Insertar empleado
            db.run(
                `INSERT INTO empleados (codigo, nombre, apellido, area, sueldo_base, activo) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [codigo, emp.nombre.trim(), emp.apellido.trim(), area, emp.sueldo, 1],
                async function(err) {
                    if (err) {
                        console.error(`❌ Error al insertar ${emp.nombre} ${emp.apellido}:`, err.message);
                        errores++;
                        resolve();
                        return;
                    }
                    
                    const empleadoId = this.lastID;
                    insertados++;
                    
                    // Insertar información de exámenes médicos si existe
                    if (infoCap) {
                        const quimica = infoCap['QUIMICA SANGUINEA'] || infoCap['Química Sanguínea'] || 0;
                        const antidoping = infoCap['ANTIDOPING'] || infoCap['Antidoping'] || 0;
                        const electro = infoCap['ELECTROCARDIOGRAMA'] || infoCap['Electrocardiograma'] || 0;
                        const espiro = infoCap['ESPIROMETRIAS'] || infoCap['Espirometrías'] || 0;
                        const audio = infoCap['AUDIOMETRIAS'] || infoCap['Audiometrías'] || 0;
                        
                        db.run(
                            `INSERT OR REPLACE INTO examenes_medicos 
                             (empleado_id, quimica_sanguinea, antidoping, electrocardiogram, espirometrias, audiometrias, 
                              vigencia_de, fecha_nacimiento, vence_induccion, mandar_a_curso)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                empleadoId,
                                quimica ? 1 : 0,
                                antidoping ? 1 : 0,
                                electro ? 1 : 0,
                                espiro ? 1 : 0,
                                audio ? 1 : 0,
                                infoCap['VIGENCIA DE'] || infoCap['Vigencia de'] || null,
                                infoCap['FECHA DE NACIMIENTO'] || infoCap['Fecha de Nacimiento'] || null,
                                infoCap['VENCE INDUCCION'] || infoCap['Vence Inducción'] || null,
                                infoCap['MANDAR A CURSO'] || infoCap['Mandar a Curso'] || null
                            ],
                            (err) => {
                                if (err) {
                                    console.log(`⚠️ No se pudo insertar exámenes para ${emp.nombre} ${emp.apellido}`);
                                }
                            }
                        );
                    }
                    
                    console.log(`✅ ${insertados}. ${emp.nombre} ${emp.apellido} - ${area} - $${emp.sueldo.toFixed(2)} - Código: ${codigo}`);
                    resolve();
                }
            );
        });
    }
    
    setTimeout(() => {
        console.log(`\n✅ Proceso completado:`);
        console.log(`   - Empleados insertados: ${insertados}`);
        console.log(`   - Errores: ${errores}`);
        console.log(`\n💡 Los códigos QR se generan automáticamente al acceder a cada empleado en el sistema.`);
        db.close();
    }, 2000);
}

