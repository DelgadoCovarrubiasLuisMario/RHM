const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
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

// Generar archivo de nómina (Excel)
router.get('/generar-nomina', (req, res) => {
    const { fecha_desde, fecha_hasta } = req.query;
    const db = getDB();

    if (!fecha_desde || !fecha_hasta) {
        return res.status(400).json({
            success: false,
            message: 'fecha_desde y fecha_hasta son requeridos'
        });
    }

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
            e.nombre || ' ' || e.apellido as nombre_empleado,
            e.codigo as codigo_empleado
        FROM pagos p
        INNER JOIN empleados e ON p.empleado_id = e.id
        WHERE substr(p.fecha_pago, 1, 10) >= ? 
        AND substr(p.fecha_pago, 1, 10) <= ?
        ORDER BY e.nombre, e.apellido, p.fecha_pago DESC
    `;

    db.all(query, [fecha_desde, fecha_hasta], (err, pagos) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al obtener pagos: ' + err.message
            });
        }

        if (pagos.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay pagos en el rango de fechas seleccionado'
            });
        }

        try {
            // Preparar datos para Excel
            const datosExcel = [];

            // Encabezados
            datosExcel.push([
                'ID',
                'Código',
                'Empleado',
                'Período Inicio',
                'Período Fin',
                'Sueldo Base',
                'Total Pagado',
                'Fecha de Pago',
                'Horas Normales',
                'Horas Dobles',
                'Horas Triples',
                'Horas Turno',
                'Días Trabajados',
                'Días Faltados',
                'Descuento Faltas',
                'Descuentos Varios'
            ]);

            // Agregar datos de cada pago
            pagos.forEach(pago => {
                let desglose = {};
                try {
                    desglose = JSON.parse(pago.desglose);
                } catch (e) {
                    console.error('Error al parsear desglose:', e);
                }

                const fechaPago = new Date(pago.fecha_pago);
                const fechaPagoStr = fechaPago.toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });

                datosExcel.push([
                    pago.id,
                    pago.codigo_empleado || '',
                    pago.nombre_empleado,
                    pago.fecha_inicio,
                    pago.fecha_fin,
                    parseFloat(pago.sueldo_base || 0).toFixed(2),
                    parseFloat(pago.total_pagado || 0).toFixed(2),
                    fechaPagoStr,
                    desglose.resumen?.horas_normales || '0.00',
                    desglose.resumen?.horas_dobles || '0.00',
                    desglose.resumen?.horas_triples || '0.00',
                    desglose.resumen?.horas_turno || '0.00',
                    desglose.resumen?.dias_trabajados || 0,
                    desglose.resumen?.dias_faltados || 0,
                    parseFloat(desglose.calculos?.descuento_faltas || 0).toFixed(2),
                    parseFloat(desglose.calculos?.descuentos_varios || 0).toFixed(2)
                ]);
            });

            // Crear libro de Excel
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(datosExcel);

            // Ajustar ancho de columnas
            const columnWidths = [
                { wch: 8 },   // ID
                { wch: 12 }, // Código
                { wch: 25 }, // Empleado
                { wch: 15 }, // Período Inicio
                { wch: 15 }, // Período Fin
                { wch: 12 }, // Sueldo Base
                { wch: 12 }, // Total Pagado
                { wch: 15 }, // Fecha de Pago
                { wch: 15 }, // Horas Normales
                { wch: 12 }, // Horas Dobles
                { wch: 12 }, // Horas Triples
                { wch: 12 }, // Horas Turno
                { wch: 15 }, // Días Trabajados
                { wch: 15 }, // Días Faltados
                { wch: 15 }, // Descuento Faltas
                { wch: 15 }  // Descuentos Varios
            ];
            worksheet['!cols'] = columnWidths;

            // Agregar hoja al libro
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Nómina');

            // Generar nombre de archivo
            const fechaInicio = fecha_desde.replace(/-/g, '');
            const fechaFin = fecha_hasta.replace(/-/g, '');
            const nombreArchivo = `nomina_${fechaInicio}_${fechaFin}.xlsx`;

            // Generar buffer del archivo
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

            // Enviar archivo
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
            res.send(excelBuffer);
        } catch (error) {
            console.error('Error al generar archivo Excel:', error);
            return res.status(500).json({
                success: false,
                message: 'Error al generar archivo de nómina: ' + error.message
            });
        }
    });
});

module.exports = router;

