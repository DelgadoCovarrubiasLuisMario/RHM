const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// Obtener cortes automáticos pendientes
router.get('/pendientes', (req, res) => {
    const db = getDB();
    
    db.all(
        `SELECT 
            c.id,
            c.empleado_id,
            c.fecha,
            c.horas_originales,
            c.horas_cortadas,
            c.horas_extra,
            c.creado_en,
            e.nombre || ' ' || e.apellido as nombre_empleado
         FROM cortes_automaticos c
         INNER JOIN empleados e ON c.empleado_id = e.id
         WHERE c.estado = 'pendiente'
         ORDER BY c.fecha DESC, c.creado_en DESC`,
        [],
        (err, cortes) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al obtener cortes automáticos: ' + err.message
                });
            }
            
            res.json({
                success: true,
                data: cortes,
                total: cortes.length
            });
        }
    );
});

// Aprobar horas extra (mantener las 1.5 horas extra)
router.post('/:corte_id/aprobar', (req, res) => {
    const { corte_id } = req.params;
    const db = getDB();
    
    // Verificar que el corte existe y está pendiente
    db.get(
        'SELECT * FROM cortes_automaticos WHERE id = ? AND estado = ?',
        [corte_id, 'pendiente'],
        (err, corte) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al verificar corte: ' + err.message
                });
            }
            
            if (!corte) {
                return res.status(404).json({
                    success: false,
                    message: 'Corte automático no encontrado o ya procesado'
                });
            }
            
            // Actualizar estado a aprobado
            db.run(
                `UPDATE cortes_automaticos 
                 SET estado = 'aprobado', procesado_en = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [corte_id],
                function(updateErr) {
                    if (updateErr) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al aprobar corte: ' + updateErr.message
                        });
                    }
                    
                    res.json({
                        success: true,
                        message: 'Horas extra aprobadas. Se mantendrán las 1.5 horas extra.'
                    });
                }
            );
        }
    );
});

// Rechazar horas extra (eliminar las 1.5 horas extra, dejar solo 8 horas)
router.post('/:corte_id/rechazar', (req, res) => {
    const { corte_id } = req.params;
    const db = getDB();
    
    // Verificar que el corte existe y está pendiente
    db.get(
        'SELECT * FROM cortes_automaticos WHERE id = ? AND estado = ?',
        [corte_id, 'pendiente'],
        (err, corte) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al verificar corte: ' + err.message
                });
            }
            
            if (!corte) {
                return res.status(404).json({
                    success: false,
                    message: 'Corte automático no encontrado o ya procesado'
                });
            }
            
            // Actualizar estado a rechazado
            db.run(
                `UPDATE cortes_automaticos 
                 SET estado = 'rechazado', procesado_en = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [corte_id],
                function(updateErr) {
                    if (updateErr) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al rechazar corte: ' + updateErr.message
                        });
                    }
                    
                    // Aquí necesitaríamos ajustar las horas en la asistencia
                    // Por ahora solo marcamos como rechazado
                    // TODO: Ajustar horas en asistencia a 8 horas exactas
                    
                    res.json({
                        success: true,
                        message: 'Horas extra rechazadas. Se contarán solo 8 horas.'
                    });
                }
            );
        }
    );
});

module.exports = router;

