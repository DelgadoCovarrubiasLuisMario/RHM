/**
 * Smoke tests para lógica de jornadas (sin servidor).
 * Ejecutar: node backend/scripts/test-asistencia-jornada.js
 */
const assert = require('assert');
const {
    parsearFechaHora,
    encontrarEntradasAbiertas,
    calcularTiempoTrabajado,
    redondearABloques15Minutos,
    formatearHorasDecimales
} = require('../routes/asistencia')._test;

function ok(name) {
    console.log('✓', name);
}

// Bug original: string compare decía que 4:30 p.m. NO es después de 7:00 a.m.
{
    const entrada = '07:00:00 a.m.';
    const salida = '04:30:00 p.m.';
    assert.strictEqual(salida > entrada, false, 'precondición: string compare sigue rota');
    const tE = parsearFechaHora('07/09/2026', entrada);
    const tS = parsearFechaHora('07/09/2026', salida);
    assert.ok(tS > tE, 'parsearFechaHora: tarde > mañana');
    ok('parsearFechaHora corrige comparación a.m./p.m.');
}

// Emparejamiento: entrada + salida auto no deja jornada abierta
{
    const regs = [
        { id: 1, fecha: '07/09/2026', hora: '07:00:00 a.m.', movimiento: 'ENTRADA' },
        { id: 2, fecha: '07/09/2026', hora: '04:30:00 p.m.', movimiento: 'SALIDA' }
    ];
    const abiertas = encontrarEntradasAbiertas(regs);
    assert.strictEqual(abiertas.length, 0, 'debe estar cerrada');
    ok('encontrarEntradasAbiertas cierra jornada diurna');
}

// Spam de salidas fantasma: tras primera salida, no hay abierta
{
    const regs = [
        { id: 1, fecha: '01/09/2026', hora: '07:00:00 a.m.', movimiento: 'ENTRADA' }
    ];
    for (let i = 0; i < 50; i++) {
        regs.push({
            id: 2 + i,
            fecha: '01/09/2026',
            hora: '04:30:00 p.m.',
            movimiento: 'SALIDA'
        });
    }
    const abiertas = encontrarEntradasAbiertas(regs);
    assert.strictEqual(abiertas.length, 0);
    ok('spam de salidas no reabre jornada');
}

// Entrada sin salida sigue abierta
{
    const regs = [
        { id: 10, fecha: '07/09/2026', hora: '07:00:00 a.m.', movimiento: 'ENTRADA' }
    ];
    const abiertas = encontrarEntradasAbiertas(regs);
    assert.strictEqual(abiertas.length, 1);
    assert.strictEqual(abiertas[0].id, 10);
    ok('entrada sola queda abierta');
}

// ORDER BY texto de fechas fallaría; cronología real no
{
    const regs = [
        { id: 1, fecha: '31/08/2026', hora: '07:00:00 a.m.', movimiento: 'ENTRADA' },
        { id: 2, fecha: '31/08/2026', hora: '04:30:00 p.m.', movimiento: 'SALIDA' },
        { id: 3, fecha: '01/09/2026', hora: '07:00:00 a.m.', movimiento: 'ENTRADA' }
    ];
    // Lexicográfico: "31/08" > "01/09" — pero parse debe ver sept abierta
    assert.ok('31/08/2026' > '01/09/2026');
    const abiertas = encontrarEntradasAbiertas(regs);
    assert.strictEqual(abiertas.length, 1);
    assert.strictEqual(abiertas[0].id, 3);
    ok('cronología real gana a ORDER BY texto DD/MM');
}

{
    const t = calcularTiempoTrabajado(
        '07/09/2026',
        '07:00:00 a.m.',
        '07/09/2026',
        '04:30:00 p.m.'
    );
    assert.strictEqual(t, '9h 30m');
    ok('calcularTiempoTrabajado 9h 30m (ya en bloque 15)');
}

{
    // 9h37 → 577 min; más cerca de 570 (9h30) que de 585 (9h45)
    assert.strictEqual(redondearABloques15Minutos(9 + 37 / 60), 9.5);
    assert.strictEqual(formatearHorasDecimales(9.5), '9h 30m');
    // 9h40 → redondea a 9h45
    assert.strictEqual(redondearABloques15Minutos(9 + 40 / 60), 9.75);
    const t = calcularTiempoTrabajado(
        '07/09/2026',
        '07:00:00 a.m.',
        '07/09/2026',
        '04:40:00 p.m.'
    );
    assert.strictEqual(t, '9h 45m');
    ok('redondeo a bloques de 15 min (nómina)');
}

{
    const t = calcularTiempoTrabajado(
        '07/09/2026',
        '07:00:00 a.m.',
        '07/09/2026',
        '07:02:00 a.m.'
    );
    assert.strictEqual(t, '15m');
    ok('mínimo 15 minutos si hubo tiempo > 0');
}

console.log('\nTodos los tests de jornada OK');
