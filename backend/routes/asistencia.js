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

// Registrar asistencia (empleado escanea QR)
router.post('/registrar', (req, res) => {
    const { codigo, movimiento, turno } = req.body;
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
                    `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [empleado.id, fecha, hora, movimiento, turno, null],
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

module.exports = router;

