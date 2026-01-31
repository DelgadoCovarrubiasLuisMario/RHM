const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Bitacora 2026 de Trituracion de Llanta  con Bono de Produccion    Enero 2026.xlsx');

console.log('🔍 Análisis Completo de Cálculos de Bono\n');

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
console.log('📊 ANÁLISIS DETALLADO DE CÁLCULOS DE BONO');
console.log('═══════════════════════════════════════════════════════════════\n');

// Analizar casos específicos con todos los datos
const registros = [];
const empleadosMap = new Map();
const turnosPorDia = new Map();

for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    const dia = row[0];
    const fechaExcel = row[1];
    const personal = row[2];
    const toneladas = row[3];
    const turno = row[4];
    
    // Columnas de rangos y cálculos
    const col5 = row[5]; // Parece ser una copia de toneladas o cálculo
    const col6 = row[6];
    const col7 = row[7];
    const col8 = row[8];
    const rango25_30 = row[9];
    const rango30_35 = row[10];
    const rango35_40 = row[11];
    const rango40 = row[12];
    const rango25_30_2 = row[13]; // Parece haber duplicados
    const rango30_35_2 = row[14];
    const rango35_40_2 = row[15];
    const rango40_2 = row[16];
    const complemento = row[17];
    
    if (personal && String(personal).trim() && !String(personal).toUpperCase().includes('TONELADAS')) {
        const registro = {
            fila: i + 1,
            dia: dia,
            fechaExcel: fechaExcel,
            personal: String(personal).trim(),
            toneladas: toneladas !== '' && !isNaN(toneladas) ? parseFloat(toneladas) : 0,
            turno: turno ? String(turno).trim() : '',
            col5: col5,
            col6: col6,
            col7: col7,
            col8: col8,
            rango25_30: rango25_30 !== '' && !isNaN(rango25_30) ? parseFloat(rango25_30) : null,
            rango30_35: rango30_35 !== '' && !isNaN(rango30_35) ? parseFloat(rango30_35) : null,
            rango35_40: rango35_40 !== '' && !isNaN(rango35_40) ? parseFloat(rango35_40) : null,
            rango40: rango40 !== '' && !isNaN(rango40) ? parseFloat(rango40) : null,
            rango25_30_2: rango25_30_2 !== '' && !isNaN(rango25_30_2) ? parseFloat(rango25_30_2) : null,
            rango30_35_2: rango30_35_2 !== '' && !isNaN(rango30_35_2) ? parseFloat(rango30_35_2) : null,
            rango35_40_2: rango35_40_2 !== '' && !isNaN(rango35_40_2) ? parseFloat(rango35_40_2) : null,
            rango40_2: rango40_2 !== '' && !isNaN(rango40_2) ? parseFloat(rango40_2) : null,
            complemento: complemento
        };
        
        registros.push(registro);
        
        // Agrupar por empleado
        const nombreNormalizado = registro.personal.toUpperCase();
        if (!empleadosMap.has(nombreNormalizado)) {
            empleadosMap.set(nombreNormalizado, []);
        }
        empleadosMap.get(nombreNormalizado).push(registro);
        
        // Agrupar por día y turno
        if (fechaExcel && turno) {
            const key = `${fechaExcel}_${turno}`;
            if (!turnosPorDia.has(key)) {
                turnosPorDia.set(key, []);
            }
            turnosPorDia.get(key).push(registro);
        }
    }
}

console.log(`Total de registros analizados: ${registros.length}\n`);

// Analizar lógica de cálculo de bono
console.log('═══════════════════════════════════════════════════════════════');
console.log('💰 LÓGICA DE CÁLCULO DE BONO POR RANGO');
console.log('═══════════════════════════════════════════════════════════════\n');

const casosPorRango = {
    'Menos de 25': [],
    '25-30': [],
    '30-35': [],
    '35-40': [],
    '40+': []
};

registros.forEach(reg => {
    if (reg.toneladas > 0) {
        if (reg.toneladas < 25) casosPorRango['Menos de 25'].push(reg);
        else if (reg.toneladas >= 25 && reg.toneladas < 30) casosPorRango['25-30'].push(reg);
        else if (reg.toneladas >= 30 && reg.toneladas < 35) casosPorRango['30-35'].push(reg);
        else if (reg.toneladas >= 35 && reg.toneladas < 40) casosPorRango['35-40'].push(reg);
        else if (reg.toneladas >= 40) casosPorRango['40+'].push(reg);
    }
});

// Analizar cada rango en detalle
Object.entries(casosPorRango).forEach(([rango, casos]) => {
    if (casos.length > 0) {
        console.log(`\n${'─'.repeat(70)}`);
        console.log(`📦 RANGO: ${rango} toneladas (${casos.length} casos)`);
        console.log('─'.repeat(70));
        
        // Analizar primeros 10 casos
        casos.slice(0, 10).forEach(reg => {
            console.log(`\n   📋 ${reg.personal} - ${reg.toneladas} ton - Turno ${reg.turno} (Fila ${reg.fila})`);
            console.log(`      Rangos calculados:`);
            console.log(`        25-30: ${reg.rango25_30 !== null ? reg.rango25_30 : 'N/A'}`);
            console.log(`        30-35: ${reg.rango30_35 !== null ? reg.rango30_35 : 'N/A'}`);
            console.log(`        35-40: ${reg.rango35_40 !== null ? reg.rango35_40 : 'N/A'}`);
            console.log(`        40+: ${reg.rango40 !== null ? reg.rango40 : 'N/A'}`);
            
            // Intentar deducir la fórmula
            if (reg.toneladas < 25) {
                const diferencia = reg.toneladas - 25;
                console.log(`      💡 Diferencia sobre 25: ${diferencia.toFixed(2)}`);
                if (reg.rango25_30 !== null && Math.abs(reg.rango25_30 - diferencia) < 0.1) {
                    console.log(`      ✅ FÓRMULA: rango25_30 = toneladas - 25`);
                }
            } else if (reg.toneladas >= 25 && reg.toneladas < 30) {
                const diferencia = reg.toneladas - 25;
                console.log(`      💡 Diferencia sobre 25: ${diferencia.toFixed(2)}`);
                if (reg.rango25_30 !== null && Math.abs(reg.rango25_30 - diferencia) < 0.1) {
                    console.log(`      ✅ FÓRMULA: rango25_30 = toneladas - 25`);
                }
            } else if (reg.toneladas >= 30 && reg.toneladas < 35) {
                const diferencia = reg.toneladas - 30;
                console.log(`      💡 Diferencia sobre 30: ${diferencia.toFixed(2)}`);
                if (reg.rango30_35 !== null && Math.abs(reg.rango30_35 - diferencia) < 0.1) {
                    console.log(`      ✅ FÓRMULA: rango30_35 = toneladas - 30`);
                }
            } else if (reg.toneladas >= 35 && reg.toneladas < 40) {
                const diferencia = reg.toneladas - 35;
                console.log(`      💡 Diferencia sobre 35: ${diferencia.toFixed(2)}`);
                if (reg.rango35_40 !== null && Math.abs(reg.rango35_40 - diferencia) < 0.1) {
                    console.log(`      ✅ FÓRMULA: rango35_40 = toneladas - 35`);
                }
            } else if (reg.toneladas >= 40) {
                const diferencia = reg.toneladas - 40;
                console.log(`      💡 Diferencia sobre 40: ${diferencia.toFixed(2)}`);
                if (reg.rango40 !== null && Math.abs(reg.rango40 - diferencia) < 0.1) {
                    console.log(`      ✅ FÓRMULA: rango40 = toneladas - 40`);
                }
            }
        });
    }
});

// Analizar patrones de turnos
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('🔄 ANÁLISIS DE PATRONES DE TURNOS Y EQUIPOS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Agrupar por fecha y turno
const equiposPorTurno = new Map();
turnosPorDia.forEach((registros, key) => {
    const [fecha, turno] = key.split('_');
    if (!equiposPorTurno.has(turno)) {
        equiposPorTurno.set(turno, []);
    }
    equiposPorTurno.get(turno).push({
        fecha: fecha,
        empleados: registros.map(r => r.personal),
        toneladasTotal: registros.reduce((sum, r) => sum + (r.toneladas || 0), 0)
    });
});

equiposPorTurno.forEach((equipos, turno) => {
    console.log(`\n🔄 TURNO ${turno}:`);
    console.log(`   Total de días registrados: ${equipos.length}`);
    
    // Analizar composición de equipos
    const composiciones = new Map();
    equipos.forEach(eq => {
        const key = eq.empleados.sort().join(', ');
        if (!composiciones.has(key)) {
            composiciones.set(key, []);
        }
        composiciones.get(key).push(eq);
    });
    
    console.log(`   Composiciones de equipo encontradas: ${composiciones.size}`);
    composiciones.forEach((ocurrencias, composicion) => {
        console.log(`      - ${composicion} (${ocurrencias.length} veces)`);
    });
});

// Analizar movimientos de empleados entre turnos
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('👥 ANÁLISIS DE MOVIMIENTOS DE EMPLEADOS ENTRE TURNOS');
console.log('═══════════════════════════════════════════════════════════════\n');

empleadosMap.forEach((registros, nombre) => {
    const turnosUsados = new Set(registros.map(r => r.turno).filter(t => t));
    const turnosArray = registros.map(r => ({ fecha: r.fechaExcel, turno: r.turno }))
        .filter(t => t.fecha && t.turno)
        .sort((a, b) => a.fecha - b.fecha);
    
    console.log(`\n👤 ${nombre}:`);
    console.log(`   Total registros: ${registros.length}`);
    console.log(`   Turnos utilizados: ${Array.from(turnosUsados).join(', ')}`);
    console.log(`   Producción total: ${registros.reduce((sum, r) => sum + (r.toneladas || 0), 0).toFixed(2)} ton`);
    console.log(`   Promedio diario: ${(registros.reduce((sum, r) => sum + (r.toneladas || 0), 0) / registros.length).toFixed(2)} ton`);
    
    // Analizar secuencia de turnos
    if (turnosArray.length > 5) {
        const secuencia = turnosArray.slice(0, 10).map(t => t.turno).join(' → ');
        console.log(`   Secuencia inicial: ${secuencia}...`);
    }
});

// Analizar columnas adicionales para entender mejor
console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📊 ANÁLISIS DE COLUMNAS ADICIONALES');
console.log('═══════════════════════════════════════════════════════════════\n');

// Buscar registros con valores en columnas adicionales
const registrosConCols = registros.filter(r => 
    (r.col5 && !isNaN(r.col5)) || 
    (r.complemento && !isNaN(r.complemento))
).slice(0, 10);

if (registrosConCols.length > 0) {
    console.log('Registros con valores en columnas adicionales:');
    registrosConCols.forEach(reg => {
        console.log(`\n   ${reg.personal} - ${reg.toneladas} ton:`);
        if (reg.col5) console.log(`      Col 5: ${reg.col5}`);
        if (reg.complemento) console.log(`      Complemento: ${reg.complemento}`);
    });
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Análisis completado');
console.log('═══════════════════════════════════════════════════════════════\n');

