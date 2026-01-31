const XLSX = require('xlsx');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../Bitacora 2026 de Trituracion de Llanta  con Bono de Produccion    Enero 2026.xlsx');

console.log('📋 RESUMEN COMPLETO Y PROPUESTA DE AUTOMATIZACIÓN\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 ANÁLISIS COMPLETO DEL SISTEMA DE BONOS');
console.log('═══════════════════════════════════════════════════════════════\n');

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetReporte = workbook.Sheets[workbook.SheetNames.find(name => name.includes('Enero') && name.includes('2026'))];
const sheetHoja1 = workbook.Sheets['Hoja1'];

// Analizar estructura de datos
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
let headerRow = -1;
for (let i = 0; i < Math.min(10, dataReporte.length); i++) {
    const rowStr = dataReporte[i].join('|').toUpperCase();
    if (rowStr.includes('FECHA') && rowStr.includes('PERSONAL')) {
        headerRow = i;
        break;
    }
}

// Analizar precios por rango desde Hoja1
const rangeHoja1 = XLSX.utils.decode_range(sheetHoja1['!ref'] || 'A1:Z1');
const dataHoja1 = [];
for (let R = rangeHoja1.s.r; R <= rangeHoja1.e.r; R++) {
    const row = [];
    for (let C = rangeHoja1.s.c; C <= rangeHoja1.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
        const cell = sheetHoja1[cellAddress];
        row.push(cell ? cell.v : '');
    }
    dataHoja1.push(row);
}

// Extraer precios por rango y turno
const preciosPorRangoTurno = new Map();
let empleadoActual = '';
dataHoja1.forEach(row => {
    const nombre = row[0];
    const toneladas = row[1];
    const turno = row[2];
    const precio = row[3];
    
    if (nombre && String(nombre).trim()) {
        empleadoActual = String(nombre).trim();
    }
    
    if (toneladas !== '' && !isNaN(toneladas) && precio !== '' && !isNaN(precio) && turno) {
        const ton = parseFloat(toneladas);
        const prec = parseFloat(precio);
        const turn = String(turno).trim();
        
        // Determinar rango basado en precio
        let rango = '';
        if (prec >= 19 && prec < 20) rango = '< 25';
        else if (prec >= 23 && prec < 24) rango = '25-30';
        else if (prec >= 24 && prec < 25) rango = '25-30';
        else if (prec >= 27 && prec < 28) rango = '30-35';
        else if (prec >= 29 && prec < 30) rango = '30-35';
        else if (prec >= 30 && prec < 31) rango = '35-40';
        else if (prec >= 33 && prec < 35) rango = '35-40';
        else if (prec >= 34 && prec < 35) rango = '40+';
        
        const key = `${rango}_${turn}`;
        if (!preciosPorRangoTurno.has(key)) {
            preciosPorRangoTurno.set(key, []);
        }
        preciosPorRangoTurno.get(key).push({ toneladas: ton, precio: prec, empleado: empleadoActual });
    }
});

console.log('💰 PRECIOS POR RANGO Y TURNO IDENTIFICADOS:\n');
preciosPorRangoTurno.forEach((valores, key) => {
    const [rango, turno] = key.split('_');
    const precioPromedio = valores.reduce((sum, v) => sum + v.precio, 0) / valores.length;
    console.log(`   ${rango} toneladas, Turno ${turno}: $${precioPromedio.toFixed(2)}/ton`);
});

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('📊 LÓGICA DE CÁLCULO IDENTIFICADA');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('1. REGISTRO DE PRODUCCIÓN:');
console.log('   - Cada empleado registra toneladas trituradas por día y turno');
console.log('   - Los rangos de bonificación son:');
console.log('     * Menos de 25 ton: Penalización (valores negativos)');
console.log('     * 25-30 ton: Bono base');
console.log('     * 30-35 ton: Bono mejorado');
console.log('     * 35-40 ton: Bono alto');
console.log('     * 40+ ton: Bono máximo');

console.log('\n2. CÁLCULO DE BONO:');
console.log('   - El bono se calcula como: toneladas × precio_por_tonelada');
console.log('   - El precio varía según:');
console.log('     * Rango de toneladas alcanzado');
console.log('     * Turno (Turno 2 vs Turno 3 tienen precios diferentes)');
console.log('     * Tipo de empleado (Operador vs Ayudante)');

console.log('\n3. PATRONES DE TURNOS:');
console.log('   - Cada día tiene 3 turnos (1, 2, 3)');
console.log('   - Los empleados pueden rotar entre turnos');
console.log('   - Cada turno puede tener 1 o más empleados');

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('🚀 PROPUESTA DE AUTOMATIZACIÓN');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📋 COMPONENTES A IMPLEMENTAR:\n');

console.log('1. BASE DE DATOS:');
console.log('   - Tabla: produccion_trituracion');
console.log('     * id, empleado_id, fecha, turno, toneladas, area');
console.log('   - Tabla: configuracion_bonos');
console.log('     * id, rango_min, rango_max, precio_turno2, precio_turno3, tipo_empleado');
console.log('   - Tabla: bonos_calculados');
console.log('     * id, produccion_id, bono_calculado, fecha_calculo');

console.log('\n2. INTERFAZ DE REGISTRO:');
console.log('   - Formulario para registrar producción diaria');
console.log('   - Selección de empleado, fecha, turno, toneladas');
console.log('   - Validación automática de rangos');
console.log('   - Vista previa del bono calculado');

console.log('\n3. CÁLCULO AUTOMÁTICO DE BONOS:');
console.log('   - Función que calcula bono según:');
console.log('     * Toneladas registradas');
console.log('     * Rango alcanzado (25-30, 30-35, 35-40, 40+)');
console.log('     * Turno del empleado');
console.log('     * Tipo de empleado (Operador/Ayudante)');
console.log('   - Fórmula: bono = toneladas × precio_rango_turno');

console.log('\n4. REPORTES Y DASHBOARDS:');
console.log('   - Producción diaria por empleado');
console.log('   - Bonos acumulados por período');
console.log('   - Comparativa entre turnos');
console.log('   - Gráficas de tendencias');

console.log('\n5. ASIGNACIÓN AUTOMÁTICA DE TURNOS:');
console.log('   - Sistema de rotación automática');
console.log('   - Alertas de cambios de turno');
console.log('   - Historial de asignaciones');

console.log('\n6. INTEGRACIÓN CON EXCEL (OPCIONAL):');
console.log('   - Importación automática desde Excel');
console.log('   - Exportación de reportes a Excel');
console.log('   - Sincronización bidireccional');

console.log('\n\n═══════════════════════════════════════════════════════════════');
console.log('💡 VENTAJAS DE LA AUTOMATIZACIÓN');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('✅ Eliminación de errores manuales en cálculos');
console.log('✅ Cálculo instantáneo de bonos');
console.log('✅ Historial completo y trazable');
console.log('✅ Reportes automáticos y en tiempo real');
console.log('✅ Facilidad para ajustar precios y rangos');
console.log('✅ Integración con el sistema de empleados existente');
console.log('✅ División automática por área (Planta/GeoCycle)');
console.log('✅ Notificaciones de cambios y alertas');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('✅ Análisis y propuesta completados');
console.log('═══════════════════════════════════════════════════════════════\n');

