const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

/** Evita registros concurrentes del mismo empleado (doble submit / race). */
const locksEmpleado = new Set();

/** Valida strings DD/MM/YYYY y hora con formato de pantalla (12h) */
function esFechaHoraAsistenciaValida(fechaStr, horaStr) {
    if (!fechaStr || !horaStr || typeof fechaStr !== 'string' || typeof horaStr !== 'string') {
        return false;
    }
    const fecha = fechaStr.trim();
    const hora = horaStr.trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        return false;
    }
    const [dia, mes, año] = fecha.split('/').map(Number);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || año < 2000 || año > 2100) {
        return false;
    }
    if (!hora.match(/\d{1,2}:\d{2}:\d{2}/)) {
        return false;
    }
    const prueba = parsearFechaHora(fecha, hora);
    return prueba !== null && !Number.isNaN(prueba.getTime());
}

function obtenerFechaHoraRegistro(fechaCliente, horaCliente) {
    if (esFechaHoraAsistenciaValida(fechaCliente, horaCliente)) {
        return { fecha: fechaCliente.trim(), hora: horaCliente.trim() };
    }
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const hora = ahora.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    return { fecha, hora };
}

function formatearFechaHoraLocal(date) {
    const fecha = date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const hora = date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    return { fecha, hora };
}

function esEntrada(movimiento) {
    return movimiento === 'ENTRADA' || movimiento === 'INGRESO';
}

/** Parsea DD/MM/YYYY + hora 12h (es-MX / AM-PM) a Date real. */
function parsearFechaHora(fecha, hora) {
    try {
        if (!fecha || !hora) return null;
        const [dia, mes, año] = fecha.split('/');
        const horaUpper = String(hora).toUpperCase();
        const esPM = horaUpper.includes('P.M.') || horaUpper.includes('PM') || horaUpper.includes('P. M.');
        const esAM = horaUpper.includes('A.M.') || horaUpper.includes('AM') || horaUpper.includes('A. M.');

        const partesHora = String(hora).match(/(\d+):(\d+):(\d+)/);
        if (!partesHora) return null;

        let horas = parseInt(partesHora[1], 10);
        const minutos = parseInt(partesHora[2], 10);
        const segundos = parseInt(partesHora[3], 10);

        if (esPM && horas !== 12) {
            horas += 12;
        } else if (esAM && horas === 12) {
            horas = 0;
        }

        return new Date(parseInt(año, 10), parseInt(mes, 10) - 1, parseInt(dia, 10), horas, minutos, segundos);
    } catch (error) {
        console.error('Error al parsear fecha/hora:', fecha, hora, error);
        return null;
    }
}

/** Epoch ms del registro: fecha+hora parseadas; fallback creado_en; luego id. */
function timestampRegistro(reg) {
    const parsed = parsearFechaHora(reg.fecha, reg.hora);
    if (parsed && !Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
    }
    if (reg.creado_en) {
        const c = new Date(reg.creado_en);
        if (!Number.isNaN(c.getTime())) return c.getTime();
    }
    return Number(reg.id) || 0;
}

function compararRegistrosCronologicos(a, b) {
    const ta = timestampRegistro(a);
    const tb = timestampRegistro(b);
    if (ta !== tb) return ta - tb;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
}

/**
 * Empareja entradas/salidas en orden real (no lexicográfico).
 * Devuelve las entradas que aún no tienen salida posterior.
 */
function encontrarEntradasAbiertas(registros) {
    const sorted = [...registros].sort(compararRegistrosCronologicos);
    const abiertas = [];
    for (const r of sorted) {
        if (esEntrada(r.movimiento)) {
            abiertas.push(r);
        } else if (r.movimiento === 'SALIDA' && abiertas.length > 0) {
            abiertas.pop();
        }
    }
    return abiertas;
}

function calcularTiempoTrabajado(fechaEntrada, horaEntrada, fechaSalida, horaSalida) {
    try {
        const fechaHoraEntrada = parsearFechaHora(fechaEntrada, horaEntrada);
        const fechaHoraSalida = parsearFechaHora(fechaSalida, horaSalida);

        if (!fechaHoraEntrada || !fechaHoraSalida) {
            return null;
        }

        const diferenciaMs = fechaHoraSalida - fechaHoraEntrada;
        if (diferenciaMs < 0) {
            return null;
        }

        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenciaMs % (1000 * 60)) / 1000);

        if (horas > 0) {
            if (minutos > 0) {
                return `${horas}h ${minutos}m`;
            }
            return `${horas}h`;
        }
        if (minutos > 0) {
            return `${minutos}m`;
        }
        return `${segundos}s`;
    } catch (error) {
        console.error('Error al calcular tiempo trabajado:', error);
        return null;
    }
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

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

async function cargarRegistrosEmpleado(db, empleadoId) {
    return dbAll(
        db,
        `SELECT id, empleado_id, fecha, hora, movimiento, turno, area, creado_en
         FROM asistencia
         WHERE empleado_id = ?
         ORDER BY id ASC`,
        [empleadoId]
    );
}

/**
 * Cierra jornadas abiertas con ≥ 9.5 h usando comparación Date real
 * (nunca strings 12h). Solo inserta UNA salida por entrada abierta.
 */
function cerrarJornadasAutomaticamente(db, empleadoId = null) {
    return (async () => {
        let empleadoIds = [];
        if (empleadoId) {
            empleadoIds = [empleadoId];
        } else {
            const rows = await dbAll(
                db,
                `SELECT DISTINCT empleado_id FROM asistencia
                 WHERE movimiento IN ('ENTRADA', 'INGRESO')`
            );
            empleadoIds = rows.map((r) => r.empleado_id);
        }

        const ahora = new Date();
        let cerradas = 0;
        const mensajes = [];

        for (const idEmpleado of empleadoIds) {
            const registros = await cargarRegistrosEmpleado(db, idEmpleado);
            const abiertas = encontrarEntradasAbiertas(registros);
            if (abiertas.length === 0) continue;

            for (const entrada of abiertas) {
                const fechaHoraEntrada = parsearFechaHora(entrada.fecha, entrada.hora);
                if (!fechaHoraEntrada) continue;

                const horasTranscurridas = (ahora - fechaHoraEntrada) / (1000 * 60 * 60);
                if (horasTranscurridas < 9.5) continue;

                const fechaHoraSalida = new Date(fechaHoraEntrada.getTime() + 9.5 * 60 * 60 * 1000);
                const { fecha: fechaSalida, hora: horaSalida } = formatearFechaHoraLocal(fechaHoraSalida);

                const registrosFresh = await cargarRegistrosEmpleado(db, idEmpleado);
                const sigueAbierta = encontrarEntradasAbiertas(registrosFresh).some((e) => e.id === entrada.id);
                if (!sigueAbierta) continue;

                await dbRun(
                    db,
                    `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area)
                     VALUES (?, ?, ?, 'SALIDA', ?, ?)`,
                    [entrada.empleado_id, fechaSalida, horaSalida, entrada.turno, entrada.area]
                );

                cerradas++;
                const emp = await dbGet(db, 'SELECT nombre, apellido FROM empleados WHERE id = ?', [idEmpleado]);
                const nombre = emp ? `${emp.nombre} ${emp.apellido}` : `empleado_id=${idEmpleado}`;
                mensajes.push(`${nombre}: Jornada cerrada automáticamente a las 9.5 horas`);
            }
        }

        return { cerradas, mensajes };
    })();
}

function responderError(res, status, message) {
    return res.status(status).json({ success: false, message });
}

// Registrar asistencia
router.post('/registrar', async (req, res) => {
    const { codigo, movimiento, turno, foto, fecha: fechaCliente, hora: horaCliente } = req.body;
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

    const { fecha, hora } = obtenerFechaHoraRegistro(fechaCliente, horaCliente);

    let empleado;
    try {
        empleado = await dbGet(
            db,
            'SELECT id, nombre, apellido FROM empleados WHERE codigo = ? AND activo = 1',
            [codigo]
        );
    } catch (err) {
        return responderError(res, 500, 'Error al buscar empleado: ' + err.message);
    }

    if (!empleado) {
        return responderError(res, 404, 'Empleado no encontrado o inactivo');
    }

    if (locksEmpleado.has(empleado.id)) {
        return responderError(res, 429, 'Ya hay un registro en proceso para este empleado. Espera un momento.');
    }
    locksEmpleado.add(empleado.id);

    try {
        // Antes de una nueva entrada: cerrar jornadas vencidas (≥9.5h) y esperar
        if (esEntrada(movimiento)) {
            try {
                const resultado = await cerrarJornadasAutomaticamente(db, empleado.id);
                if (resultado.cerradas > 0) {
                    console.log(
                        `✅ ${resultado.cerradas} jornada(s) cerrada(s) automáticamente para ${empleado.nombre} ${empleado.apellido}`
                    );
                }
            } catch (error) {
                console.error('Error al cerrar jornadas pendientes:', error);
            }

            const registros = await cargarRegistrosEmpleado(db, empleado.id);
            const abiertas = encontrarEntradasAbiertas(registros);
            if (abiertas.length > 0) {
                return responderError(
                    res,
                    409,
                    'Ya tienes una entrada abierta. Registra SALIDA antes de una nueva entrada.'
                );
            }
        }

        let tiempoTrabajado = null;
        let entradaAbierta = null;

        if (movimiento === 'SALIDA') {
            const registros = await cargarRegistrosEmpleado(db, empleado.id);
            const abiertas = encontrarEntradasAbiertas(registros);
            if (abiertas.length === 0) {
                return responderError(
                    res,
                    409,
                    'No hay una entrada abierta para registrar salida.'
                );
            }
            // Emparejar con la entrada abierta más reciente
            entradaAbierta = abiertas[abiertas.length - 1];
            tiempoTrabajado = calcularTiempoTrabajado(
                entradaAbierta.fecha,
                entradaAbierta.hora,
                fecha,
                hora
            );
        }

        const insert = await dbRun(
            db,
            `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area, foto)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [empleado.id, fecha, hora, movimiento, turnoNum, null, foto || null]
        );

        const respuesta = {
            success: true,
            message: `Asistencia registrada: ${movimiento}`,
            data: {
                id: insert.lastID,
                empleado: `${empleado.nombre} ${empleado.apellido}`,
                fecha,
                hora,
                movimiento,
                turno: turnoNum
            }
        };

        if (tiempoTrabajado) {
            respuesta.data.tiempoTrabajado = tiempoTrabajado;
        }
        if (entradaAbierta) {
            respuesta.data.entradaId = entradaAbierta.id;
        }

        return res.json(respuesta);
    } catch (err) {
        console.error('Error al registrar asistencia:', err);
        return responderError(res, 500, 'Error al registrar asistencia: ' + err.message);
    } finally {
        locksEmpleado.delete(empleado.id);
    }
});

function encontrarEntradaParaSalida(registrosEmpleado, salida) {
    const anteriores = registrosEmpleado
        .filter((r) => esEntrada(r.movimiento) && compararRegistrosCronologicos(r, salida) < 0)
        .sort(compararRegistrosCronologicos);
    if (anteriores.length === 0) return null;
    return anteriores[anteriores.length - 1];
}

// Obtener asistencia completa (admin)
router.get('/listar', (req, res) => {
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
            e.id as empleado_id,
            e.codigo,
            e.nombre,
            e.apellido
        FROM asistencia a
        INNER JOIN empleados e ON a.empleado_id = e.id
        WHERE 1=1
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

    // id es orden de inserción real (evita ORDER BY texto DD/MM + 12h)
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
                const entrada = encontrarEntradaParaSalida(porEmpleado[registro.empleado_id] || [], registro);
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

router.get('/cortes-automaticos', (req, res) => {
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
            e.nombre,
            e.apellido,
            e.codigo
         FROM asistencia a_salida
         INNER JOIN empleados e ON a_salida.empleado_id = e.id
         WHERE a_salida.movimiento = 'SALIDA'
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
                const tSalida = parsearFechaHora(sal.fecha_salida, sal.hora_salida);
                if (!tSalida) continue;
                if (tSalida.getTime() < hace24h || tSalida.getTime() > ahora.getTime()) continue;

                if (!cache[sal.empleado_id]) {
                    cache[sal.empleado_id] = await cargarRegistrosEmpleado(db, sal.empleado_id);
                }
                const entrada = encontrarEntradaParaSalida(cache[sal.empleado_id], {
                    id: sal.salida_id,
                    fecha: sal.fecha_salida,
                    hora: sal.hora_salida
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

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = getDB();

    db.get(
        `SELECT a.id, a.fecha, a.hora, a.movimiento, e.nombre || ' ' || e.apellido as nombre_empleado
         FROM asistencia a
         INNER JOIN empleados e ON a.empleado_id = e.id
         WHERE a.id = ?`,
        [id],
        (err, registro) => {
            if (err) {
                return responderError(res, 500, 'Error al obtener información del registro: ' + err.message);
            }

            if (!registro) {
                return responderError(res, 404, 'Registro de asistencia no encontrado');
            }

            db.run(`DELETE FROM asistencia WHERE id = ?`, [id], function (errDelete) {
                if (errDelete) {
                    return responderError(res, 500, 'Error al eliminar registro: ' + errDelete.message);
                }

                if (this.changes === 0) {
                    return responderError(res, 404, 'Registro no encontrado');
                }

                res.json({
                    success: true,
                    message: `Registro de asistencia eliminado para ${registro.nombre_empleado} (${registro.fecha} ${registro.hora})`
                });
            });
        }
    );
});

module.exports = router;
module.exports.cerrarJornadasAutomaticamente = cerrarJornadasAutomaticamente;
module.exports._test = {
    parsearFechaHora,
    timestampRegistro,
    encontrarEntradasAbiertas,
    compararRegistrosCronologicos,
    calcularTiempoTrabajado
};
