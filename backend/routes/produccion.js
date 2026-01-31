const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

// Función para calcular puntos por rango
function calcularPuntos(toneladas) {
    let puntos = {
        rango_25_30: 0,
        rango_30_35: 0,
        rango_35_40: 0,
        rango_40_plus: 0
    };

    if (toneladas >= 25 && toneladas < 30) {
        puntos.rango_25_30 = toneladas - 25;
    } else if (toneladas >= 30 && toneladas < 35) {
        puntos.rango_30_35 = toneladas - 30;
    } else if (toneladas >= 35 && toneladas < 40) {
        puntos.rango_35_40 = toneladas - 35;
    } else if (toneladas >= 40) {
        puntos.rango_40_plus = toneladas - 40;
    }

    return puntos;
}

// Registrar producción diaria
router.post('/', (req, res) => {
    try {
        const { empleado_id, nombre_encargado, fecha, turno, toneladas, comentarios } = req.body;
        const db = getDB();

        if (!db) {
            return res.status(500).json({ success: false, message: 'Base de datos no inicializada' });
        }

        // Validar que tenga empleado_id O nombre_encargado
        if (!empleado_id && !nombre_encargado) {
            return res.status(400).json({ success: false, message: 'Se requiere empleado_id o nombre_encargado' });
        }

        if (!fecha || !turno || toneladas === undefined) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }

        if (![1, 2, 3].includes(parseInt(turno))) {
            return res.status(400).json({ success: false, message: 'Turno inválido (debe ser 1, 2 o 3)' });
        }

        const toneladasNum = parseFloat(toneladas);
        if (isNaN(toneladasNum) || toneladasNum < 0) {
            return res.status(400).json({ success: false, message: 'Toneladas inválidas' });
        }

        // Validar nombre_encargado si se proporciona
        if (nombre_encargado && !['Iker', 'Rodrigo', 'Eliodoro', 'Williams'].includes(nombre_encargado)) {
            return res.status(400).json({ success: false, message: 'Nombre de encargado inválido' });
        }

        // Calcular puntos
        const puntos = calcularPuntos(toneladasNum);

        db.run(
            `INSERT INTO produccion_trituracion (empleado_id, nombre_encargado, fecha, turno, toneladas, puntos_rango_25_30, puntos_rango_30_35, puntos_rango_35_40, puntos_rango_40_plus, comentarios)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [empleado_id || null, nombre_encargado || null, fecha, turno, toneladasNum, puntos.rango_25_30, puntos.rango_30_35, puntos.rango_35_40, puntos.rango_40_plus, comentarios || null],
            function(err) {
                if (err) {
                    console.error('Error al insertar producción:', err);
                    return res.status(500).json({ success: false, message: 'Error al registrar producción: ' + err.message });
                }
                res.json({
                    success: true,
                    message: 'Producción registrada correctamente',
                    data: {
                        id: this.lastID,
                        puntos: puntos
                    }
                });
            }
        );
    } catch (error) {
        console.error('Error en POST /produccion:', error);
        res.status(500).json({ success: false, message: 'Error interno: ' + error.message });
    }
});

// Listar producción con filtros
router.get('/listar', (req, res) => {
    const { fecha, fecha_inicio, fecha_fin, empleado_id } = req.query;
    const db = getDB();

    let query = `
        SELECT 
            p.id,
            p.fecha,
            p.turno,
            p.toneladas,
            p.area,
            p.puntos_rango_25_30,
            p.puntos_rango_30_35,
            p.puntos_rango_35_40,
            p.puntos_rango_40_plus,
            p.nombre_encargado,
            p.comentarios,
            COALESCE(e.nombre, '') as nombre,
            COALESCE(e.apellido, '') as apellido,
            e.cargo
        FROM produccion_trituracion p
        LEFT JOIN empleados e ON p.empleado_id = e.id
        WHERE 1=1
    `;
    const params = [];


    if (fecha) {
        query += ' AND p.fecha = ?';
        params.push(fecha);
    }

    if (fecha_inicio && fecha_fin) {
        query += ' AND p.fecha >= ? AND p.fecha <= ?';
        params.push(fecha_inicio, fecha_fin);
    }

    if (empleado_id) {
        query += ' AND p.empleado_id = ?';
        params.push(empleado_id);
    }

    query += ' ORDER BY p.fecha DESC, p.turno ASC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al obtener producción: ' + err.message });
        }
        // Si hay nombre_encargado, usarlo en lugar de nombre/apellido
        const rowsProcessed = rows.map(row => {
            if (row.nombre_encargado) {
                return {
                    ...row,
                    nombre: row.nombre_encargado,
                    apellido: ''
                };
            }
            return row;
        });
        res.json({ success: true, data: rowsProcessed });
    });
});

// Obtener resumen mensual por empleado
router.get('/resumen-mensual', (req, res) => {
    const { mes } = req.query; // mes formato: "01/2026"
    const db = getDB();

    if (!mes) {
        return res.status(400).json({ success: false, message: 'Mes requerido (formato: MM/YYYY)' });
    }

    // Convertir mes formato "01/2026" a formato de fecha para comparación
    // La fecha está almacenada como "DD/MM/YYYY", necesitamos buscar por mes/año
    const [mesStr, añoStr] = mes.split('/');

    let query = `
        SELECT 
            e.id as empleado_id,
            e.nombre,
            e.apellido,
            e.cargo,
            COALESCE(SUM(p.puntos_rango_25_30), 0) as puntos_25_30,
            COALESCE(SUM(p.puntos_rango_30_35), 0) as puntos_30_35,
            COALESCE(SUM(p.puntos_rango_35_40), 0) as puntos_35_40,
            COALESCE(SUM(p.puntos_rango_40_plus), 0) as puntos_40_plus
        FROM empleados e
        LEFT JOIN produccion_trituracion p ON e.id = p.empleado_id 
            AND substr(p.fecha, 4, 2) = ? 
            AND substr(p.fecha, 7, 4) = ?
        WHERE e.activo = 1
    `;
    const params = [mesStr.padStart(2, '0'), añoStr];


    query += ' GROUP BY e.id, e.nombre, e.apellido, e.cargo HAVING (puntos_25_30 > 0 OR puntos_30_35 > 0 OR puntos_35_40 > 0 OR puntos_40_plus > 0) ORDER BY e.nombre, e.apellido';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al obtener resumen: ' + err.message });
        }
        res.json({ success: true, data: rows });
    });
});

// Calcular bonos mensuales
router.post('/calcular-bonos', (req, res) => {
    const { mes } = req.body; // mes formato: "01/2026"
    const db = getDB();

    if (!mes) {
        return res.status(400).json({ success: false, message: 'Mes requerido (formato: MM/YYYY)' });
    }

    // Obtener resumen mensual agrupado por nombre_encargado
    let queryResumen = `
        SELECT 
            COALESCE(p.nombre_encargado, '') as nombre_encargado,
            COALESCE(SUM(p.puntos_rango_25_30), 0) as puntos_25_30,
            COALESCE(SUM(p.puntos_rango_30_35), 0) as puntos_30_35,
            COALESCE(SUM(p.puntos_rango_35_40), 0) as puntos_35_40,
            COALESCE(SUM(p.puntos_rango_40_plus), 0) as puntos_40_plus
        FROM produccion_trituracion p
        WHERE substr(p.fecha, 4, 2) = ? 
            AND substr(p.fecha, 7, 4) = ?
            AND p.nombre_encargado IS NOT NULL
            AND p.nombre_encargado != ''
        GROUP BY p.nombre_encargado
        HAVING (puntos_25_30 > 0 OR puntos_30_35 > 0 OR puntos_35_40 > 0 OR puntos_40_plus > 0)
    `;

    // Convertir mes formato "01/2026" a formato de fecha para comparación
    const [mesStr, añoStr] = mes.split('/');
    
    db.all(queryResumen, [mesStr.padStart(2, '0'), añoStr], (err, empleados) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al calcular bonos: ' + err.message });
        }

        // Obtener precios y calcular promedio
        db.all(`SELECT tipo_empleado, rango, precio FROM configuracion_precios_bono WHERE activo = 1`, [], (err, precios) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error al obtener precios: ' + err.message });
            }

            // Calcular precios promedio por rango (promedio entre Operario y Ayudante)
            const preciosPromedio = {};
            const rangos = ['25-30', '30-35', '35-40', '40+'];
            
            rangos.forEach(rango => {
                const precioOperario = precios.find(p => p.tipo_empleado === 'Operario' && p.rango === rango)?.precio || 0;
                const precioAyudante = precios.find(p => p.tipo_empleado === 'Ayudante' && p.rango === rango)?.precio || 0;
                preciosPromedio[rango] = (precioOperario + precioAyudante) / 2;
            });

            // Calcular bono INDIVIDUAL para cada encargado
            const bonosCalculados = empleados.map(emp => {
                const ton25_30 = emp.puntos_25_30 || 0;
                const ton30_35 = emp.puntos_30_35 || 0;
                const ton35_40 = emp.puntos_35_40 || 0;
                const ton40_plus = emp.puntos_40_plus || 0;
                const nombreEncargado = emp.nombre_encargado || '';

                // Calcular bono por rango para este encargado
                const bono25_30 = ton25_30 * preciosPromedio['25-30'];
                const bono30_35 = ton30_35 * preciosPromedio['30-35'];
                const bono35_40 = ton35_40 * preciosPromedio['35-40'];
                const bono40_plus = ton40_plus * preciosPromedio['40+'];

                // Bono total individual del encargado (suma de todos los rangos)
                const bonoTotalBruto = bono25_30 + bono30_35 + bono35_40 + bono40_plus;
                
                // Total individual = bono total / 4
                const bonoTotalIndividual = bonoTotalBruto / 4;

                return {
                    nombre_encargado: nombreEncargado,
                    nombre: nombreEncargado,
                    apellido: '',
                    toneladas_25_30: ton25_30,
                    toneladas_30_35: ton30_35,
                    toneladas_35_40: ton35_40,
                    toneladas_40_plus: ton40_plus,
                    bono_25_30: bono25_30,
                    bono_30_35: bono30_35,
                    bono_35_40: bono35_40,
                    bono_40_plus: bono40_plus,
                    bono_total_bruto: bonoTotalBruto,
                    bono_total_individual: bonoTotalIndividual
                };
            });

            res.json({
                success: true,
                data: {
                    empleados: bonosCalculados,
                    mes: mes
                }
            });
        });
    });
});

// Eliminar registro de producción
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const db = getDB();

    db.run('DELETE FROM produccion_trituracion WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al eliminar registro: ' + err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        }
        res.json({ success: true, message: 'Registro eliminado correctamente' });
    });
});

// Obtener un registro por ID (DEBE estar antes de /:id DELETE)
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const db = getDB();

    db.get(
        `SELECT 
            p.id,
            p.fecha,
            p.turno,
            p.toneladas,
            p.nombre_encargado,
            p.puntos_rango_25_30,
            p.puntos_rango_30_35,
            p.puntos_rango_35_40,
            p.puntos_rango_40_plus,
            p.comentarios,
            COALESCE(e.nombre, '') as nombre,
            COALESCE(e.apellido, '') as apellido
         FROM produccion_trituracion p
         LEFT JOIN empleados e ON p.empleado_id = e.id
         WHERE p.id = ?`,
        [id],
        (err, registro) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error al obtener registro: ' + err.message });
            }
            if (!registro) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }
            res.json({ success: true, data: registro });
        }
    );
});

// Actualizar un registro (DEBE estar antes de DELETE /:id)
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { nombre_encargado, fecha, turno, toneladas, comentarios } = req.body;
    const db = getDB();

    if (!fecha || !turno || toneladas === undefined) {
        return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
    }

    if (![1, 2, 3].includes(parseInt(turno))) {
        return res.status(400).json({ success: false, message: 'Turno inválido (debe ser 1, 2 o 3)' });
    }

    const toneladasNum = parseFloat(toneladas);
    if (isNaN(toneladasNum) || toneladasNum < 0) {
        return res.status(400).json({ success: false, message: 'Toneladas inválidas' });
    }

    // Validar nombre_encargado si se proporciona
    if (nombre_encargado && !['Iker', 'Rodrigo', 'Eliodoro', 'Williams'].includes(nombre_encargado)) {
        return res.status(400).json({ success: false, message: 'Nombre de encargado inválido' });
    }

    // Calcular puntos
    const puntos = calcularPuntos(toneladasNum);

    db.run(
        `UPDATE produccion_trituracion 
         SET nombre_encargado = ?, fecha = ?, turno = ?, toneladas = ?, 
             puntos_rango_25_30 = ?, puntos_rango_30_35 = ?, puntos_rango_35_40 = ?, puntos_rango_40_plus = ?, comentarios = ?
         WHERE id = ?`,
        [nombre_encargado || null, fecha, turno, toneladasNum, 
         puntos.rango_25_30, puntos.rango_30_35, puntos.rango_35_40, puntos.rango_40_plus, comentarios || null, id],
        function(err) {
            if (err) {
                console.error('Error al actualizar producción:', err);
                return res.status(500).json({ success: false, message: 'Error al actualizar registro: ' + err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Registro no encontrado' });
            }
            res.json({
                success: true,
                message: 'Registro actualizado correctamente',
                data: {
                    id: parseInt(id),
                    puntos: puntos
                }
            });
        }
    );
});

// Limpiar registros (eliminar todos los registros)
router.delete('/limpiar/registros', (req, res) => {
    const db = getDB();

    db.run('DELETE FROM produccion_trituracion', [], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al limpiar registros: ' + err.message });
        }
        res.json({ 
            success: true, 
            message: `${this.changes} registro(s) eliminado(s) correctamente`,
            registros_eliminados: this.changes
        });
    });
});

module.exports = router;

