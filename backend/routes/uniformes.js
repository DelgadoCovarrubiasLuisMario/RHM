const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// Listar todas las entregas de uniformes y botas
router.get('/listar', (req, res) => {
    const { area, fecha_desde, fecha_hasta } = req.query;
    const db = getDB();

    let query = `
        SELECT 
            u.id,
            u.empleado_id,
            u.tipo,
            u.fecha_entrega,
            u.cantidad_uniformes,
            u.cantidad_botas,
            u.observaciones,
            u.creado_en,
            e.nombre || ' ' || e.apellido as nombre_empleado,
            e.codigo as codigo_empleado
        FROM uniformes_y_botas u
        INNER JOIN empleados e ON u.empleado_id = e.id
        WHERE 1=1
    `;
    const params = [];


    if (fecha_desde) {
        query += ' AND u.fecha_entrega >= ?';
        params.push(fecha_desde);
    }

    if (fecha_hasta) {
        query += ' AND u.fecha_entrega <= ?';
        params.push(fecha_hasta);
    }

    query += ' ORDER BY u.fecha_entrega DESC, u.creado_en DESC LIMIT 500';

    db.all(query, params, (err, entregas) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener entregas: ' + err.message 
            });
        }

        res.json({
            success: true,
            data: entregas,
            total: entregas.length
        });
    });
});

// Obtener entregas de un empleado específico
router.get('/empleado/:empleado_id', (req, res) => {
    const { empleado_id } = req.params;
    const db = getDB();

    db.all(
        `SELECT 
            id, tipo, fecha_entrega, cantidad_uniformes, cantidad_botas, observaciones, creado_en
         FROM uniformes_y_botas
         WHERE empleado_id = ?
         ORDER BY fecha_entrega DESC, creado_en DESC
         LIMIT 100`,
        [empleado_id],
        (err, entregas) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener entregas: ' + err.message 
                });
            }

            res.json({
                success: true,
                data: entregas,
                total: entregas.length
            });
        }
    );
});

// Obtener última entrega de un empleado
router.get('/empleado/:empleado_id/ultima', (req, res) => {
    const { empleado_id } = req.params;
    const { tipo } = req.query; // Opcional: 'uniforme', 'botas', o ambos
    const db = getDB();

    let query = `
        SELECT 
            id, tipo, fecha_entrega, cantidad_uniformes, cantidad_botas, observaciones, creado_en
        FROM uniformes_y_botas
        WHERE empleado_id = ?
    `;
    const params = [empleado_id];

    if (tipo && (tipo === 'uniforme' || tipo === 'botas' || tipo === 'ambos')) {
        query += ' AND tipo = ?';
        params.push(tipo);
    }

    query += ' ORDER BY fecha_entrega DESC, creado_en DESC LIMIT 1';

    db.get(query, params, (err, entrega) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener última entrega: ' + err.message 
            });
        }

        res.json({
            success: true,
            data: entrega || null
        });
    });
});

// Actualizar entrega de uniformes y botas
router.put('/:entrega_id', (req, res) => {
    const { entrega_id } = req.params;
    const { tipo, fecha_entrega, cantidad_uniformes, cantidad_botas, observaciones } = req.body;
    const db = getDB();

    // Validar campos requeridos
    if (!tipo || !fecha_entrega) {
        return res.status(400).json({ 
            success: false, 
            message: 'tipo y fecha_entrega son requeridos' 
        });
    }

    // Validar tipo
    if (!['uniforme', 'botas', 'ambos'].includes(tipo)) {
        return res.status(400).json({ 
            success: false, 
            message: 'tipo debe ser: uniforme, botas o ambos' 
        });
    }

    // Validar cantidades
    const cantUniformes = parseInt(cantidad_uniformes) || 0;
    const cantBotas = parseInt(cantidad_botas) || 0;

    // Verificar que la entrega existe
    db.get('SELECT id FROM uniformes_y_botas WHERE id = ?', [entrega_id], (err, entrega) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al verificar entrega: ' + err.message 
            });
        }

        if (!entrega) {
            return res.status(404).json({ 
                success: false, 
                message: 'Entrega no encontrada' 
            });
        }

        // Actualizar entrega
        db.run(
            `UPDATE uniformes_y_botas 
             SET tipo = ?, fecha_entrega = ?, cantidad_uniformes = ?, cantidad_botas = ?, observaciones = ?
             WHERE id = ?`,
            [tipo, fecha_entrega, cantUniformes, cantBotas, observaciones || null, entrega_id],
            function(updateErr) {
                if (updateErr) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error al actualizar entrega: ' + updateErr.message 
                    });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'Entrega no encontrada' 
                    });
                }

                res.json({
                    success: true,
                    message: 'Entrega actualizada correctamente'
                });
            }
        );
    });
});

// Eliminar entrega de uniformes y botas
router.delete('/:entrega_id', (req, res) => {
    const { entrega_id } = req.params;
    const db = getDB();

    db.run(
        'DELETE FROM uniformes_y_botas WHERE id = ?',
        [entrega_id],
        function(err) {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al eliminar entrega: ' + err.message 
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Entrega no encontrada' 
                });
            }

            res.json({
                success: true,
                message: 'Entrega eliminada correctamente'
            });
        }
    );
});

// Registrar nueva entrega
router.post('/registrar', (req, res) => {
    const { empleado_id, tipo, fecha_entrega, cantidad_uniformes, cantidad_botas, observaciones } = req.body;
    const db = getDB();

    // Validar campos requeridos
    if (!empleado_id || !tipo || !fecha_entrega) {
        return res.status(400).json({ 
            success: false, 
            message: 'empleado_id, tipo y fecha_entrega son requeridos' 
        });
    }

    // Validar tipo
    if (!['uniforme', 'botas', 'ambos'].includes(tipo)) {
        return res.status(400).json({ 
            success: false, 
            message: 'tipo debe ser: uniforme, botas o ambos' 
        });
    }

    // Validar y establecer cantidades por defecto según tipo
    let cantUniformes = parseInt(cantidad_uniformes) || 0;
    let cantBotas = parseInt(cantidad_botas) || 0;

    // Si no se proporcionan cantidades, usar valores por defecto según tipo
    if (tipo === 'uniforme' && cantUniformes <= 0) {
        cantUniformes = 1;
    }

    if (tipo === 'botas' && cantBotas <= 0) {
        cantBotas = 1;
    }

    if (tipo === 'ambos') {
        if (cantUniformes <= 0) cantUniformes = 1;
        if (cantBotas <= 0) cantBotas = 1;
    }

    // Verificar que el empleado existe
    db.get('SELECT id, nombre, apellido FROM empleados WHERE id = ?', 
        [empleado_id], 
        (err, empleado) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al verificar empleado: ' + err.message 
                });
            }

            if (!empleado) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Empleado no encontrado' 
                });
            }

            // Insertar entrega
            db.run(
                `INSERT INTO uniformes_y_botas (empleado_id, tipo, fecha_entrega, cantidad_uniformes, cantidad_botas, observaciones)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [empleado_id, tipo, fecha_entrega, cantUniformes, cantBotas, observaciones || null],
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error al registrar entrega: ' + err.message 
                        });
                    }

                    res.json({
                        success: true,
                        message: `Entrega registrada para ${empleado.nombre} ${empleado.apellido}`,
                        entrega_id: this.lastID
                    });
                }
            );
        }
    );
});

module.exports = router;

