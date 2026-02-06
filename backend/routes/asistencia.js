const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// Función para calcular tiempo trabajado entre entrada y salida
function calcularTiempoTrabajado(fechaEntrada, horaEntrada, fechaSalida, horaSalida) {
    try {
        // Convertir fechas y horas a objetos Date
        // Formato esperado: DD/MM/YYYY y HH:MM:SS AM/PM
        const parsearFechaHora = (fecha, hora) => {
            try {
                const [dia, mes, año] = fecha.split('/');
                // Parsear hora (formato: HH:MM:SS a.m./p.m. o AM/PM)
                const horaUpper = hora.toUpperCase();
                const esPM = horaUpper.includes('P.M.') || horaUpper.includes('PM') || horaUpper.includes('P. M.');
                const esAM = horaUpper.includes('A.M.') || horaUpper.includes('AM') || horaUpper.includes('A. M.');
                
                const partesHora = hora.match(/(\d+):(\d+):(\d+)/);
                
                if (partesHora) {
                    let horas = parseInt(partesHora[1]);
                    const minutos = parseInt(partesHora[2]);
                    const segundos = parseInt(partesHora[3]);
                    
                    // Convertir a formato 24 horas
                    if (esPM && horas !== 12) {
                        horas += 12;
                    } else if (esAM && horas === 12) {
                        horas = 0;
                    }
                    
                    const fechaHora = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), horas, minutos, segundos);
                    return fechaHora;
                }
                return null;
            } catch (error) {
                console.error('Error al parsear fecha/hora:', fecha, hora, error);
                return null;
            }
        };

        const fechaHoraEntrada = parsearFechaHora(fechaEntrada, horaEntrada);
        const fechaHoraSalida = parsearFechaHora(fechaSalida, horaSalida);

        if (!fechaHoraEntrada || !fechaHoraSalida) {
            return null;
        }

        // Calcular diferencia en milisegundos
        const diferenciaMs = fechaHoraSalida - fechaHoraEntrada;
        
        if (diferenciaMs < 0) {
            return null; // La salida es antes que la entrada (error)
        }

        // Convertir a horas, minutos y segundos
        const horas = Math.floor(diferenciaMs / (1000 * 60 * 60));
        const minutos = Math.floor((diferenciaMs % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenciaMs % (1000 * 60)) / 1000);

        // Formatear como "Xh Ym Zs" o "X horas Y minutos"
        if (horas > 0) {
            if (minutos > 0) {
                return `${horas}h ${minutos}m`;
            }
            return `${horas}h`;
        } else if (minutos > 0) {
            return `${minutos}m`;
        } else {
            return `${segundos}s`;
        }
    } catch (error) {
        console.error('Error al calcular tiempo trabajado:', error);
        return null;
    }
}

// Función para parsear fecha y hora a objeto Date
function parsearFechaHora(fecha, hora) {
    try {
        const [dia, mes, año] = fecha.split('/');
        const horaUpper = hora.toUpperCase();
        const esPM = horaUpper.includes('P.M.') || horaUpper.includes('PM') || horaUpper.includes('P. M.');
        const esAM = horaUpper.includes('A.M.') || horaUpper.includes('AM') || horaUpper.includes('A. M.');
        
        const partesHora = hora.match(/(\d+):(\d+):(\d+)/);
        
        if (partesHora) {
            let horas = parseInt(partesHora[1]);
            const minutos = parseInt(partesHora[2]);
            const segundos = parseInt(partesHora[3]);
            
            if (esPM && horas !== 12) {
                horas += 12;
            } else if (esAM && horas === 12) {
                horas = 0;
            }
            
            return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), horas, minutos, segundos);
        }
        return null;
    } catch (error) {
        console.error('Error al parsear fecha/hora:', fecha, hora, error);
        return null;
    }
}

// Función para calcular horas trabajadas en decimal
function calcularHorasTrabajadasDecimal(fechaEntrada, horaEntrada, fechaSalida, horaSalida) {
    const fechaHoraEntrada = parsearFechaHora(fechaEntrada, horaEntrada);
    const fechaHoraSalida = parsearFechaHora(fechaSalida, horaSalida);
    
    if (!fechaHoraEntrada || !fechaHoraSalida) {
        return 0;
    }
    
    const diferenciaMs = fechaHoraSalida - fechaHoraEntrada;
    if (diferenciaMs < 0) {
        return 0;
    }
    
    return diferenciaMs / (1000 * 60 * 60); // Convertir a horas decimales
}

// Función para cerrar jornadas automáticamente a las 9.5 horas
function cerrarJornadasAutomaticamente(db, empleadoId = null) {
    return new Promise((resolve, reject) => {
        // Buscar todas las entradas sin salida (última entrada de cada empleado que no tenga salida después)
        let query = `
            SELECT a1.id, a1.empleado_id, a1.fecha, a1.hora, a1.turno, a1.area,
                   e.nombre, e.apellido
            FROM asistencia a1
            INNER JOIN empleados e ON a1.empleado_id = e.id
            WHERE a1.movimiento IN ('ENTRADA', 'INGRESO')
            AND a1.id = (
                SELECT a2.id FROM asistencia a2
                WHERE a2.empleado_id = a1.empleado_id
                AND a2.movimiento IN ('ENTRADA', 'INGRESO')
                ORDER BY a2.fecha DESC, a2.hora DESC
                LIMIT 1
            )
            AND NOT EXISTS (
                SELECT 1 FROM asistencia a3
                WHERE a3.empleado_id = a1.empleado_id
                AND a3.movimiento = 'SALIDA'
                AND (
                    a3.fecha > a1.fecha OR 
                    (a3.fecha = a1.fecha AND a3.hora > a1.hora)
                )
            )
        `;
        
        const params = [];
        if (empleadoId) {
            query += ' AND a1.empleado_id = ?';
            params.push(empleadoId);
        }
        
        db.all(query, params, (err, entradasPendientes) => {
            if (err) {
                return reject(err);
            }
            
            if (entradasPendientes.length === 0) {
                return resolve({ cerradas: 0, mensajes: [] });
            }
            
            const ahora = new Date();
            let cerradas = 0;
            const mensajes = [];
            let procesadas = 0;
            
            if (entradasPendientes.length === 0) {
                return resolve({ cerradas: 0, mensajes: [] });
            }
            
            entradasPendientes.forEach(entrada => {
                const fechaHoraEntrada = parsearFechaHora(entrada.fecha, entrada.hora);
                if (!fechaHoraEntrada) {
                    procesadas++;
                    if (procesadas === entradasPendientes.length) {
                        resolve({ cerradas, mensajes });
                    }
                    return;
                }
                
                // Calcular horas transcurridas
                const horasTranscurridas = (ahora - fechaHoraEntrada) / (1000 * 60 * 60);
                
                // Si han pasado 9.5 horas o más, cerrar automáticamente
                if (horasTranscurridas >= 9.5) {
                    // Calcular hora de salida (entrada + 9.5 horas)
                    const fechaHoraSalida = new Date(fechaHoraEntrada);
                    fechaHoraSalida.setHours(fechaHoraSalida.getHours() + 9);
                    fechaHoraSalida.setMinutes(fechaHoraSalida.getMinutes() + 30);
                    
                    const fechaSalida = fechaHoraSalida.toLocaleDateString('es-MX', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric' 
                    });
                    const horaSalida = fechaHoraSalida.toLocaleTimeString('es-MX', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit',
                        hour12: true 
                    });
                    
                    // Registrar salida automática
                    db.run(
                        `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area) 
                         VALUES (?, ?, ?, 'SALIDA', ?, ?)`,
                        [entrada.empleado_id, fechaSalida, horaSalida, entrada.turno, entrada.area],
                        function(err) {
                            if (err) {
                                console.error(`Error al cerrar jornada automática para ${entrada.nombre} ${entrada.apellido}:`, err);
                            } else {
                                cerradas++;
                                mensajes.push(`${entrada.nombre} ${entrada.apellido}: Jornada cerrada automáticamente a las 9.5 horas`);
                            }
                            
                            procesadas++;
                            if (procesadas === entradasPendientes.length) {
                                resolve({ cerradas, mensajes });
                            }
                        }
                    );
                } else {
                    procesadas++;
                    if (procesadas === entradasPendientes.length) {
                        resolve({ cerradas, mensajes });
                    }
                }
            });
        });
    });
}

// Registrar asistencia (empleado escanea QR)
router.post('/registrar', async (req, res) => {
    const { codigo, movimiento, turno, foto } = req.body;
    const db = getDB();

    // Validar datos requeridos
    if (!codigo || !movimiento || !turno) {
        return res.status(400).json({ 
            success: false, 
            message: 'Faltan datos requeridos: codigo, movimiento, turno' 
        });
    }

    // Validar turno
    if (![1, 2, 3].includes(parseInt(turno))) {
        return res.status(400).json({ 
            success: false, 
            message: 'Turno inválido. Debe ser 1, 2 o 3' 
        });
    }

    // Validar movimiento
    if (movimiento !== 'ENTRADA' && movimiento !== 'SALIDA' && movimiento !== 'INGRESO') {
        return res.status(400).json({ 
            success: false, 
            message: 'Movimiento inválido. Debe ser ENTRADA, SALIDA o INGRESO' 
        });
    }

    // Obtener fecha y hora actual
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

    // Buscar empleado por código
    db.get('SELECT id, nombre, apellido FROM empleados WHERE codigo = ? AND activo = 1', 
        [codigo], 
        (err, empleado) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al buscar empleado: ' + err.message 
                });
            }

            if (!empleado) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Empleado no encontrado o inactivo' 
                });
            }

            // Si es una ENTRADA, verificar y cerrar jornadas pendientes del mismo empleado
            if (movimiento === 'ENTRADA' || movimiento === 'INGRESO') {
                // Cerrar jornadas pendientes (no bloqueante)
                cerrarJornadasAutomaticamente(db, empleado.id)
                    .then(resultado => {
                        if (resultado.cerradas > 0) {
                            console.log(`✅ ${resultado.cerradas} jornada(s) cerrada(s) automáticamente para ${empleado.nombre} ${empleado.apellido}`);
                        }
                    })
                    .catch(error => {
                        console.error('Error al cerrar jornadas pendientes:', error);
                        // Continuar con el registro aunque falle el cierre automático
                    });
            }

            // Si es una salida, buscar la última entrada para calcular tiempo trabajado
            if (movimiento === 'SALIDA') {
                // Buscar la última entrada del mismo empleado
                db.get(
                    `SELECT fecha, hora FROM asistencia 
                     WHERE empleado_id = ? AND movimiento IN ('ENTRADA', 'INGRESO')
                     ORDER BY fecha DESC, hora DESC LIMIT 1`,
                    [empleado.id],
                    (err, ultimaEntrada) => {
                        let tiempoTrabajado = null;
                        if (!err && ultimaEntrada) {
                            // Calcular tiempo trabajado
                            tiempoTrabajado = calcularTiempoTrabajado(ultimaEntrada.fecha, ultimaEntrada.hora, fecha, hora);
                        } else if (err) {
                            console.error('❌ Error al buscar última entrada:', err);
                        }
                        registrarAsistencia(tiempoTrabajado);
                    }
                );
            } else {
                registrarAsistencia(null);
            }

            function registrarAsistencia(tiempoTrabajado) {
                // Insertar registro de asistencia
                db.run(
                    `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area, foto) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [empleado.id, fecha, hora, movimiento, turno, null, foto || null],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Error al registrar asistencia: ' + err.message 
                            });
                        }

                        const respuesta = {
                            success: true,
                            message: `Asistencia registrada: ${movimiento}`,
                            data: {
                                id: this.lastID,
                                empleado: `${empleado.nombre} ${empleado.apellido}`,
                                fecha,
                                hora,
                                movimiento,
                                turno
                            }
                        };

                        // Si hay tiempo trabajado, agregarlo a la respuesta
                        if (tiempoTrabajado) {
                            respuesta.data.tiempoTrabajado = tiempoTrabajado;
                        }

                        res.json(respuesta);
                    }
                );
            }
        }
    );
});

// Función para convertir fecha DD/MM/YYYY a formato para comparación
function convertirFechaParaComparacion(fechaStr) {
    // Formato: DD/MM/YYYY -> YYYYMMDD (número)
    const [dia, mes, año] = fechaStr.split('/');
    return parseInt(año + mes.padStart(2, '0') + dia.padStart(2, '0'));
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
            e.id as empleado_id,
            e.codigo,
            e.nombre,
            e.apellido
        FROM asistencia a
        INNER JOIN empleados e ON a.empleado_id = e.id
        WHERE 1=1
    `;
    const params = [];

    // Filtro por área

    // Filtro por fecha única (para compatibilidad)
    if (fecha && !fecha_inicio && !fecha_fin) {
        query += ' AND a.fecha = ?';
        params.push(fecha);
    }

    // Filtro por rango de fechas
    if (fecha_inicio && fecha_fin) {
        // Convertir fechas DD/MM/YYYY a números para comparación
        const fechaInicioNum = convertirFechaParaComparacion(fecha_inicio);
        const fechaFinNum = convertirFechaParaComparacion(fecha_fin);
        
        // Obtener todas las fechas en el rango
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

    // Filtro por empleado
    if (empleado_id) {
        query += ' AND a.empleado_id = ?';
        params.push(empleado_id);
    }

    // Filtro por movimiento
    if (movimiento && (movimiento === 'ENTRADA' || movimiento === 'SALIDA' || movimiento === 'INGRESO')) {
        if (movimiento === 'ENTRADA') {
            query += ' AND a.movimiento IN (\'ENTRADA\', \'INGRESO\')';
        } else {
            query += ' AND a.movimiento = ?';
            params.push(movimiento);
        }
    }

    query += ' ORDER BY a.fecha DESC, a.hora DESC LIMIT 500';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener asistencia: ' + err.message 
            });
        }

        // Para cada registro de salida, calcular tiempo trabajado
        let procesados = 0;
        const total = rows.length;
        
        if (total === 0) {
            return res.json({
                success: true,
                data: [],
                total: 0
            });
        }

        rows.forEach((registro, index) => {
            if (registro.movimiento === 'SALIDA') {
                // Buscar la última entrada del mismo empleado en la misma área antes de esta salida
                db.get(
                    `SELECT fecha, hora FROM asistencia 
                     WHERE empleado_id = ? AND area = ? 
                     AND movimiento IN ('ENTRADA', 'INGRESO')
                     AND (fecha < ? OR (fecha = ? AND hora < ?))
                     ORDER BY fecha DESC, hora DESC LIMIT 1`,
                    [registro.empleado_id, registro.area, registro.fecha, registro.fecha, registro.hora],
                    (err, ultimaEntrada) => {
                        if (!err && ultimaEntrada) {
                            registro.tiempoTrabajado = calcularTiempoTrabajado(
                                ultimaEntrada.fecha, 
                                ultimaEntrada.hora, 
                                registro.fecha, 
                                registro.hora
                            );
                        }
                        procesados++;
                        if (procesados === total) {
                            res.json({
                                success: true,
                                data: rows,
                                total: rows.length
                            });
                        }
                    }
                );
            } else {
                procesados++;
                if (procesados === total) {
                    res.json({
                        success: true,
                        data: rows,
                        total: rows.length
                    });
                }
            }
        });
    });
});

// Exportar función para uso en server.js
// Obtener jornadas cerradas automáticamente recientes (últimas 24 horas)
router.get('/cortes-automaticos', (req, res) => {
    const db = getDB();
    const ahora = new Date();
    
    // Obtener todas las salidas de las últimas 24 horas
    const fechaHace24Horas = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const fechaHace24HorasStr = fechaHace24Horas.toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
    
    // Buscar salidas recientes y verificar si fueron automáticas
    const query = `
        SELECT 
            a_salida.id as salida_id,
            a_salida.empleado_id,
            a_salida.fecha as fecha_salida,
            a_salida.hora as hora_salida,
            a_entrada.fecha as fecha_entrada,
            a_entrada.hora as hora_entrada,
            e.nombre,
            e.apellido,
            e.codigo
        FROM asistencia a_salida
        INNER JOIN empleados e ON a_salida.empleado_id = e.id
        INNER JOIN asistencia a_entrada ON a_entrada.empleado_id = a_salida.empleado_id
            AND a_entrada.movimiento IN ('ENTRADA', 'INGRESO')
            AND (
                a_entrada.fecha < a_salida.fecha OR 
                (a_entrada.fecha = a_salida.fecha AND a_entrada.hora < a_salida.hora)
            )
        WHERE a_salida.movimiento = 'SALIDA'
        AND a_salida.fecha >= ?
        AND a_entrada.id = (
            SELECT a2.id FROM asistencia a2
            WHERE a2.empleado_id = a_salida.empleado_id
            AND a2.movimiento IN ('ENTRADA', 'INGRESO')
            AND (
                a2.fecha < a_salida.fecha OR 
                (a2.fecha = a_salida.fecha AND a2.hora < a_salida.hora)
            )
            ORDER BY a2.fecha DESC, a2.hora DESC
            LIMIT 1
        )
        AND NOT EXISTS (
            SELECT 1 FROM asistencia a3
            WHERE a3.empleado_id = a_salida.empleado_id
            AND a3.movimiento IN ('ENTRADA', 'INGRESO')
            AND (
                (a3.fecha = a_entrada.fecha AND a3.hora > a_entrada.hora) OR
                a3.fecha > a_entrada.fecha
            )
            AND (
                (a3.fecha = a_salida.fecha AND a3.hora < a_salida.hora) OR
                a3.fecha < a_salida.fecha
            )
        )
        ORDER BY a_salida.fecha DESC, a_salida.hora DESC
        LIMIT 100
    `;
    
    db.all(query, [fechaHace24HorasStr], (err, registros) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al obtener cortes automáticos: ' + err.message
            });
        }
        
        // Filtrar solo los que fueron cerrados automáticamente (9.5 horas exactas)
        const cortesAutomaticos = [];
        
        registros.forEach(reg => {
            const fechaHoraEntrada = parsearFechaHora(reg.fecha_entrada, reg.hora_entrada);
            const fechaHoraSalida = parsearFechaHora(reg.fecha_salida, reg.hora_salida);
            
            if (fechaHoraEntrada && fechaHoraSalida) {
                const horasTrabajadas = (fechaHoraSalida - fechaHoraEntrada) / (1000 * 60 * 60);
                
                // Si las horas trabajadas son exactamente 9.5 (con un margen de 0.1 horas para tolerancia)
                if (Math.abs(horasTrabajadas - 9.5) < 0.1) {
                    // Verificar que la salida fue en las últimas 24 horas
                    const horasDesdeSalida = (ahora - fechaHoraSalida) / (1000 * 60 * 60);
                    if (horasDesdeSalida <= 24 && horasDesdeSalida >= 0) {
                        cortesAutomaticos.push({
                            empleado_id: reg.empleado_id,
                            nombre: reg.nombre,
                            apellido: reg.apellido,
                            codigo: reg.codigo,
                            fecha_entrada: reg.fecha_entrada,
                            hora_entrada: reg.hora_entrada,
                            fecha_salida: reg.fecha_salida,
                            hora_salida: reg.hora_salida,
                            horas_trabajadas: '9.5'
                        });
                    }
                }
            }
        });
        
        res.json({
            success: true,
            data: cortesAutomaticos,
            total: cortesAutomaticos.length
        });
    });
});

// Eliminar registro de asistencia
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = getDB();

    // Obtener información del registro antes de eliminar
    db.get(
        `SELECT a.id, a.fecha, a.hora, a.movimiento, e.nombre || ' ' || e.apellido as nombre_empleado
         FROM asistencia a
         INNER JOIN empleados e ON a.empleado_id = e.id
         WHERE a.id = ?`,
        [id],
        (err, registro) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener información del registro: ' + err.message 
                });
            }

            if (!registro) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Registro de asistencia no encontrado' 
                });
            }

            // Eliminar el registro
            db.run(
                `DELETE FROM asistencia WHERE id = ?`,
                [id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error al eliminar registro: ' + err.message 
                        });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Registro no encontrado' 
                        });
                    }

                    res.json({
                        success: true,
                        message: `Registro de asistencia eliminado para ${registro.nombre_empleado} (${registro.fecha} ${registro.hora})`
                    });
                }
            );
        }
    );
});

module.exports = router;
module.exports.cerrarJornadasAutomaticamente = cerrarJornadasAutomaticamente;

