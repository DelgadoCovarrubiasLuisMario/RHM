const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Bitacora 2026 de Trituracion de Llanta  con Bono de Produccion    Enero 2026.xlsx');

console.log('💰 Análisis de Lógica de Cálculo de Bono de Producción\n');

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
    if (rowStr.includes('FECHA') && rowStr.includes('PERSONAL') && rowStr.includes('TONELADAS')) {
        headerRow = i;
        break;
    }
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 ANÁLISIS DE LÓGICA DE BONO');
console.log('═══════════════════════════════════════════════════════════════\n');

// Analizar casos específicos para entender la lógica
const casosEjemplo = [];

for (let i = headerRow + 1; i < Math.min(data.length, 200); i++) {
    const row = data[i];
    const personal = row[2];
    const toneladas = row[3];
    const turno = row[4];
    
    if (personal && String(personal).trim() && !isNaN(toneladas) && toneladas > 0) {
        const fecha = row[1];
        const dia = row[0];
        
        // Columnas de rangos: 9 (25-30), 10 (30-35), 11 (35-40), 12 (40+)
        const rango25_30 = row[9];
        const rango30_35 = row[10];
        const rango35_40 = row[11];
        const rango40 = row[12];
        
        casosEjemplo.push({
            personal: String(personal).trim(),
            fecha: fecha,
            dia: dia,
            toneladas: parseFloat(toneladas),
            turno: turno,
            rango25_30: rango25_30,
            rango30_35: rango30_35,
            rango35_40: rango35_40,
            rango40: rango40
        });
    }
}

console.log('📊 CASOS DE EJEMPLO PARA ENTENDER LA LÓGICA:\n');

// Agrupar por rangos de toneladas
const casosPorRango = {
    'Menos de 25': casosEjemplo.filter(c => c.toneladas < 25),
    '25-30': casosEjemplo.filter(c => c.toneladas >= 25 && c.toneladas < 30),
    '30-35': casosEjemplo.filter(c => c.toneladas >= 30 && c.toneladas < 35),
    '35-40': casosEjemplo.filter(c => c.toneladas >= 35 && c.toneladas < 40),
    '40 o más': casosEjemplo.filter(c => c.toneladas >= 40)
};

Object.entries(casosPorRango).forEach(([rango, casos]) => {
    if (casos.length > 0) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📦 RANGO: ${rango} toneladas (${casos.length} casos)`);
        console.log('─'.repeat(60));
        
        casos.slice(0, 5).forEach(caso => {
            console.log(`\n   Empleado: ${caso.personal}`);
            console.log(`   Toneladas: ${caso.toneladas}`);
            console.log(`   Turno: ${caso.turno}`);
            console.log(`   Valores en rangos:`);
            console.log(`     25-30: ${caso.rango25_30}`);
            console.log(`     30-35: ${caso.rango30_35}`);
            console.log(`     35-40: ${caso.rango35_40}`);
            console.log(`     40+: ${caso.rango40}`);
            
            // Intentar deducir la lógica
            if (caso.toneladas < 25) {
                console.log(`   💡 Lógica: Menos de 25 ton → valores negativos (penalización)`);
            } else if (caso.toneladas >= 25 && caso.toneladas < 30) {
                const diferencia = caso.toneladas - 25;
                console.log(`   💡 Lógica: 25-30 ton → diferencia de ${diferencia.toFixed(2)} sobre 25`);
            } else if (caso.toneladas >= 30 && caso.toneladas < 35) {
                const diferencia = caso.toneladas - 30;
                console.log(`   💡 Lógica: 30-35 ton → diferencia de ${diferencia.toFixed(2)} sobre 30`);
            } else if (caso.toneladas >= 35 && caso.toneladas < 40) {
                const diferencia = caso.toneladas - 35;
                console.log(`   💡 Lógica: 35-40 ton → diferencia de ${diferencia.toFixed(2)} sobre 35`);
            } else if (caso.toneladas >= 40) {
                const diferencia = caso.toneladas - 40;
                console.log(`   💡 Lógica: 40+ ton → diferencia de ${diferencia.toFixed(2)} sobre 40`);
            }
        });
    }
});

// Buscar patrones en los valores
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📈 PATRONES DETECTADOS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Analizar un caso específico
const caso25_30 = casosPorRango['25-30'][0];
if (caso25_30) {
    console.log('Ejemplo de cálculo para rango 25-30:');
    console.log(`   Toneladas: ${caso25_30.toneladas}`);
    console.log(`   Valor en columna 25-30: ${caso25_30.rango25_30}`);
    console.log(`   Diferencia sobre 25: ${(caso25_30.toneladas - 25).toFixed(2)}`);
    console.log(`   ¿Coincide?: ${Math.abs(caso25_30.rango25_30 - (caso25_30.toneladas - 25)) < 0.1 ? 'SÍ' : 'NO'}`);
}

const caso30_35 = casosPorRango['30-35'][0];
if (caso30_35) {
    console.log('\nEjemplo de cálculo para rango 30-35:');
    console.log(`   Toneladas: ${caso30_35.toneladas}`);
    console.log(`   Valor en columna 30-35: ${caso30_35.rango30_35}`);
    console.log(`   Diferencia sobre 30: ${(caso30_35.toneladas - 30).toFixed(2)}`);
    console.log(`   ¿Coincide?: ${Math.abs(caso30_35.rango30_35 - (caso30_35.toneladas - 30)) < 0.1 ? 'SÍ' : 'NO'}`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Análisis completado');
console.log('═══════════════════════════════════════════════════════════════\n');

