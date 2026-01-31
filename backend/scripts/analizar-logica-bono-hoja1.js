const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Bitacora 2026 de Trituracion de Llanta  con Bono de Produccion    Enero 2026.xlsx');

console.log('💰 Análisis Detallado de Lógica de Bonos - Hoja1\n');

const workbook = XLSX.readFile(EXCEL_PATH);
const sheet = workbook.Sheets['Hoja1'];

if (!sheet) {
    console.error('No se encontró la hoja Hoja1');
    process.exit(1);
}

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

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 ESTRUCTURA DE CÁLCULO DE BONOS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Analizar estructura: parece ser:
// Col 0: Nombre empleado
// Col 1: Toneladas en rango específico
// Col 2: Turno
// Col 3: Precio por tonelada (varía según rango)
// Col 4: Bono calculado (toneladas * precio)
// Col 5: Bono acumulado

console.log('Datos completos de Hoja1:\n');
data.forEach((row, i) => {
    if (row.some(cell => cell !== '' && cell !== null && cell !== undefined)) {
        console.log(`Fila ${i + 1}:`);
        row.forEach((cell, j) => {
            if (cell !== '' && cell !== null && cell !== undefined) {
                console.log(`   Col ${j}: ${cell}`);
            }
        });
        console.log('');
    }
});

// Analizar lógica de precios por rango
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('💵 ANÁLISIS DE PRECIOS POR RANGO DE TONELADAS');
console.log('═══════════════════════════════════════════════════════════════\n');

const preciosPorRango = new Map();
const empleadosBonos = new Map();

let empleadoActual = '';
data.forEach((row, i) => {
    const nombre = row[0];
    const toneladas = row[1];
    const turno = row[2];
    const precio = row[3];
    const bono = row[4];
    const acumulado = row[5];
    
    if (nombre && String(nombre).trim()) {
        empleadoActual = String(nombre).trim();
        if (!empleadosBonos.has(empleadoActual)) {
            empleadosBonos.set(empleadoActual, []);
        }
    }
    
    if (empleadoActual && toneladas !== '' && !isNaN(toneladas) && precio !== '' && !isNaN(precio)) {
        const registro = {
            empleado: empleadoActual,
            toneladas: parseFloat(toneladas),
            turno: turno ? String(turno).trim() : '',
            precio: parseFloat(precio),
            bono: bono !== '' && !isNaN(bono) ? parseFloat(bono) : null,
            acumulado: acumulado !== '' && !isNaN(acumulado) ? parseFloat(acumulado) : null
        };
        
        empleadosBonos.get(empleadoActual).push(registro);
        
        // Agrupar precios por rango (aproximado por el precio)
        const keyPrecio = precio.toFixed(2);
        if (!preciosPorRango.has(keyPrecio)) {
            preciosPorRango.set(keyPrecio, []);
        }
        preciosPorRango.get(keyPrecio).push(registro);
    }
});

console.log('Precios identificados por tonelada:\n');
preciosPorRango.forEach((registros, precio) => {
    const toneladasPromedio = registros.reduce((sum, r) => sum + r.toneladas, 0) / registros.length;
    console.log(`   $${precio}/ton: ${registros.length} registros, promedio ${toneladasPromedio.toFixed(2)} ton`);
    console.log(`      Rango estimado de toneladas: ${Math.min(...registros.map(r => r.toneladas)).toFixed(2)} - ${Math.max(...registros.map(r => r.toneladas)).toFixed(2)}`);
});

console.log('\n\nBonos por empleado:\n');
empleadosBonos.forEach((registros, empleado) => {
    console.log(`\n👤 ${empleado}:`);
    let totalBono = 0;
    registros.forEach(reg => {
        const bonoCalculado = reg.toneladas * reg.precio;
        console.log(`   ${reg.toneladas} ton × $${reg.precio}/ton = $${bonoCalculado.toFixed(2)} (Turno ${reg.turno})`);
        if (reg.bono) {
            console.log(`      Bono registrado: $${reg.bono.toFixed(2)} ${Math.abs(bonoCalculado - reg.bono) < 0.01 ? '✅' : '⚠️'}`);
        }
        totalBono += bonoCalculado;
    });
    const ultimoAcumulado = registros[registros.length - 1].acumulado;
    if (ultimoAcumulado) {
        console.log(`   Total acumulado: $${ultimoAcumulado.toFixed(2)}`);
        console.log(`   Total calculado: $${totalBono.toFixed(2)} ${Math.abs(ultimoAcumulado - totalBono) < 0.01 ? '✅' : '⚠️'}`);
    }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Análisis completado');
console.log('═══════════════════════════════════════════════════════════════\n');

