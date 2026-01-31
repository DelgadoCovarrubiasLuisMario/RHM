const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// Listar pagos (historial)
router.get('/listar', (req, res) => {
    const { fecha_desde, fecha_hasta } = req.query;
    const db = getDB();

    let query = `
        SELECT 
            p.id,
            p.empleado_id,
            p.fecha_inicio,
            p.fecha_fin,
            p.area,
            p.sueldo_base,
            p.total_pagado,
            p.desglose,
            p.fecha_pago,
            e.nombre || ' ' || e.apellido as nombre_empleado
        FROM pagos p
        INNER JOIN empleados e ON p.empleado_id = e.id
        WHERE 1=1
    `;
    const params = [];

    // Filtro por fecha de pago (SQLite compara strings directamente)
    if (fecha_desde) {
        query += ' AND substr(p.fecha_pago, 1, 10) >= ?';
        params.push(fecha_desde);
    }

    if (fecha_hasta) {
        query += ' AND substr(p.fecha_pago, 1, 10) <= ?';
        params.push(fecha_hasta);
    }

    query += ' ORDER BY p.fecha_pago DESC LIMIT 500';

    db.all(query, params, (err, pagos) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener pagos: ' + err.message 
            });
        }

        res.json({
            success: true,
            data: pagos,
            total: pagos.length
        });
    });
});

module.exports = router;

