const express = require('express');
const router = express.Router();
const { getDB, runInTransaction, dbRunAsync } = require('../database/db');
const { resolverEmpleadoDeLista } = require('../lib/resolver-empleado');
const { requireAdmin } = require('./auth');
const { requireKiosk, obtenerKioskTokenEsperado } = require('../lib/kiosk-auth');
const jornada = require('../lib/asistencia-jornada');

const {
    esEntrada,
    parsearFechaHora,
    encontrarEntradasAbiertas,
    entradaParaSalida,
    calcularTiempoTrabajado,
    fechaHoraServidorMexico
} = jornada;

/** Evita registros concurrentes del mismo empleado entre procesos (complementa transacción SQLite). */
const locksEmpleado = new Set();

function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function adquirirLockEmpleado(empleadoId, timeoutMs = 8000) {
    const t0 = Date.now();
    while (locksEmpleado.has(empleadoId)) {
        if (Date.now() - t0 > timeoutMs) {
            return false;
        }
        await esperar(25);
    }
    locksEmpleado.add(empleadoId);
    return true;
}

function liberarLockEmpleado(empleadoId) {
    locksEmpleado.delete(empleadoId);
}

function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

async function cargarRegistrosEmpleado(db, empleadoId) {
    return dbAll(
        db,
        `SELECT id, empleado_id, fecha, hora, movimiento, turno, area, creado_en, salida_automatica, anulado
         FROM asistencia
         WHERE empleado_id = ? AND (anulado IS NULL OR anulado = 0)
         ORDER BY id ASC`,
        [empleadoId]
    );
}

/**
 * Cierra jornadas abiertas con ≥ 9.5 h. Marca salida_automatica = 1.
 */
function cerrarJornadasAutomaticamente(db, empleadoId = null, opciones = {}) {
    const skipLock = Boolean(opciones.skipLock);
    return (async () => {
        let empleadoIds = [];
        if (empleadoId) {
            empleadoIds = [empleadoId];
        } else {
            const rows = await dbAll(
                db,
                `SELECT DISTINCT empleado_id FROM asistencia
                 WHERE movimiento IN ('ENTRADA', 'INGRESO') AND (anulado IS NULL OR anulado = 0)`
            );
            empleadoIds = rows.map((r) => r.empleado_id);
        }

        const ahora = new Date();
        let cerradas = 0;
        const mensajes = [];

        for (const idEmpleado of empleadoIds) {
            let lockPropio = false;
            if (!skipLock) {
                lockPropio = await adquirirLockEmpleado(idEmpleado);
                if (!lockPropio) {
                    console.warn(`Auto-cierre: no se obtuvo lock para empleado ${idEmpleado}`);
                    continue;
                }
            }
            try {
                const registros = await cargarRegistrosEmpleado(db, idEmpleado);
                const abiertas = encontrarEntradasAbiertas(registros);
                if (abiertas.length === 0) continue;

                for (const entrada of abiertas) {
                    const fechaHoraEntrada = parsearFechaHora(entrada.fecha, entrada.hora);
                    if (!fechaHoraEntrada) continue;

                    const horasTranscurridas = (ahora - fechaHoraEntrada) / (1000 * 60 * 60);
                    if (horasTranscurridas < 9.5) continue;

                    const fechaHoraSalida = new Date(fechaHoraEntrada.getTime() + 9.5 * 60 * 60 * 1000);
                    const { fecha: fechaSalida, hora: horaSalida } = fechaHoraServidorMexico(fechaHoraSalida);

                    const registrosFresh = await cargarRegistrosEmpleado(db, idEmpleado);
                    const sigueAbierta = encontrarEntradasAbiertas(registrosFresh).some((e) => e.id === entrada.id);
                    if (!sigueAbierta) continue;

                    await dbRunAsync(
                        db,
                        `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area, salida_automatica)
                         VALUES (?, ?, ?, 'SALIDA', ?, ?, 1)`,
                        [entrada.empleado_id, fechaSalida, horaSalida, entrada.turno, entrada.area]
                    );

                    cerradas++;
                    let nombre = `empleado_id=${idEmpleado}`;
                    try {
                        const emp = await dbGet(db, 'SELECT nombre, apellido FROM empleados WHERE id = ?', [idEmpleado]);
                        if (emp) nombre = `${emp.nombre} ${emp.apellido}`;
                    } catch (_e) {
                        /* base de datos de prueba sin tabla empleados */
                    }
                    mensajes.push(`${nombre}: Jornada cerrada automáticamente a las 9.5 horas`);
                }
            } finally {
                if (lockPropio) {
                    liberarLockEmpleado(idEmpleado);
                }
            }
        }

        return { cerradas, mensajes };
    })();
}

function responderError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

/** Indica si la tablet debe enviar X-Kiosk-Token (sin revelar el secreto). */
router.get('/kiosk-config', (req, res) => {
    const tieneTokenServidor = Boolean(obtenerKioskTokenEsperado());
    const requiresToken =
        tieneTokenServidor || process.env.NODE_ENV === 'production';
    return res.json({
        success: true,
        requiresToken
    });
});

router.post('/registrar', requireKiosk, async (req, res) => {
    const { codigo, movimiento, turno, foto } = req.body;
    const db = getDB();

    if (!codigo || !movimiento || !turno) {
        return responderError(res, 400, 'Faltan datos requeridos: codigo, movimiento, turno');
    }

    const turnoNum = parseInt(turno, 10);
    if (![1, 2, 3, 4].includes(turnoNum)) {
        return responderError(res, 400, 'Turno inválido. Debe ser 1, 2, 3 o 4 (Planta)');
    }

    if (movimiento !== 'ENTRADA' && movimiento !== 'SALIDA' && movimiento !== 'INGRESO') {
        return responderError(res, 400, 'Movimiento inválido. Debe ser ENTRADA, SALIDA o INGRESO');
    }

    const { fecha, hora } = fechaHoraServidorMexico();

    if (esEntrada(movimiento) || movimiento === 'SALIDA') {
        if (!foto || typeof foto !== 'string' || foto.length < 100) {
            return responderError(
                res,
                400,
                'La foto es obligatoria para registrar entrada y salida.'
            );
        }
    }

    let empleado;
    try {
        const candidatos = await dbAll(
            db,
            'SELECT id, codigo, nombre, apellido, activo FROM empleados WHERE activo = 1'
        );
        const resuelto = resolverEmpleadoDeLista(candidatos, codigo);
        if (!resuelto.ok) {
            return responderError(res, resuelto.status || 404, resuelto.message);
        }
        empleado = resuelto.empleado;
    } catch (err) {
        return responderError(res, 500, 'Error al buscar empleado: ' + err.message);
    }

    const lockOk = await adquirirLockEmpleado(empleado.id);
    if (!lockOk) {
        return responderError(res, 429, 'Ya hay un registro en proceso para este empleado. Espera un momento.');
    }

    try {
        let tiempoTrabajado = null;
        let entradaAbierta = null;
        let insertId = null;
        let autoCierreMensajes = [];

        await runInTransaction(db, async (run) => {
            if (esEntrada(movimiento)) {
                const resultado = await cerrarJornadasAutomaticamente(db, empleado.id, { skipLock: true });
                if (resultado.cerradas > 0) {
                    autoCierreMensajes = resultado.mensajes;
                }

                const registros = await cargarRegistrosEmpleado(db, empleado.id);
                const abiertas = encontrarEntradasAbiertas(registros);
                if (abiertas.length > 0) {
                    const err = new Error('Ya tienes una entrada abierta. Registra SALIDA antes de una nueva entrada.');
                    err.status = 409;
                    throw err;
                }
            }

            if (movimiento === 'SALIDA') {
                const registros = await cargarRegistrosEmpleado(db, empleado.id);
                const abiertas = encontrarEntradasAbiertas(registros);
                if (abiertas.length === 0) {
                    const err = new Error('No hay una entrada abierta para registrar salida.');
                    err.status = 409;
                    throw err;
                }
                entradaAbierta = abiertas[0];
                tiempoTrabajado = calcularTiempoTrabajado(
                    entradaAbierta.fecha,
                    entradaAbierta.hora,
                    fecha,
                    hora
                );
            }

            const insert = await run(
                `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area, foto, salida_automatica)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [empleado.id, fecha, hora, movimiento, turnoNum, null, foto || null]
            );
            insertId = insert.lastID;
        });

        const respuesta = {
            success: true,
            message: `Asistencia registrada: ${movimiento}`,
            data: {
                id: insertId,
                empleado: `${empleado.nombre} ${empleado.apellido}`,
                fecha,
                hora,
                movimiento,
                turno: turnoNum,
                salida_automatica: 0
            }
        };

        if (tiempoTrabajado) {
            respuesta.data.tiempoTrabajado = tiempoTrabajado;
        }
        if (entradaAbierta) {
            respuesta.data.entradaId = entradaAbierta.id;
        }
        if (autoCierreMensajes.length > 0) {
            respuesta.data.jornadasCerradasAutomaticamente = autoCierreMensajes;
        }

        return res.json(respuesta);
    } catch (err) {
        if (err.status === 409) {
            return responderError(res, 409, err.message);
        }
        console.error('Error al registrar asistencia:', err);
        return responderError(res, 500, 'Error al registrar asistencia: ' + err.message);
    } finally {
        liberarLockEmpleado(empleado.id);
    }
});

router.get('/listar', requireAdmin, (req, res) => {
    const { fecha, fecha_inicio, fecha_fin, empleado_id, movimiento } = req.query;
    const db = getDB();

    let query = `
        SELECT 
            a.id,
            a.fecha,
            a.hora,
            a.movimiento,
            a.turno,
            a.area,
            a.foto,
            a.creado_en,
            a.salida_automatica,
            e.id as empleado_id,
            e.codigo,
            e.nombre,
            e.apellido
        FROM asistencia a
        INNER JOIN empleados e ON a.empleado_id = e.id
        WHERE (a.anulado IS NULL OR a.anulado = 0)
    `;
    const params = [];

    if (fecha && !fecha_inicio && !fecha_fin) {
        query += ' AND a.fecha = ?';
        params.push(fecha);
    }

    if (fecha_inicio && fecha_fin) {
        const fechasEnRango = [];
        const [diaInicio, mesInicio, añoInicio] = fecha_inicio.split('/').map(Number);
        const [diaFin, mesFin, añoFin] = fecha_fin.split('/').map(Number);

        const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
        const fin = new Date(añoFin, mesFin - 1, diaFin);

        const fechaActual = new Date(inicio);
        while (fechaActual <= fin) {
            const dia = String(fechaActual.getDate()).padStart(2, '0');
            const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
            const año = fechaActual.getFullYear();
            fechasEnRango.push(`${dia}/${mes}/${año}`);
            fechaActual.setDate(fechaActual.getDate() + 1);
        }

        if (fechasEnRango.length > 0) {
            query += ' AND a.fecha IN (' + fechasEnRango.map(() => '?').join(',') + ')';
            params.push(...fechasEnRango);
        }
    }

    if (empleado_id) {
        query += ' AND a.empleado_id = ?';
        params.push(empleado_id);
    }

    if (movimiento && (movimiento === 'ENTRADA' || movimiento === 'SALIDA' || movimiento === 'INGRESO')) {
        if (movimiento === 'ENTRADA') {
            query += " AND a.movimiento IN ('ENTRADA', 'INGRESO')";
        } else {
            query += ' AND a.movimiento = ?';
            params.push(movimiento);
        }
    }

    query += ' ORDER BY a.id DESC LIMIT 500';

    db.all(query, params, async (err, rows) => {
        if (err) {
            return responderError(res, 500, 'Error al obtener asistencia: ' + err.message);
        }

        if (!rows || rows.length === 0) {
            return res.json({ success: true, data: [], total: 0 });
        }

        try {
            const empleadoIds = [...new Set(rows.map((r) => r.empleado_id))];
            const porEmpleado = {};
            for (const eid of empleadoIds) {
                porEmpleado[eid] = await cargarRegistrosEmpleado(db, eid);
            }

            for (const registro of rows) {
                if (registro.movimiento !== 'SALIDA') continue;
                const entrada = entradaParaSalida(porEmpleado[registro.empleado_id] || [], registro);
                if (entrada) {
                    registro.tiempoTrabajado = calcularTiempoTrabajado(
                        entrada.fecha,
                        entrada.hora,
                        registro.fecha,
                        registro.hora
                    );
                }
            }

            return res.json({
                success: true,
                data: rows,
                total: rows.length
            });
        } catch (e) {
            return responderError(res, 500, 'Error al calcular tiempos: ' + e.message);
        }
    });
});

router.get('/cortes-automaticos', requireAdmin, (req, res) => {
    const db = getDB();
    const ahora = new Date();
    const hace24h = ahora.getTime() - 24 * 60 * 60 * 1000;

    db.all(
        `SELECT 
            a_salida.id as salida_id,
            a_salida.empleado_id,
            a_salida.fecha as fecha_salida,
            a_salida.hora as hora_salida,
            a_salida.creado_en as creado_salida,
            a_salida.salida_automatica,
            e.nombre,
            e.apellido,
            e.codigo
         FROM asistencia a_salida
         INNER JOIN empleados e ON a_salida.empleado_id = e.id
         WHERE a_salida.movimiento = 'SALIDA'
           AND (a_salida.anulado IS NULL OR a_salida.anulado = 0)
         ORDER BY a_salida.id DESC
         LIMIT 300`,
        [],
        async (err, salidas) => {
            if (err) {
                return responderError(res, 500, 'Error al obtener cortes automáticos: ' + err.message);
            }

            const cortesAutomaticos = [];
            const cache = {};

            for (const sal of salidas || []) {
                if (sal.salida_automatica === 1) {
                    if (!cache[sal.empleado_id]) {
                        cache[sal.empleado_id] = await cargarRegistrosEmpleado(db, sal.empleado_id);
                    }
                    const entrada = entradaParaSalida(cache[sal.empleado_id], {
                        id: sal.salida_id,
                        fecha: sal.fecha_salida,
                        hora: sal.hora_salida,
                        movimiento: 'SALIDA'
                    });
                    cortesAutomaticos.push({
                        empleado_id: sal.empleado_id,
                        nombre: sal.nombre,
                        apellido: sal.apellido,
                        codigo: sal.codigo,
                        fecha_entrada: entrada ? entrada.fecha : null,
                        hora_entrada: entrada ? entrada.hora : null,
                        fecha_salida: sal.fecha_salida,
                        hora_salida: sal.hora_salida,
                        horas_trabajadas: '9.5'
                    });
                    continue;
                }

                const tSalida = parsearFechaHora(sal.fecha_salida, sal.hora_salida);
                if (!tSalida) continue;
                if (tSalida.getTime() < hace24h || tSalida.getTime() > ahora.getTime()) continue;

                if (!cache[sal.empleado_id]) {
                    cache[sal.empleado_id] = await cargarRegistrosEmpleado(db, sal.empleado_id);
                }
                const entrada = entradaParaSalida(cache[sal.empleado_id], {
                    id: sal.salida_id,
                    fecha: sal.fecha_salida,
                    hora: sal.hora_salida,
                    movimiento: 'SALIDA'
                });
                if (!entrada) continue;

                const tEntrada = parsearFechaHora(entrada.fecha, entrada.hora);
                if (!tEntrada) continue;

                const horasTrabajadas = (tSalida - tEntrada) / (1000 * 60 * 60);
                if (Math.abs(horasTrabajadas - 9.5) < 0.1) {
                    cortesAutomaticos.push({
                        empleado_id: sal.empleado_id,
                        nombre: sal.nombre,
                        apellido: sal.apellido,
                        codigo: sal.codigo,
                        fecha_entrada: entrada.fecha,
                        hora_entrada: entrada.hora,
                        fecha_salida: sal.fecha_salida,
                        hora_salida: sal.hora_salida,
                        horas_trabajadas: '9.5'
                    });
                }
            }

            res.json({
                success: true,
                data: cortesAutomaticos,
                total: cortesAutomaticos.length
            });
        }
    );
});

async function validarEliminacionAsistencia(db, registro) {
    const registros = await cargarRegistrosEmpleado(db, registro.empleado_id);
    const abiertas = encontrarEntradasAbiertas(registros);

    if (esEntrada(registro.movimiento)) {
        const par = jornada.emparejarEntradaSalida(registros).find((p) => p.entrada.id === registro.id);
        if (par && par.salida) {
            return {
                ok: false,
                message:
                    'No se puede eliminar esta ENTRADA porque ya tiene una SALIDA emparejada. Anula primero la salida o corrige desde nómina con soporte.'
            };
        }
        if (abiertas.some((e) => e.id === registro.id)) {
            return {
                ok: false,
                message:
                    'No se puede eliminar la ENTRADA de una jornada abierta. Registra SALIDA o espera el cierre automático (9.5 h).'
            };
        }
    }

    return { ok: true };
}

router.delete('/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const db = getDB();

    try {
        const registro = await dbGet(
            db,
            `SELECT a.id, a.empleado_id, a.fecha, a.hora, a.movimiento, e.nombre || ' ' || e.apellido as nombre_empleado
             FROM asistencia a
             INNER JOIN empleados e ON a.empleado_id = e.id
             WHERE a.id = ? AND (a.anulado IS NULL OR a.anulado = 0)`,
            [id]
        );

        if (!registro) {
            return responderError(res, 404, 'Registro de asistencia no encontrado');
        }

        const validacion = await validarEliminacionAsistencia(db, registro);
        if (!validacion.ok) {
            return responderError(res, 409, validacion.message);
        }

        const result = await dbRunAsync(
            db,
            `UPDATE asistencia SET anulado = 1 WHERE id = ?`,
            [id]
        );

        if (result.changes === 0) {
            return responderError(res, 404, 'Registro no encontrado');
        }

        res.json({
            success: true,
            message: `Registro de asistencia anulado para ${registro.nombre_empleado} (${registro.fecha} ${registro.hora}). Los datos se conservan para auditoría pero ya no cuentan en jornada ni nómina.`
        });
    } catch (errDelete) {
        return responderError(res, 500, 'Error al anular registro: ' + errDelete.message);
    }
});

module.exports = router;
module.exports.cerrarJornadasAutomaticamente = cerrarJornadasAutomaticamente;
