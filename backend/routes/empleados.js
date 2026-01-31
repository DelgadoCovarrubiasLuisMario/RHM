const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const crypto = require('crypto');
const { getDB } = require('../database/db');

// Función para generar código único
function generarCodigo(nombre, apellido) {
    const texto = `${nombre}${apellido}${Date.now()}${Math.random()}`;
    return crypto.createHash('md5').update(texto).digest('hex').substring(0, 8);
}

// Listar empleados (DEBE estar antes de /:empleado_id)
router.get('/listar', (req, res) => {
    const db = getDB();

    db.all(
        `SELECT id, codigo, nombre, apellido, email, telefono, sueldo_base, activo, foto, COALESCE(cargo, 'Desconocido') as cargo
         FROM empleados 
         WHERE activo = 1
         ORDER BY nombre, apellido`,
        [],
        (err, empleados) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener empleados: ' + err.message 
                });
            }

            res.json({
                success: true,
                data: empleados,
                total: empleados.length
            });
        }
    );
});

// Listar todos los empleados con cargo y exámenes médicos (para Inducción y cursos)
// DEBE estar antes de /:empleado_id
router.get('/listar-con-cargos', (req, res) => {
    const db = getDB();

    db.all(
        `SELECT 
            e.id, 
            e.codigo, 
            e.nombre, 
            e.apellido, 
            COALESCE(e.cargo, 'Desconocido') as cargo,
            COALESCE(em.quimica_sanguinea, 0) as quimica_sanguinea,
            COALESCE(em.antidoping, 0) as antidoping,
            COALESCE(em.electrocardiogram, 0) as electrocardiogram,
            COALESCE(em.espirometrias, 0) as espirometrias,
            COALESCE(em.audiometrias, 0) as audiometrias,
            em.vigencia_de,
            em.fecha_nacimiento,
            em.vence_induccion,
            em.mandar_a_curso
         FROM empleados e
         LEFT JOIN examenes_medicos em ON e.id = em.empleado_id
         WHERE e.activo = 1
         ORDER BY e.nombre, e.apellido`,
        [],
        (err, empleados) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener empleados: ' + err.message 
                });
            }

            res.json({
                success: true,
                data: empleados,
                total: empleados.length
            });
        }
    );
});

// Obtener un empleado por ID
router.get('/:empleado_id', (req, res) => {
    const { empleado_id } = req.params;
    const db = getDB();

    db.get(
        `SELECT id, codigo, nombre, apellido, email, telefono, sueldo_base, activo, foto, COALESCE(cargo, 'Desconocido') as cargo
         FROM empleados 
         WHERE id = ?`,
        [empleado_id],
        (err, empleado) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener empleado: ' + err.message 
                });
            }

            if (!empleado) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Empleado no encontrado' 
                });
            }

            res.json({
                success: true,
                data: empleado
            });
        }
    );
});

// Crear nuevo empleado
router.post('/', (req, res) => {
    const { nombre, apellido, email, telefono, sueldo_base, cargo } = req.body;
    const db = getDB();

    // Validar campos requeridos
    if (!nombre || !apellido || !sueldo_base) {
        return res.status(400).json({ 
            success: false, 
            message: 'nombre, apellido y sueldo_base son requeridos' 
        });
    }

    // Validar sueldo base (obligatorio)
    const sueldoBase = parseFloat(sueldo_base);
    if (isNaN(sueldoBase) || sueldoBase <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'sueldo_base debe ser un número positivo' 
        });
    }

    // Generar código único
    const codigo = generarCodigo(nombre, apellido);

    // Insertar empleado
    db.run(
        `INSERT INTO empleados (codigo, nombre, apellido, email, telefono, sueldo_base, cargo, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [codigo, nombre.trim(), apellido.trim(), null, null, sueldoBase, cargo || null, 1],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'El código generado ya existe. Intenta nuevamente.' 
                    });
                }
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al crear empleado: ' + err.message 
                });
            }

            res.json({
                success: true,
                message: `Empleado ${nombre} ${apellido} creado correctamente`,
                    data: {
                        id: this.lastID,
                        codigo: codigo,
                        nombre: nombre.trim(),
                        apellido: apellido.trim(),
                        sueldo_base: sueldoBase,
                        cargo: cargo || null
                    }
            });
        }
    );
});

// Actualizar empleado
router.put('/:empleado_id', (req, res) => {
    const { empleado_id } = req.params;
    const { nombre, apellido, email, telefono, sueldo_base, cargo, activo } = req.body;
    const db = getDB();

    // Validar que el empleado existe
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

            // Construir query de actualización dinámicamente
            const updates = [];
            const values = [];

            if (nombre !== undefined) {
                updates.push('nombre = ?');
                values.push(nombre.trim());
            }
            if (apellido !== undefined) {
                updates.push('apellido = ?');
                values.push(apellido.trim());
            }
            if (sueldo_base !== undefined) {
                const sueldoBase = parseFloat(sueldo_base);
                if (isNaN(sueldoBase) || sueldoBase < 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'sueldo_base debe ser un número positivo' 
                    });
                }
                updates.push('sueldo_base = ?');
                values.push(sueldoBase);
            }
            if (cargo !== undefined) {
                updates.push('cargo = ?');
                values.push(cargo || null);
            }
            if (activo !== undefined) {
                updates.push('activo = ?');
                values.push(activo ? 1 : 0);
            }

            if (updates.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No se proporcionaron campos para actualizar' 
                });
            }

            values.push(empleado_id);

            // Actualizar empleado
            db.run(
                `UPDATE empleados SET ${updates.join(', ')} WHERE id = ?`,
                values,
                function(updateErr) {
                    if (updateErr) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error al actualizar empleado: ' + updateErr.message 
                        });
                    }

                    res.json({
                        success: true,
                        message: `Empleado ${empleado.nombre} ${empleado.apellido} actualizado correctamente`,
                        changes: this.changes
                    });
                }
            );
        }
    );
});

// Eliminar empleado y todos sus registros relacionados
router.delete('/:empleado_id', (req, res) => {
    const { empleado_id } = req.params;
    const db = getDB();

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

            // Eliminar todos los registros relacionados y el empleado físicamente
            db.serialize(() => {
                // 1. Eliminar asistencia
                db.run('DELETE FROM asistencia WHERE empleado_id = ?', [empleado_id], (err) => {
                    if (err) console.error('Error al eliminar asistencia:', err);
                });

                // 2. Eliminar pagos
                db.run('DELETE FROM pagos WHERE empleado_id = ?', [empleado_id], (err) => {
                    if (err) console.error('Error al eliminar pagos:', err);
                });

                // 3. Eliminar producción (bonos)
                db.run('DELETE FROM produccion_trituracion WHERE empleado_id = ?', [empleado_id], (err) => {
                    if (err) console.error('Error al eliminar producción:', err);
                });

                // 4. Eliminar vacaciones
                db.run('DELETE FROM vacaciones WHERE empleado_id = ?', [empleado_id], (err) => {
                    if (err) console.error('Error al eliminar vacaciones:', err);
                });

                // 5. Eliminar uniformes y botas
                db.run('DELETE FROM uniformes_y_botas WHERE empleado_id = ?', [empleado_id], (err) => {
                    if (err) console.error('Error al eliminar uniformes:', err);
                });

                // 6. Eliminar descuentos varios
                db.run('DELETE FROM descuentos_varios WHERE empleado_id = ?', [empleado_id], (err) => {
                    if (err) console.error('Error al eliminar descuentos:', err);
                });

                // 7. Eliminar exámenes médicos
                db.run('DELETE FROM examenes_medicos WHERE empleado_id = ?', [empleado_id], (err) => {
                    if (err) console.error('Error al eliminar exámenes médicos:', err);
                });

                // 8. Eliminar empleado físicamente (no solo marcarlo como inactivo)
                db.run(
                    'DELETE FROM empleados WHERE id = ?',
                    [empleado_id],
                    function(deleteErr) {
                        if (deleteErr) {
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Error al eliminar empleado: ' + deleteErr.message 
                            });
                        }

                        if (this.changes === 0) {
                            return res.status(404).json({ 
                                success: false, 
                                message: 'Empleado no encontrado' 
                            });
                        }

                        res.json({
                            success: true,
                            message: `Empleado ${empleado.nombre} ${empleado.apellido} y todos sus registros eliminados completamente`
                        });
                    }
                );
            });
        }
    );
});

// Obtener descuentos de un empleado
router.get('/:empleado_id/descuentos', (req, res) => {
    const { empleado_id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;
    const db = getDB();

    let query = `
        SELECT id, fecha_inicio, fecha_fin, monto, descripcion, creado_en
        FROM descuentos_varios
        WHERE empleado_id = ?
    `;
    const params = [empleado_id];

    if (fecha_inicio && fecha_fin) {
        query += ' AND fecha_inicio = ? AND fecha_fin = ?';
        params.push(fecha_inicio, fecha_fin);
    }

    query += ' ORDER BY creado_en DESC LIMIT 100';

    db.all(query, params, (err, descuentos) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener descuentos: ' + err.message 
            });
        }

        res.json({
            success: true,
            data: descuentos,
            total: descuentos.length
        });
    });
});

// Agregar descuento a un empleado
router.post('/:empleado_id/descuentos', (req, res) => {
    const { empleado_id } = req.params;
    const { fecha_inicio, fecha_fin, monto, descripcion } = req.body;
    const db = getDB();

    // Validar campos requeridos
    if (!fecha_inicio || !fecha_fin || !monto) {
        return res.status(400).json({ 
            success: false, 
            message: 'fecha_inicio, fecha_fin y monto son requeridos' 
        });
    }

    // Validar que el monto sea un número positivo
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'El monto debe ser un número positivo' 
        });
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

            // Insertar descuento
            db.run(
                `INSERT INTO descuentos_varios (empleado_id, fecha_inicio, fecha_fin, monto, descripcion)
                 VALUES (?, ?, ?, ?, ?)`,
                [empleado_id, fecha_inicio, fecha_fin, montoNum, descripcion || null],
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error al agregar descuento: ' + err.message 
                        });
                    }

                    res.json({
                        success: true,
                        message: `Descuento agregado a ${empleado.nombre} ${empleado.apellido}`,
                        descuento_id: this.lastID
                    });
                }
            );
        }
    );
});

// Eliminar descuento
router.delete('/descuentos/:descuento_id', (req, res) => {
    const { descuento_id } = req.params;
    const db = getDB();

    db.run(
        `DELETE FROM descuentos_varios WHERE id = ?`,
        [descuento_id],
        function(err) {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al eliminar descuento: ' + err.message 
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Descuento no encontrado' 
                });
            }

            res.json({
                success: true,
                message: 'Descuento eliminado correctamente'
            });
        }
    );
});

// Generar código QR para un empleado (devuelve imagen en base64)
router.get('/:empleado_id/qr', async (req, res) => {
    const { empleado_id } = req.params;
    const db = getDB();

    db.get('SELECT id, codigo, nombre, apellido FROM empleados WHERE id = ?', 
        [empleado_id], 
        async (err, empleado) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener empleado: ' + err.message 
                });
            }

            if (!empleado) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Empleado no encontrado' 
                });
            }

            try {
                // Generar QR con el código del empleado
                const qrDataURL = await QRCode.toDataURL(empleado.codigo, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });

                res.json({
                    success: true,
                    qr_image: qrDataURL,
                    qr_text: empleado.codigo,
                    empleado: empleado
                });
            } catch (error) {
                res.status(500).json({ 
                    success: false, 
                    message: 'Error al generar QR: ' + error.message 
                });
            }
        }
    );
});

// Actualizar estado de un examen médico
router.post('/:empleado_id/examen-medico', (req, res) => {
    const { empleado_id } = req.params;
    const { tipo_examen, completado } = req.body;
    const db = getDB();

    const examenesValidos = ['quimica_sanguinea', 'antidoping', 'electrocardiogram', 'espirometrias', 'audiometrias'];
    
    if (!examenesValidos.includes(tipo_examen)) {
        return res.status(400).json({
            success: false,
            message: 'Tipo de examen inválido'
        });
    }

    const valor = completado ? 1 : 0;

    // Primero verificar si existe un registro
    db.get(`SELECT id FROM examenes_medicos WHERE empleado_id = ?`, [empleado_id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al verificar examen: ' + err.message
            });
        }

        if (row) {
            // Actualizar registro existente
            db.run(
                `UPDATE examenes_medicos SET ${tipo_examen} = ?, actualizado_en = CURRENT_TIMESTAMP WHERE empleado_id = ?`,
                [valor, empleado_id],
                function(updateErr) {
                    if (updateErr) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al actualizar examen: ' + updateErr.message
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Examen actualizado correctamente'
                    });
                }
            );
        } else {
            // Insertar nuevo registro
            db.run(
                `INSERT INTO examenes_medicos (empleado_id, ${tipo_examen}, actualizado_en)
                 VALUES (?, ?, CURRENT_TIMESTAMP)`,
                [empleado_id, valor],
                function(insertErr) {
                    if (insertErr) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al insertar examen: ' + insertErr.message
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Examen actualizado correctamente'
                    });
                }
            );
        }
    });
});

// Actualizar fecha de curso o inducción
router.put('/:empleado_id/fecha-curso', (req, res) => {
    const { empleado_id } = req.params;
    const { tipo_fecha, fecha } = req.body;
    const db = getDB();

    const fechasValidas = ['vence_induccion', 'mandar_a_curso', 'vigencia_de', 'fecha_nacimiento'];
    
    if (!fechasValidas.includes(tipo_fecha)) {
        return res.status(400).json({
            success: false,
            message: 'Tipo de fecha inválido. Debe ser "vence_induccion", "mandar_a_curso", "vigencia_de" o "fecha_nacimiento"'
        });
    }

    // Validar formato de fecha (DD/MM/YYYY)
    if (fecha && !/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
        return res.status(400).json({
            success: false,
            message: 'Formato de fecha inválido. Debe ser DD/MM/YYYY'
        });
    }

    // Verificar si existe un registro
    db.get(`SELECT id FROM examenes_medicos WHERE empleado_id = ?`, [empleado_id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al verificar registro: ' + err.message
            });
        }

        const fechaValor = fecha || null;

        if (row) {
            // Actualizar registro existente
            db.run(
                `UPDATE examenes_medicos SET ${tipo_fecha} = ?, actualizado_en = CURRENT_TIMESTAMP WHERE empleado_id = ?`,
                [fechaValor, empleado_id],
                function(updateErr) {
                    if (updateErr) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al actualizar fecha: ' + updateErr.message
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Fecha actualizada correctamente'
                    });
                }
            );
        } else {
            // Insertar nuevo registro
            db.run(
                `INSERT INTO examenes_medicos (empleado_id, ${tipo_fecha}, actualizado_en)
                 VALUES (?, ?, CURRENT_TIMESTAMP)`,
                [empleado_id, fechaValor],
                function(insertErr) {
                    if (insertErr) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al insertar fecha: ' + insertErr.message
                        });
                    }

                    res.json({
                        success: true,
                        message: 'Fecha actualizada correctamente'
                    });
                }
            );
        }
    });
});

module.exports = router;

