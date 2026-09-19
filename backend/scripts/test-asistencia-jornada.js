/**
 * Pruebas de jornadas y paridad checadas ↔ nómina (sin servidor HTTP).
 * Ejecutar: npm test   o   node backend/scripts/test-asistencia-jornada.js
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jornada = require('../lib/asistencia-jornada');
const { runInTransaction, dbRunAsync } = require('../database/db');

const {
    parsearFechaHora,
    encontrarEntradasAbiertas,
    calcularTiempoTrabajado,
    redondearABloques15Minutos,
    formatearHorasDecimales,
    emparejarEntradaSalida,
    calcularHorasTrabajadasDecimales,
    fechaHoraServidorMexico,
    registroAnulado
} = jornada;
const { obtenerKioskTokenEsperado, tokenKioskEnRequest } = require('../lib/kiosk-auth');
const { claveFechaOrden } = require('../lib/fechas');


function ok(name) {
    console.log('✓', name);
}

{
    const entrada = '07:00:00 a.m.';
    const salida = '04:30:00 p.m.';
    assert.strictEqual(salida > entrada, false);
    const tE = parsearFechaHora('07/09/2026', entrada);
    const tS = parsearFechaHora('07/09/2026', salida);
    assert.ok(tS > tE);
    ok('parsearFechaHora corrige comparación a.m./p.m.');
}

{
    const regs = [
        { id: 1, fecha: '07/09/2026', hora: '07:00:00 a.m.', movimiento: 'ENTRADA' },
        { id: 2, fecha: '07/09/2026', hora: '04:30:00 p.m.', movimiento: 'SALIDA' }
    ];
    assert.strictEqual(encontrarEntradasAbiertas(regs).length, 0);
    ok('encontrarEntradasAbiertas cierra jornada diurna');
}

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
    assert.strictEqual(encontrarEntradasAbiertas(regs).length, 0);
    ok('spam de salidas no deja jornada abierta (FIFO)');
}

{
    const regs = [{ id: 10, fecha: '07/09/2026', hora: '07:00:00 a.m.', movimiento: 'ENTRADA' }];
    assert.strictEqual(encontrarEntradasAbiertas(regs).length, 1);
    ok('entrada sola queda abierta');
}

{
    const regs = [
        { id: 1, fecha: '31/08/2026', hora: '10:00:00 p.m.', movimiento: 'ENTRADA' },
        { id: 2, fecha: '01/09/2026', hora: '06:00:00 a.m.', movimiento: 'SALIDA' }
    ];
    const pares = emparejarEntradaSalida(regs);
    assert.strictEqual(pares.length, 1);
    const horasAsistencia = calcularHorasTrabajadasDecimales(
        pares[0].entrada.fecha,
        pares[0].entrada.hora,
        pares[0].salida.fecha,
        pares[0].salida.hora
    );
    const horasPayroll = calcularHorasTrabajadasDecimales(
        pares[0].entrada.fecha,
        pares[0].entrada.hora,
        pares[0].salida.fecha,
        pares[0].salida.hora
    );
    assert.strictEqual(horasAsistencia, horasPayroll);
    ok('turno nocturno: mismas horas en checada y nómina');
}

{
    const t = calcularTiempoTrabajado('07/09/2026', '07:00:00 a.m.', '07/09/2026', '04:30:00 p.m.');
    assert.strictEqual(t, '9h 30m');
    ok('calcularTiempoTrabajado 9h 30m');
}

{
    assert.strictEqual(redondearABloques15Minutos(9 + 37 / 60), 9.5);
    assert.strictEqual(formatearHorasDecimales(9.5), '9h 30m');
    ok('redondeo a bloques de 15 min (nómina)');
}

{
    const fh = fechaHoraServidorMexico();
    assert.ok(/^\d{2}\/\d{2}\/\d{4}$/.test(fh.fecha));
    assert.ok(parsearFechaHora(fh.fecha, fh.hora));
    ok('fechaHoraServidorMexico produce valores parseables');
}

{
    const entradaAnulada = {
        id: 1,
        fecha: '07/09/2026',
        hora: '07:00:00 a.m.',
        movimiento: 'ENTRADA',
        anulado: 1
    };
    assert.strictEqual(registroAnulado(entradaAnulada), true);
    assert.strictEqual(encontrarEntradasAbiertas([entradaAnulada]).length, 0);
    ok('entrada anulada no deja jornada abierta');
}

{
    assert.ok(claveFechaOrden('15/03/2026') >= claveFechaOrden('01/03/2026'));
    assert.ok(claveFechaOrden('01/03/2026') <= claveFechaOrden('31/03/2026'));
    ok('claveFechaOrden usable para filtro de rango en listar');
}

{
    const prev = process.env.KIOSK_TOKEN;
    process.env.KIOSK_TOKEN = '  secreto-kiosk  ';
    assert.strictEqual(obtenerKioskTokenEsperado(), 'secreto-kiosk');
    const req = { headers: { authorization: 'Kiosk secreto-kiosk' } };
    assert.strictEqual(tokenKioskEnRequest(req), 'secreto-kiosk');
    if (prev === undefined) delete process.env.KIOSK_TOKEN;
    else process.env.KIOSK_TOKEN = prev;
    ok('kiosk-auth: trim de KIOSK_TOKEN y header Authorization Kiosk');
}

async function testAutoCierreNoDuplica() {
    const tmp = path.join(__dirname, `test-jornada-${Date.now()}.db`);
    const db = new sqlite3.Database(tmp);
    await dbRunAsync(
        db,
        `CREATE TABLE asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            movimiento TEXT NOT NULL,
            turno INTEGER NOT NULL,
            area TEXT,
            foto TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            salida_automatica INTEGER DEFAULT 0,
            anulado INTEGER DEFAULT 0
        )`
    );
    await dbRunAsync(
        db,
        `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area)
         VALUES (1, '01/01/2020', '12:00:00 a.m.', 'ENTRADA', 1, NULL)`
    );

    const { cerrarJornadasAutomaticamente } = require('../routes/asistencia');
    await cerrarJornadasAutomaticamente(db, 1);
    await cerrarJornadasAutomaticamente(db, 1);

    const salidas = await new Promise((resolve, reject) => {
        db.all(
            `SELECT id FROM asistencia WHERE movimiento = 'SALIDA' AND salida_automatica = 1`,
            [],
            (err, rows) => (err ? reject(err) : resolve(rows))
        );
    });
    assert.strictEqual(salidas.length, 1, 'solo una salida automática');
    db.close();
    fs.unlinkSync(tmp);
    ok('auto-cierre 9.5h no inserta salidas duplicadas');
}

async function testConcurrenciaEntradaDoble() {
    const tmp = path.join(__dirname, `test-conc-${Date.now()}.db`);
    const db = new sqlite3.Database(tmp);
    await dbRunAsync(
        db,
        `CREATE TABLE asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            movimiento TEXT NOT NULL,
            turno INTEGER NOT NULL,
            area TEXT,
            salida_automatica INTEGER DEFAULT 0,
            anulado INTEGER DEFAULT 0
        )`
    );

    const insertarEntrada = () =>
        runInTransaction(db, async (run) => {
            const rows = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT id, fecha, hora, movimiento FROM asistencia WHERE empleado_id = 1 AND (anulado IS NULL OR anulado = 0) ORDER BY id ASC`,
                    [],
                    (err, r) => (err ? reject(err) : resolve(r || []))
                );
            });
            const abiertas = encontrarEntradasAbiertas(rows);
            if (abiertas.length > 0) {
                const err = new Error('409');
                err.status = 409;
                throw err;
            }
            await run(
                `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area) VALUES (1, '10/10/2026', '08:00:00 a.m.', 'ENTRADA', 1, NULL)`
            );
        });

    await insertarEntrada();
    let conflict = false;
    try {
        await insertarEntrada();
    } catch (e) {
        if (e.status === 409) conflict = true;
        else throw e;
    }
    assert.strictEqual(conflict, true);
    db.close();
    fs.unlinkSync(tmp);
    ok('segunda entrada rechazada con jornada abierta (transacción + regla)');
}

/** Misma regla que POST /registrar: SALIDA sin ENTRADA abierta → 409, sin INSERT. */
async function testSalidaSinEntradaAbierta() {
    const tmp = path.join(__dirname, `test-salida-sin-entrada-${Date.now()}.db`);
    const db = new sqlite3.Database(tmp);
    await dbRunAsync(
        db,
        `CREATE TABLE asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            movimiento TEXT NOT NULL,
            turno INTEGER NOT NULL,
            area TEXT,
            salida_automatica INTEGER DEFAULT 0,
            anulado INTEGER DEFAULT 0
        )`
    );

    const registrarSalida = () =>
        runInTransaction(db, async (run) => {
            const rows = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT id, fecha, hora, movimiento FROM asistencia
                     WHERE empleado_id = 1 AND (anulado IS NULL OR anulado = 0)
                     ORDER BY id ASC`,
                    [],
                    (err, r) => (err ? reject(err) : resolve(r || []))
                );
            });
            const abiertas = encontrarEntradasAbiertas(rows);
            if (abiertas.length === 0) {
                const err = new Error('No hay una entrada abierta para registrar salida.');
                err.status = 409;
                throw err;
            }
            await run(
                `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area)
                 VALUES (1, '10/10/2026', '05:00:00 p.m.', 'SALIDA', 1, NULL)`
            );
        });

    let mensajeRechazo = '';
    try {
        await registrarSalida();
        assert.fail('debió rechazar SALIDA sin entrada abierta');
    } catch (e) {
        assert.strictEqual(e.status, 409);
        mensajeRechazo = e.message;
    }
    assert.ok(mensajeRechazo.includes('entrada abierta'));

    const salidas = await new Promise((resolve, reject) => {
        db.all(
            `SELECT id FROM asistencia WHERE movimiento = 'SALIDA'`,
            [],
            (err, rows) => (err ? reject(err) : resolve(rows || []))
        );
    });
    assert.strictEqual(salidas.length, 0, 'no debe inventarse registro de SALIDA');

    db.close();
    fs.unlinkSync(tmp);
    ok('salida sin entrada abierta: rechazo claro y sin registro insertado');
}

/** Admin puede anular ENTRADA con jornada abierta; sigue bloqueada si ya tiene SALIDA emparejada. */
async function testValidarEliminacionEntradaAbierta() {
    const tmp = path.join(__dirname, `test-anular-entrada-${Date.now()}.db`);
    const db = new sqlite3.Database(tmp);
    await dbRunAsync(
        db,
        `CREATE TABLE asistencia (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            empleado_id INTEGER NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL,
            movimiento TEXT NOT NULL,
            turno INTEGER NOT NULL,
            area TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            salida_automatica INTEGER DEFAULT 0,
            anulado INTEGER DEFAULT 0
        )`
    );
    await dbRunAsync(
        db,
        `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area)
         VALUES (1, '10/10/2026', '08:00:00 a.m.', 'ENTRADA', 1, NULL)`
    );

    const { validarEliminacionAsistencia } = require('../routes/asistencia');
    const registroAbierto = {
        id: 1,
        empleado_id: 1,
        fecha: '10/10/2026',
        hora: '08:00:00 a.m.',
        movimiento: 'ENTRADA'
    };
    const validacionAbierta = await validarEliminacionAsistencia(db, registroAbierto);
    assert.strictEqual(validacionAbierta.ok, true, 'entrada con jornada abierta debe poder anularse');

    await dbRunAsync(
        db,
        `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area)
         VALUES (1, '10/10/2026', '05:00:00 p.m.', 'SALIDA', 1, NULL)`
    );
    const validacionEmparejada = await validarEliminacionAsistencia(db, registroAbierto);
    assert.strictEqual(validacionEmparejada.ok, false, 'entrada con salida emparejada sigue protegida');
    assert.ok(validacionEmparejada.message.includes('SALIDA emparejada'));

    const result = await dbRunAsync(db, `UPDATE asistencia SET anulado = 1 WHERE id = 1`);
    assert.strictEqual(result.changes, 1, 'soft-delete marca anulado=1');

    db.close();
    fs.unlinkSync(tmp);
    ok('admin puede anular ENTRADA con jornada abierta; emparejada sigue bloqueada');
}

(async () => {
    await testAutoCierreNoDuplica();
    await testConcurrenciaEntradaDoble();
    await testSalidaSinEntradaAbierta();
    await testValidarEliminacionEntradaAbierta();
    console.log('\nTodos los tests de jornada OK');
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
