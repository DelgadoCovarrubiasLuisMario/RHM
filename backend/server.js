// Zona horaria por defecto (Droplet suele estar en UTC; asistencia y cálculos usan hora local MX)
if (!process.env.TZ) {
    process.env.TZ = 'America/Mexico_City';
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const https = require('https');
const { initDatabase, getDB, migrateAsistenciaTurno4 } = require('./database/db');
const { obtenerCredencialesHttps, listarIpsLan } = require('./https-cert');

const app = express();
const PORT = process.env.PORT || 3000;
// Por defecto HTTPS ON: en tablets/LAN la cámara exige contexto seguro (https://IP).
// Desactivar: USE_HTTPS=0
const USE_HTTPS = process.env.USE_HTTPS !== '0';
const HTTP_REDIRECT_PORT = parseInt(process.env.HTTP_REDIRECT_PORT || '3080', 10);

// Middlewares
// Límite alto: la foto de entrada va en JSON como data URL (base64) y supera el default de 100kb.
app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar base de datos
initDatabase();
setTimeout(() => migrateAsistenciaTurno4(), 1000);

// Ruta principal - redirige al login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API Routes
app.use('/api/asistencia', require('./routes/asistencia'));
app.use('/api/auth', require('./routes/auth'));
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
}

function iniciarTareasPeriodicas() {
    setTimeout(() => {
        limpiarRegistrosAntiguos();
        cerrarJornadasPendientes();
    }, 5000);

    setInterval(() => {
        limpiarRegistrosAntiguos();
    }, 24 * 60 * 60 * 1000);

    setInterval(() => {
        cerrarJornadasPendientes();
    }, 60 * 60 * 1000);
}

function imprimirUrlsAcceso(protocolo, puerto) {
    const ips = listarIpsLan().filter((ip) => ip !== '127.0.0.1');
    console.log(`🚀 Servidor ${protocolo.toUpperCase()} en puerto ${puerto}`);
    console.log(`   Local: ${protocolo}://localhost:${puerto}`);
    ips.forEach((ip) => {
        console.log(`   LAN:   ${protocolo}://${ip}:${puerto}`);
    });
}

// Iniciar servidor (HTTPS autofirmado para cámara en tablets sin dominio)
if (USE_HTTPS) {
    let credenciales;
    try {
        credenciales = obtenerCredencialesHttps();
    } catch (error) {
        console.error('❌ No se pudo crear/cargar certificado HTTPS:', error.message);
        console.error('   Arrancando solo HTTP (la cámara NO funcionará en tablets por IP).');
        http.createServer(app).listen(PORT, '0.0.0.0', () => {
            imprimirUrlsAcceso('http', PORT);
            iniciarTareasPeriodicas();
        });
    }

    if (credenciales) {
        https.createServer(credenciales, app).listen(PORT, '0.0.0.0', () => {
            imprimirUrlsAcceso('https', PORT);
            console.log('📱 Cámara: abre con https:// (no http://)');
            console.log('⚠️  Certificado autofirmado: en cada tablet acepta "Avanzado → Continuar".');
            iniciarTareasPeriodicas();
        });

        // HTTP auxiliar: redirige a HTTPS para no confundir con el enlace viejo
        http.createServer((req, res) => {
            const hostHeader = req.headers.host || `localhost:${HTTP_REDIRECT_PORT}`;
            const hostname = hostHeader.replace(/:\d+$/, '');
            const location = `https://${hostname}:${PORT}${req.url || '/'}`;
            res.writeHead(302, { Location: location });
            res.end();
        }).listen(HTTP_REDIRECT_PORT, '0.0.0.0', () => {
            console.log(`↪️  HTTP :${HTTP_REDIRECT_PORT} redirige a HTTPS :${PORT}`);
        });
    }
} else {
    http.createServer(app).listen(PORT, '0.0.0.0', () => {
        imprimirUrlsAcceso('http', PORT);
        console.log('⚠️  USE_HTTPS=0: sin HTTPS la cámara no funciona fuera de localhost.');
        iniciarTareasPeriodicas();
    });
}

