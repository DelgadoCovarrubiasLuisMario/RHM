const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Bitacora 2026 de Trituracion de Llanta  con Bono de Produccion    Enero 2026.xlsx');

console.log('📋 Análisis de Bitácora de Trituración con Bono de Producción\n');

const workbook = XLSX.readFile(EXCEL_PATH);

// Analizar la hoja "Reporte Enero 2026"
const sheetName = workbook.SheetNames.find(name => name.includes('Enero') && name.includes('2026'));
if (!sheetName) {
    console.error('No se encontró la hoja de Enero 2026');
    console.log('Hojas disponibles:', workbook.SheetNames);
    process.exit(1);
}
const sheet = workbook.Sheets[sheetName];
console.log(`Analizando hoja: "${sheetName}"\n`);

if (!sheet) {
    console.error('No se encontró la hoja:', sheetName);
    process.exit(1);
}

// Obtener el rango de la hoja
const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');
console.log(`Rango de la hoja: ${sheet['!ref']}`);
console.log(`Filas: ${range.e.r + 1}, Columnas: ${range.e.c + 1}\n`);

// Leer datos fila por fila
const data = [];
for (let R = range.s.r; R <= range.e.r; R++) {
    const row = [];
    for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
        const cell = sheet[cellAddress];
        row.push(cell ? cell.v : '');
    }
    data.push(row);
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 ESTRUCTURA DE DATOS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Mostrar primeras 25 filas con datos
console.log('PRIMERAS 25 FILAS:\n');
for (let i = 0; i < Math.min(25, data.length); i++) {
    const row = data[i];
    const rowStr = row.slice(0, 15).map(cell => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'number') return cell.toString();
        return String(cell).substring(0, 20);
    }).join(' | ');
    
    if (rowStr.trim() || i < 5) {
        console.log(`Fila ${i + 1}: ${rowStr}`);
    }
}

// Buscar encabezados
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📌 ANÁLISIS DE ENCABEZADOS Y ESTRUCTURA');
console.log('═══════════════════════════════════════════════════════════════\n');

// Buscar fila con "FECHA", "PERSONAL", "TONELADAS"
let headerRow = -1;
for (let i = 0; i < Math.min(10, data.length); i++) {
    const rowStr = data[i].join('|').toUpperCase();
    if (rowStr.includes('FECHA') && (rowStr.includes('PERSONAL') || rowStr.includes('TONELADAS'))) {
        headerRow = i;
        break;
    }
}

if (headerRow >= 0) {
    console.log(`Encabezados encontrados en fila ${headerRow + 1}:`);
    const headers = data[headerRow];
    headers.forEach((h, i) => {
        if (h && String(h).trim()) {
            console.log(`   Col ${i + 1}: ${h}`);
        }
    });
}

// Analizar datos de producción
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('💰 ANÁLISIS DE PRODUCCIÓN Y BONOS');
console.log('═══════════════════════════════════════════════════════════════\n');

let ejemplos = 0;
const empleadosSet = new Set();
const turnosSet = new Set();

for (let i = (headerRow >= 0 ? headerRow + 1 : 0); i < Math.min(data.length, 100) && ejemplos < 20; i++) {
    const row = data[i];
    const dia = row[0];
    const fecha = row[1];
    const personal = row[2];
    const toneladas = row[3];
    const turno = row[4];
    
    // Buscar filas con datos de producción
    if (personal && String(personal).trim() && !String(personal).toUpperCase().includes('TONELADAS')) {
        ejemplos++;
        empleadosSet.add(String(personal).trim());
        if (turno) turnosSet.add(String(turno));
        
        console.log(`\n📊 Registro ${ejemplos}:`);
        console.log(`   Día: ${dia || 'N/A'}`);
        console.log(`   Fecha (Excel): ${fecha || 'N/A'}`);
        console.log(`   Personal: ${personal}`);
        console.log(`   Toneladas: ${toneladas || '0'}`);
        console.log(`   Turno: ${turno || 'N/A'}`);
        
        // Mostrar columnas de rangos (9-12)
        if (row.length > 12) {
            const rangos = {
                '25-30': row[9],
                '30-35': row[10],
                '35-40': row[11],
                '40+': row[12]
            };
            
            const rangosConValor = Object.entries(rangos)
                .filter(([k, v]) => v !== null && v !== undefined && v !== '' && v !== 0);
            
            if (rangosConValor.length > 0) {
                console.log(`   💰 Rangos de bono:`);
                rangosConValor.forEach(([k, v]) => {
                    console.log(`      ${k}: ${v}`);
                });
            }
        }
    }
}

console.log(`\n\n👥 Empleados únicos encontrados: ${empleadosSet.size}`);
Array.from(empleadosSet).forEach(emp => console.log(`   - ${emp}`));

console.log(`\n🔄 Turnos encontrados: ${Array.from(turnosSet).join(', ')}`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Análisis completado');
console.log('═══════════════════════════════════════════════════════════════\n');

