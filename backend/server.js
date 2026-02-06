const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase, getDB } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar base de datos
initDatabase();

// Ruta principal - redirige al login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API Routes
app.use('/api/asistencia', require('./routes/asistencia'));
app.use('/api/sueldos', require('./routes/sueldos'));
app.use('/api/pagos', require('./routes/pagos'));
app.use('/api/empleados', require('./routes/empleados'));
app.use('/api/uniformes', require('./routes/uniformes'));
app.use('/api/vacaciones', require('./routes/vacaciones'));
app.use('/api/produccion', require('./routes/produccion'));

// Manejo de errores para rutas API
app.use('/api/*', (req, res, next) => {
    res.status(404).json({ success: false, message: 'Ruta API no encontrada' });
});

// Manejo de errores general
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (req.path.startsWith('/api/')) {
        res.status(err.status || 500).json({ 
            success: false, 
            message: err.message || 'Error interno del servidor' 
        });
    } else {
        next(err);
    }
});

// Función para limpiar registros antiguos (más de 60 días)
function limpiarRegistrosAntiguos() {
    const db = getDB();
    if (!db) {
        console.log('⚠️ Base de datos no inicializada, no se pueden limpiar registros');
        return;
    }

    try {
        // Calcular fecha límite (60 días atrás)
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - 60);
        
        // Formatear fecha en formato DD/MM/YYYY para comparación
        const dia = String(fechaLimite.getDate()).padStart(2, '0');
        const mes = String(fechaLimite.getMonth() + 1).padStart(2, '0');
        const año = fechaLimite.getFullYear();
        const fechaLimiteStr = `${dia}/${mes}/${año}`;

        // Función auxiliar para comparar fechas DD/MM/YYYY
        // Retorna true si fecha1 < fecha2
        function compararFechas(fecha1, fecha2) {
            const [d1, m1, a1] = fecha1.split('/').map(Number);
            const [d2, m2, a2] = fecha2.split('/').map(Number);
            if (a1 !== a2) return a1 < a2;
            if (m1 !== m2) return m1 < m2;
            return d1 < d2;
        }

        // Limpiar asistencia (usando fecha en formato DD/MM/YYYY)
        db.all(`SELECT id, fecha FROM asistencia`, [], (err, registros) => {
            if (err) {
                console.error('Error al obtener registros de asistencia:', err);
                return;
            }
            const idsAEliminar = registros
                .filter(reg => compararFechas(reg.fecha, fechaLimiteStr))
                .map(reg => reg.id);
            
            if (idsAEliminar.length > 0) {
                const placeholders = idsAEliminar.map(() => '?').join(',');
                db.run(
                    `DELETE FROM asistencia WHERE id IN (${placeholders})`,
                    idsAEliminar,
                    function(err) {
                        if (err) {
                            console.error('Error al limpiar registros de asistencia:', err);
                        } else {
                            console.log(`🧹 Limpieza automática: ${this.changes} registro(s) de asistencia eliminado(s) (más de 60 días)`);
                        }
                    }
                );
            }
        });

        // Limpiar pagos (usando fecha_inicio en formato DD/MM/YYYY)
        db.all(`SELECT id, fecha_inicio FROM pagos`, [], (err, registros) => {
            if (err) {
                console.error('Error al obtener registros de pagos:', err);
                return;
            }
            const idsAEliminar = registros
                .filter(reg => compararFechas(reg.fecha_inicio, fechaLimiteStr))
                .map(reg => reg.id);
            
            if (idsAEliminar.length > 0) {
                const placeholders = idsAEliminar.map(() => '?').join(',');
                db.run(
                    `DELETE FROM pagos WHERE id IN (${placeholders})`,
                    idsAEliminar,
                    function(err) {
                        if (err) {
                            console.error('Error al limpiar registros de pagos:', err);
                        } else {
                            console.log(`🧹 Limpieza automática: ${this.changes} registro(s) de pagos eliminado(s) (más de 60 días)`);
                        }
                    }
                );
            }
        });

        // Limpiar producción (bonos) (usando fecha en formato DD/MM/YYYY)
        db.all(`SELECT id, fecha FROM produccion_trituracion`, [], (err, registros) => {
            if (err) {
                console.error('Error al obtener registros de producción:', err);
                return;
            }
            const idsAEliminar = registros
                .filter(reg => compararFechas(reg.fecha, fechaLimiteStr))
                .map(reg => reg.id);
            
            if (idsAEliminar.length > 0) {
                const placeholders = idsAEliminar.map(() => '?').join(',');
                db.run(
                    `DELETE FROM produccion_trituracion WHERE id IN (${placeholders})`,
                    idsAEliminar,
                    function(err) {
                        if (err) {
                            console.error('Error al limpiar registros de producción:', err);
                        } else {
                            console.log(`🧹 Limpieza automática: ${this.changes} registro(s) de producción eliminado(s) (más de 60 días)`);
                        }
                    }
                );
            }
        });
    } catch (error) {
        console.error('Error en limpieza automática:', error);
    }
}

// Función para cerrar jornadas automáticamente (proceso periódico)
function cerrarJornadasPendientes() {
    const { getDB } = require('./database/db');
    const db = getDB();
    
    if (!db) {
        console.log('⚠️ Base de datos no inicializada, no se pueden cerrar jornadas');
        return;
    }

    // Importar función de cierre automático
    const asistenciaRoutes = require('./routes/asistencia');
    
    if (asistenciaRoutes.cerrarJornadasAutomaticamente) {
        asistenciaRoutes.cerrarJornadasAutomaticamente(db)
        .then(resultado => {
            if (resultado.cerradas > 0) {
                console.log(`✅ ${resultado.cerradas} jornada(s) cerrada(s) automáticamente`);
                resultado.mensajes.forEach(msg => console.log(`   - ${msg}`));
            }
        })
        .catch(error => {
            console.error('❌ Error al cerrar jornadas automáticamente:', error);
        });
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📱 Listo para usar en tablets y navegadores`);
    
    // Ejecutar limpieza al iniciar
    setTimeout(() => {
        limpiarRegistrosAntiguos();
        cerrarJornadasPendientes(); // Cerrar jornadas pendientes al iniciar
    }, 5000); // Esperar 5 segundos para que la BD esté lista
    
    // Ejecutar limpieza diariamente (cada 24 horas)
    setInterval(() => {
        limpiarRegistrosAntiguos();
    }, 24 * 60 * 60 * 1000); // 24 horas en milisegundos
    
    // Cerrar jornadas automáticamente cada hora
    setInterval(() => {
        cerrarJornadasPendientes();
    }, 60 * 60 * 1000); // 1 hora en milisegundos
});

