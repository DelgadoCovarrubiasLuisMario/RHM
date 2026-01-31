const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Bitacora 2026 de Trituracion de Llanta  con Bono de Produccion    Enero 2026.xlsx');

console.log('🔍 Análisis de Lógica de Puntos por Rangos\n');

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames.find(name => name.includes('Enero') && name.includes('2026'));
const sheet = workbook.Sheets[sheetName];

const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:Z1');
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

// Encontrar encabezados
let headerRow = -1;
for (let i = 0; i < Math.min(10, data.length); i++) {
    const rowStr = data[i].join('|').toUpperCase();
    if (rowStr.includes('FECHA') && rowStr.includes('PERSONAL')) {
        headerRow = i;
        break;
    }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 ANÁLISIS DE PUNTOS POR RANGO');
console.log('═══════════════════════════════════════════════════════════════\n');

// Analizar casos específicos para entender la lógica de puntos
const casosAnalisis = [];

for (let i = headerRow + 1; i < Math.min(100, data.length); i++) {
    const row = data[i];
    const personal = row[2];
    const toneladas = row[3];
    const turno = row[4];
    
    // Columnas de rangos: 9 (25-30), 10 (30-35), 11 (35-40), 12 (40+)
    const rango25_30 = row[9];
    const rango30_35 = row[10];
    const rango35_40 = row[11];
    const rango40 = row[12];
    
    if (personal && String(personal).trim() && 
        !String(personal).toUpperCase().includes('TONELADAS') &&
        toneladas !== '' && !isNaN(toneladas) && parseFloat(toneladas) > 0) {
        
        const ton = parseFloat(toneladas);
        const reg = {
            personal: String(personal).trim(),
            toneladas: ton,
            turno: turno ? String(turno).trim() : '',
            rango25_30: rango25_30 !== '' && !isNaN(rango25_30) ? parseFloat(rango25_30) : null,
            rango30_35: rango30_35 !== '' && !isNaN(rango30_35) ? parseFloat(rango30_35) : null,
            rango35_40: rango35_40 !== '' && !isNaN(rango35_40) ? parseFloat(rango35_40) : null,
            rango40: rango40 !== '' && !isNaN(rango40) ? parseFloat(rango40) : null
        };
        
        casosAnalisis.push(reg);
    }
}

console.log('📋 CASOS DE EJEMPLO PARA ENTENDER LA LÓGICA DE PUNTOS:\n');

casosAnalisis.slice(0, 20).forEach(reg => {
    console.log(`\n👤 ${reg.personal} - ${reg.toneladas} ton - Turno ${reg.turno}`);
    
    // Determinar en qué rango cae
    let rangoPrincipal = '';
    let puntosEnRango = 0;
    
    if (reg.toneladas < 25) {
        rangoPrincipal = '< 25';
        console.log(`   ❌ No alcanza el mínimo (25 ton)`);
    } else if (reg.toneladas >= 25 && reg.toneladas < 30) {
        rangoPrincipal = '25-30';
        puntosEnRango = reg.toneladas - 25;
        console.log(`   ✅ Rango 25-30: ${puntosEnRango.toFixed(2)} puntos (${reg.toneladas} - 25)`);
    } else if (reg.toneladas >= 30 && reg.toneladas < 35) {
        rangoPrincipal = '30-35';
        puntosEnRango = reg.toneladas - 30;
        console.log(`   ✅ Rango 30-35: ${puntosEnRango.toFixed(2)} puntos (${reg.toneladas} - 30)`);
    } else if (reg.toneladas >= 35 && reg.toneladas < 40) {
        rangoPrincipal = '35-40';
        puntosEnRango = reg.toneladas - 35;
        console.log(`   ✅ Rango 35-40: ${puntosEnRango.toFixed(2)} puntos (${reg.toneladas} - 35)`);
    } else if (reg.toneladas >= 40) {
        rangoPrincipal = '40+';
        puntosEnRango = reg.toneladas - 40;
        console.log(`   ✅ Rango 40+: ${puntosEnRango.toFixed(2)} puntos (${reg.toneladas} - 40)`);
    }
    
    console.log(`   Valores en Excel:`);
    console.log(`      Col 25-30: ${reg.rango25_30 !== null ? reg.rango25_30 : 'N/A'}`);
    console.log(`      Col 30-35: ${reg.rango30_35 !== null ? reg.rango30_35 : 'N/A'}`);
    console.log(`      Col 35-40: ${reg.rango35_40 !== null ? reg.rango35_40 : 'N/A'}`);
    console.log(`      Col 40+: ${reg.rango40 !== null ? reg.rango40 : 'N/A'}`);
    
    // Verificar si los puntos calculados coinciden
    if (rangoPrincipal === '25-30' && reg.rango25_30 !== null) {
        const coincide = Math.abs(reg.rango25_30 - puntosEnRango) < 0.1;
        console.log(`      ${coincide ? '✅' : '⚠️'} Coincide: ${coincide ? 'SÍ' : 'NO'}`);
    } else if (rangoPrincipal === '30-35' && reg.rango30_35 !== null) {
        const coincide = Math.abs(reg.rango30_35 - puntosEnRango) < 0.1;
        console.log(`      ${coincide ? '✅' : '⚠️'} Coincide: ${coincide ? 'SÍ' : 'NO'}`);
    } else if (rangoPrincipal === '35-40' && reg.rango35_40 !== null) {
        const coincide = Math.abs(reg.rango35_40 - puntosEnRango) < 0.1;
        console.log(`      ${coincide ? '✅' : '⚠️'} Coincide: ${coincide ? 'SÍ' : 'NO'}`);
    } else if (rangoPrincipal === '40+' && reg.rango40 !== null) {
        const coincide = Math.abs(reg.rango40 - puntosEnRango) < 0.1;
        console.log(`      ${coincide ? '✅' : '⚠️'} Coincide: ${coincide ? 'SÍ' : 'NO'}`);
    }
});

// Agrupar por empleado para ver suma mensual
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📊 SUMA MENSUAL POR EMPLEADO Y RANGO');
console.log('═══════════════════════════════════════════════════════════════\n');

const sumaPorEmpleado = new Map();

casosAnalisis.forEach(reg => {
    const nombre = reg.personal.toUpperCase();
    if (!sumaPorEmpleado.has(nombre)) {
        sumaPorEmpleado.set(nombre, {
            nombre: nombre,
            rango25_30: 0,
            rango30_35: 0,
            rango35_40: 0,
            rango40: 0,
            totalDias: 0
        });
    }
    
    const suma = sumaPorEmpleado.get(nombre);
    suma.totalDias++;
    
    // Calcular puntos en cada rango
    if (reg.toneladas >= 25 && reg.toneladas < 30) {
        suma.rango25_30 += (reg.toneladas - 25);
    } else if (reg.toneladas >= 30 && reg.toneladas < 35) {
        suma.rango30_35 += (reg.toneladas - 30);
    } else if (reg.toneladas >= 35 && reg.toneladas < 40) {
        suma.rango35_40 += (reg.toneladas - 35);
    } else if (reg.toneladas >= 40) {
        suma.rango40 += (reg.toneladas - 40);
    }
});

sumaPorEmpleado.forEach((suma, nombre) => {
    console.log(`\n👤 ${nombre}:`);
    console.log(`   Rango 25-30: ${suma.rango25_30.toFixed(2)} puntos`);
    console.log(`   Rango 30-35: ${suma.rango35_40.toFixed(2)} puntos`);
    console.log(`   Rango 35-40: ${suma.rango35_40.toFixed(2)} puntos`);
    console.log(`   Rango 40+: ${suma.rango40.toFixed(2)} puntos`);
    console.log(`   Total días: ${suma.totalDias}`);
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Análisis completado');
console.log('═══════════════════════════════════════════════════════════════\n');

