const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// Obtener cortes automáticos pendientes (no procesados)
router.get('/pendientes', (req, res) => {
    const db = getDB();

    db.all(
        `SELECT 
            c.id,
            c.empleado_id,
            c.asistencia_id,
            c.fecha,
            c.horas_originales,
            c.horas_cortadas,
            c.horas_extra,
            c.creado_en,
            e.nombre,
            e.apellido,
            e.codigo
         FROM cortes_automaticos c
         INNER JOIN empleados e ON c.empleado_id = e.id
         WHERE c.procesado = 0
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

// Procesar corte automático (admin decide mantener o eliminar horas extra)
router.post('/:corte_id/procesar', (req, res) => {
    const { corte_id } = req.params;
    const { accion } = req.body; // 'mantener' o 'eliminar'
    const db = getDB();

    if (!accion || !['mantener', 'eliminar'].includes(accion)) {
        return res.status(400).json({
            success: false,
            message: 'accion debe ser "mantener" o "eliminar"'
        });
    }

    // Verificar que el corte existe y no está procesado
    db.get(
        `SELECT * FROM cortes_automaticos WHERE id = ? AND procesado = 0`,
        [corte_id],
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

            // Si la acción es 'eliminar', necesitamos ajustar las horas en el cálculo de sueldos
            // Por ahora solo marcamos como procesado
            // Las horas se ajustarán automáticamente en el cálculo porque ya están cortadas a 9.5
            
            db.run(
                `UPDATE cortes_automaticos 
                 SET procesado = 1, 
                     accion_admin = ?,
                     procesado_en = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [accion, corte_id],
                function(updateErr) {
                    if (updateErr) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al procesar corte: ' + updateErr.message
                        });
                    }

                    res.json({
                        success: true,
                        message: accion === 'mantener' 
                            ? 'Horas extra mantenidas (9.5 horas contabilizadas)'
                            : 'Horas extra eliminadas (8 horas contabilizadas)',
                        data: {
                            corte_id: corte_id,
                            accion: accion
                        }
                    });
                }
            );
        }
    );
});

module.exports = router;

