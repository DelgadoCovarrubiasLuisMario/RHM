const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// Listar todas las vacaciones
router.get('/listar', (req, res) => {
    const { fecha_desde, fecha_hasta } = req.query;
    const db = getDB();

    let query = `
        SELECT 
            v.id,
            v.empleado_id,
            v.fecha_inicio,
            v.fecha_fin,
            v.dias,
            v.año,
            v.observaciones,
            v.creado_en,
            e.nombre || ' ' || e.apellido as nombre_empleado,
            e.codigo as codigo_empleado
        FROM vacaciones v
        INNER JOIN empleados e ON v.empleado_id = e.id
        WHERE 1=1
    `;
    const params = [];

    if (fecha_desde) {
        query += ' AND v.fecha_inicio >= ?';
        params.push(fecha_desde);
    }

    if (fecha_hasta) {
        query += ' AND v.fecha_fin <= ?';
        params.push(fecha_hasta);
    }

    query += ' ORDER BY v.fecha_inicio DESC, v.creado_en DESC LIMIT 500';

    db.all(query, params, (err, vacaciones) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener vacaciones: ' + err.message 
            });
        }

        res.json({
            success: true,
            data: vacaciones,
            total: vacaciones.length
        });
    });
});

// Obtener vacaciones de un empleado específico
router.get('/empleado/:empleado_id', (req, res) => {
    const { empleado_id } = req.params;
    const db = getDB();

    db.all(
        `SELECT 
            id, fecha_inicio, fecha_fin, dias, año, observaciones, creado_en
         FROM vacaciones
         WHERE empleado_id = ?
         ORDER BY fecha_inicio DESC, creado_en DESC
         LIMIT 100`,
        [empleado_id],
        (err, vacaciones) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener vacaciones del empleado: ' + err.message 
                });
            }

            res.json({
                success: true,
                data: vacaciones,
                total: vacaciones.length
            });
        }
    );
});

// Obtener días disponibles de un empleado para un año
router.get('/empleado/:empleado_id/disponibles', (req, res) => {
    const { empleado_id } = req.params;
    const { año } = req.query;
    const db = getDB();

    // Si no se proporciona año, usar año actual
    const añoActual = año || new Date().getFullYear();

    db.all(
        `SELECT COALESCE(SUM(dias), 0) as dias_usados
         FROM vacaciones
         WHERE empleado_id = ? AND año = ?`,
        [empleado_id, añoActual],
        (err, result) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al calcular días disponibles: ' + err.message 
                });
            }

            const diasUsados = result[0]?.dias_usados || 0;
            const diasDisponibles = 12 - diasUsados;

            res.json({
                success: true,
                año: añoActual,
                dias_usados: diasUsados,
                dias_disponibles: Math.max(0, diasDisponibles),
                dias_totales: 12
            });
        }
    );
});

// Función auxiliar para calcular días entre dos fechas (DD/MM/YYYY) excluyendo domingos
function calcularDiasEntreFechas(fechaInicio, fechaFin) {
    const [diaInicio, mesInicio, añoInicio] = fechaInicio.split('/').map(Number);
    const [diaFin, mesFin, añoFin] = fechaFin.split('/').map(Number);
    
    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);
    
    // Iterar día por día desde inicio hasta fin (inclusive)
    let diasContados = 0;
    const fechaActual = new Date(inicio);
    
    // Asegurarse de que fechaActual no sea mayor que fin
    while (fechaActual <= fin) {
        // getDay() retorna 0 para domingo, 1 para lunes, etc.
        // Si no es domingo (getDay() !== 0), contar el día
        if (fechaActual.getDay() !== 0) {
            diasContados++;
        }
        
        // Avanzar al siguiente día
        fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    return diasContados;
}

// Función auxiliar para obtener el año de una fecha (DD/MM/YYYY)
function obtenerAño(fecha) {
    const partes = fecha.split('/');
    return parseInt(partes[2]);
}

// Función auxiliar para validar solapamiento de fechas
function validarSolapamiento(db, empleadoId, fechaInicio, fechaFin, callback) {
    db.all(
        `SELECT fecha_inicio, fecha_fin 
         FROM vacaciones 
         WHERE empleado_id = ?`,
        [empleadoId],
        (err, vacacionesExistentes) => {
            if (err) {
                return callback(err);
            }

            // Convertir fechas a objetos Date para comparar
            const [diaInicio, mesInicio, añoInicio] = fechaInicio.split('/').map(Number);
            const [diaFin, mesFin, añoFin] = fechaFin.split('/').map(Number);
            const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
            const fin = new Date(añoFin, mesFin - 1, diaFin);

            for (const vac of vacacionesExistentes) {
                const [diaInicioExistente, mesInicioExistente, añoInicioExistente] = vac.fecha_inicio.split('/').map(Number);
                const [diaFinExistente, mesFinExistente, añoFinExistente] = vac.fecha_fin.split('/').map(Number);
                const inicioExistente = new Date(añoInicioExistente, mesInicioExistente - 1, diaInicioExistente);
                const finExistente = new Date(añoFinExistente, mesFinExistente - 1, diaFinExistente);

                // Verificar solapamiento
                if ((inicio >= inicioExistente && inicio <= finExistente) ||
                    (fin >= inicioExistente && fin <= finExistente) ||
                    (inicio <= inicioExistente && fin >= finExistente)) {
                    return callback(new Error('Las fechas se solapan con vacaciones existentes'));
                }
            }

            callback(null);
        }
    );
}

// Registrar nueva vacación
router.post('/registrar', (req, res) => {
    const { empleados_ids, fecha_inicio, fecha_fin, observaciones } = req.body; // empleados_ids es un array
    const db = getDB();

    // Validar campos requeridos
    if (!empleados_ids || !Array.isArray(empleados_ids) || empleados_ids.length === 0 || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ 
            success: false, 
            message: 'empleados_ids (array), fecha_inicio y fecha_fin son requeridos' 
        });
    }

    // Calcular días y año
    const dias = calcularDiasEntreFechas(fecha_inicio, fecha_fin);
    const año = obtenerAño(fecha_inicio);

    const insertPromises = empleados_ids.map(empleado_id => {
        return new Promise((resolve, reject) => {
            // Verificar que el empleado existe
            db.get('SELECT id, nombre, apellido FROM empleados WHERE id = ?', 
                [empleado_id], 
                (err, empleado) => {
                    if (err) {
                        return reject('Error al verificar empleado: ' + err.message);
                    }

                    if (!empleado) {
                        return reject(`Empleado con ID ${empleado_id} no encontrado`);
                    }

                    // Validar solapamiento
                    validarSolapamiento(db, empleado_id, fecha_inicio, fecha_fin, (err) => {
                        if (err) {
                            return reject(`Error de validación para ${empleado.nombre} ${empleado.apellido}: ${err.message}`);
                        }

                        // Verificar días disponibles
                        db.all(
                            `SELECT COALESCE(SUM(dias), 0) as dias_usados
                             FROM vacaciones
                             WHERE empleado_id = ? AND año = ?`,
                            [empleado_id, año],
                            (err, result) => {
                                if (err) {
                                    return reject(`Error al verificar días disponibles para ${empleado.nombre} ${empleado.apellido}: ${err.message}`);
                                }

                                const diasUsados = result[0]?.dias_usados || 0;
                                if (diasUsados + dias > 12) {
                                    return reject(`${empleado.nombre} ${empleado.apellido} excede los 12 días disponibles (usados: ${diasUsados}, solicitados: ${dias})`);
                                }

                                // Insertar vacación
                                db.run(
                                    `INSERT INTO vacaciones (empleado_id, fecha_inicio, fecha_fin, dias, año, observaciones)
                                     VALUES (?, ?, ?, ?, ?, ?)`,
                                    [empleado_id, fecha_inicio, fecha_fin, dias, año, observaciones || null],
                                    function(err) {
                                        if (err) {
                                            return reject(`Error al registrar vacaciones para ${empleado.nombre} ${empleado.apellido}: ` + err.message);
                                        }
                                        resolve({ 
                                            empleado_id: empleado.id, 
                                            nombre: `${empleado.nombre} ${empleado.apellido}`, 
                                            vacacion_id: this.lastID 
                                        });
                                    }
                                );
                            }
                        );
                    });
                }
            );
        });
    });

    Promise.allSettled(insertPromises)
        .then(results => {
            const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
            const failed = results.filter(r => r.status === 'rejected').map(r => r.reason);

            if (successful.length > 0) {
                res.json({
                    success: true,
                    message: `Vacaciones registradas exitosamente para ${successful.length} empleado(s).`,
                    successful: successful,
                    failed: failed
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'No se pudo registrar ninguna vacación.',
                    failed: failed
                });
            }
        })
        .catch(error => {
            console.error('Error en Promise.allSettled:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor al procesar vacaciones.' });
        });
});

// Eliminar vacación
router.delete('/:vacacion_id', (req, res) => {
    const { vacacion_id } = req.params;
    const db = getDB();

    // Obtener información de la vacación antes de eliminar
    db.get(
        `SELECT v.id, v.empleado_id, v.fecha_inicio, v.fecha_fin, v.dias, e.nombre || ' ' || e.apellido as nombre_empleado
         FROM vacaciones v
         INNER JOIN empleados e ON v.empleado_id = e.id
         WHERE v.id = ?`,
        [vacacion_id],
        (err, vacacion) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener información de la vacación: ' + err.message 
                });
            }

            if (!vacacion) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Vacación no encontrada' 
                });
            }

            // Eliminar la vacación
            db.run(
                `DELETE FROM vacaciones WHERE id = ?`,
                [vacacion_id],
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error al eliminar vacación: ' + err.message 
                        });
                    }

                    if (this.changes === 0) {
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Vacación no encontrada' 
                        });
                    }

                    res.json({
                        success: true,
                        message: `Vacación eliminada para ${vacacion.nombre_empleado}`,
                        vacacion_eliminada: {
                            id: vacacion.id,
                            empleado_id: vacacion.empleado_id,
                            dias: vacacion.dias
                        }
                    });
                }
            );
        }
    );
});

module.exports = router;

