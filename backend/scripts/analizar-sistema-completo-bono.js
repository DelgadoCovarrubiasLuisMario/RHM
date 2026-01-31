const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Bitacora 2026 de Trituracion de Llanta  con Bono de Produccion    Enero 2026.xlsx');

console.log('🔍 Análisis Completo del Sistema de Bonos\n');

const workbook = XLSX.readFile(EXCEL_PATH);

// Analizar todas las hojas relevantes
const hojasRelevantes = ['Reporte Enero  2026 ', 'Produccion', 'Hoja1'];

hojasRelevantes.forEach(hojaNombre => {
    const sheet = workbook.Sheets[hojaNombre];
    if (!sheet) {
        console.log(`⚠️  Hoja "${hojaNombre}" no encontrada\n`);
        return;
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📊 ANÁLISIS DE HOJA: ${hojaNombre}`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
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
    
    // Mostrar estructura de la hoja
    console.log(`Rango: ${sheet['!ref']}`);
    console.log(`Filas: ${data.length}\n`);
    
    if (hojaNombre === 'Reporte Enero  2026 ') {
        // Análisis detallado del complemento/bono
        let headerRow = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const rowStr = data[i].join('|').toUpperCase();
            if (rowStr.includes('FECHA') && rowStr.includes('PERSONAL')) {
                headerRow = i;
                break;
            }
        }
        
        console.log('💰 ANÁLISIS DE CÁLCULO DE COMPLEMENTO/BONO MONETARIO:\n');
        
        const registrosConComplemento = [];
        for (let i = headerRow + 1; i < Math.min(100, data.length); i++) {
            const row = data[i];
            const personal = row[2];
            const toneladas = row[3];
            const turno = row[4];
            const complemento = row[17];
            
            if (personal && String(personal).trim() && 
                !String(personal).toUpperCase().includes('TONELADAS') &&
                complemento && !isNaN(complemento) && complemento > 0) {
                
                registrosConComplemento.push({
                    personal: String(personal).trim(),
                    toneladas: toneladas !== '' && !isNaN(toneladas) ? parseFloat(toneladas) : 0,
                    turno: turno,
                    complemento: parseFloat(complemento)
                });
            }
        }
        
        if (registrosConComplemento.length > 0) {
            console.log(`Registros con complemento calculado: ${registrosConComplemento.length}\n`);
            
            // Analizar relación entre toneladas y complemento
            registrosConComplemento.slice(0, 15).forEach(reg => {
                console.log(`   ${reg.personal}: ${reg.toneladas} ton → $${reg.complemento.toFixed(2)}`);
                
                // Intentar encontrar la relación
                if (reg.toneladas > 0) {
                    const ratio = reg.complemento / reg.toneladas;
                    console.log(`      Ratio: $${ratio.toFixed(2)} por tonelada`);
                }
            });
            
            // Buscar patrones por rango de toneladas
            console.log('\n   📈 Análisis por rangos:\n');
            const rangos = {
                '< 25': registrosConComplemento.filter(r => r.toneladas < 25),
                '25-30': registrosConComplemento.filter(r => r.toneladas >= 25 && r.toneladas < 30),
                '30-35': registrosConComplemento.filter(r => r.toneladas >= 30 && r.toneladas < 35),
                '35-40': registrosConComplemento.filter(r => r.toneladas >= 35 && r.toneladas < 40),
                '40+': registrosConComplemento.filter(r => r.toneladas >= 40)
            };
            
            Object.entries(rangos).forEach(([rango, casos]) => {
                if (casos.length > 0) {
                    const promedioRatio = casos.reduce((sum, c) => {
                        if (c.toneladas > 0) return sum + (c.complemento / c.toneladas);
                        return sum;
                    }, 0) / casos.length;
                    console.log(`      ${rango} ton: ${casos.length} casos, ratio promedio: $${promedioRatio.toFixed(2)}/ton`);
                }
            });
        }
    }
    
    if (hojaNombre === 'Produccion') {
        console.log('📊 ESTRUCTURA DE HOJA PRODUCCION:\n');
        
        // Mostrar primeras 20 filas
        for (let i = 0; i < Math.min(20, data.length); i++) {
            const row = data[i];
            const rowStr = row.slice(0, 15).map(cell => {
                if (cell === null || cell === undefined) return '';
                if (typeof cell === 'number') return cell.toString();
                return String(cell).substring(0, 15);
            }).join(' | ');
            
            if (rowStr.trim() || i < 5) {
                console.log(`Fila ${i + 1}: ${rowStr}`);
            }
        }
        
        // Analizar estructura de rangos
        console.log('\n   🔍 Buscando estructura de rangos de producción...\n');
        
        // Buscar fila con "RANGO"
        let filaRango = -1;
        for (let i = 0; i < Math.min(10, data.length); i++) {
            if (data[i][0] && String(data[i][0]).toUpperCase().includes('RANGO')) {
                filaRango = i;
                break;
            }
        }
        
        if (filaRango >= 0) {
            console.log(`   Encabezados encontrados en fila ${filaRango + 1}:`);
            data[filaRango].forEach((cell, i) => {
                if (cell && String(cell).trim()) {
                    console.log(`      Col ${i + 1}: ${cell}`);
                }
            });
        }
    }
    
    if (hojaNombre === 'Hoja1') {
        console.log('📊 ESTRUCTURA DE HOJA1 (Parece ser resumen de bonos):\n');
        
        // Mostrar todas las filas
        for (let i = 0; i < Math.min(20, data.length); i++) {
            const row = data[i];
            const rowStr = row.map(cell => {
                if (cell === null || cell === undefined) return '';
                if (typeof cell === 'number') return cell.toString();
                return String(cell).substring(0, 20);
            }).join(' | ');
            
            if (rowStr.trim()) {
                console.log(`Fila ${i + 1}: ${rowStr}`);
            }
        }
        
        // Analizar si hay cálculos de bono total por empleado
        console.log('\n   🔍 Analizando cálculos de bono total...\n');
        
        const empleadosBonos = new Map();
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const nombre = row[0];
            const valores = row.slice(1, 5).filter(v => v !== '' && !isNaN(v)).map(v => parseFloat(v));
            
            if (nombre && String(nombre).trim() && !String(nombre).toUpperCase().includes('WILLIAMS') && !String(nombre).toUpperCase().includes('ELIODORO')) {
                if (valores.length > 0) {
                    empleadosBonos.set(String(nombre).trim(), valores);
                }
            }
        }
        
        empleadosBonos.forEach((valores, nombre) => {
            console.log(`   ${nombre}: ${valores.join(', ')}`);
            if (valores.length >= 4) {
                const suma = valores.reduce((a, b) => a + b, 0);
                console.log(`      Total: ${suma.toFixed(2)}`);
            }
        });
    }
    
    console.log('\n');
});

// Análisis de equipos y turnos
console.log('═══════════════════════════════════════════════════════════════');
console.log('👥 ANÁLISIS DE EQUIPOS Y ASIGNACIÓN DE TURNOS');
console.log('═══════════════════════════════════════════════════════════════\n');

const sheetReporteName = workbook.SheetNames.find(name => name.includes('Enero') && name.includes('2026'));
if (!sheetReporteName) {
    console.log('⚠️  No se encontró la hoja de reporte\n');
} else {
const sheetReporte = workbook.Sheets[sheetReporteName];
const rangeReporte = XLSX.utils.decode_range(sheetReporte['!ref'] || 'A1:Z1');
const dataReporte = [];
for (let R = rangeReporte.s.r; R <= rangeReporte.e.r; R++) {
    const row = [];
    for (let C = rangeReporte.s.c; C <= rangeReporte.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
        const cell = sheetReporte[cellAddress];
        row.push(cell ? cell.v : '');
    }
    dataReporte.push(row);
}

// Encontrar encabezados
let headerRowReporte = -1;
for (let i = 0; i < Math.min(10, dataReporte.length); i++) {
    const rowStr = dataReporte[i].join('|').toUpperCase();
    if (rowStr.includes('FECHA') && rowStr.includes('PERSONAL')) {
        headerRowReporte = i;
        break;
    }
}

// Agrupar por fecha y turno para ver composición de equipos
const equiposPorFechaTurno = new Map();

for (let i = headerRowReporte + 1; i < dataReporte.length; i++) {
    const row = dataReporte[i];
    const fecha = row[1];
    const personal = row[2];
    const turno = row[4];
    
    if (fecha && personal && turno && String(personal).trim() && 
        !String(personal).toUpperCase().includes('TONELADAS')) {
        
        const key = `${fecha}_${turno}`;
        if (!equiposPorFechaTurno.has(key)) {
            equiposPorFechaTurno.set(key, []);
        }
        equiposPorFechaTurno.get(key).push(String(personal).trim());
    }
}

console.log('📅 Equipos por fecha y turno (primeros 20 días):\n');

let diasMostrados = 0;
equiposPorFechaTurno.forEach((empleados, key) => {
    if (diasMostrados < 20) {
        const [fecha, turno] = key.split('_');
        console.log(`   Fecha ${fecha}, Turno ${turno}: ${empleados.join(', ')}`);
        diasMostrados++;
    }
});

// Analizar patrones de asignación
console.log('\n   🔄 Patrones de asignación de turnos:\n');
const asignacionesPorEmpleado = new Map();

equiposPorFechaTurno.forEach((empleados, key) => {
    const [fecha, turno] = key.split('_');
    empleados.forEach(emp => {
        if (!asignacionesPorEmpleado.has(emp)) {
            asignacionesPorEmpleado.set(emp, { turno1: 0, turno2: 0, turno3: 0 });
        }
        const asign = asignacionesPorEmpleado.get(emp);
        if (turno === '1') asign.turno1++;
        else if (turno === '2') asign.turno2++;
        else if (turno === '3') asign.turno3++;
    });
});

asignacionesPorEmpleado.forEach((asign, emp) => {
    const total = asign.turno1 + asign.turno2 + asign.turno3;
    if (total > 5) {
        console.log(`   ${emp}: Turno 1: ${asign.turno1}, Turno 2: ${asign.turno2}, Turno 3: ${asign.turno3} (Total: ${total})`);
    }
});
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Análisis completo finalizado');
console.log('═══════════════════════════════════════════════════════════════\n');

