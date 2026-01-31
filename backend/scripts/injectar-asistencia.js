const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../database');
const DB_PATH = path.join(DB_DIR, 'rhr.db');

// Abrir base de datos directamente
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar con la base de datos:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos SQLite conectada');
        ejecutarScript();
    }
});

// Función para limpiar asistencia
function limpiarAsistencia(callback) {
    db.run('DELETE FROM asistencia', (err) => {
        if (err) {
            console.error('Error al limpiar asistencia:', err);
            callback(err);
        } else {
            console.log('✅ Asistencia limpiada');
            callback(null);
        }
    });
}

// Función para obtener empleados activos
function obtenerEmpleados(callback) {
    db.all('SELECT id, nombre, apellido, codigo, area, sueldo_base FROM empleados WHERE activo = 1', [], (err, empleados) => {
        if (err) {
            console.error('Error al obtener empleados:', err);
            callback(err, null);
        } else {
            callback(null, empleados);
        }
    });
}

// Función para formatear fecha DD/MM/YYYY
function formatearFecha(fecha) {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const año = fecha.getFullYear();
    return `${dia}/${mes}/${año}`;
}

// Función para formatear hora HH:MM:SS AM/PM (formato mexicano)
function formatearHora(fecha) {
    return fecha.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// Función para insertar registro de asistencia
function insertarAsistencia(empleado_id, fecha, hora, movimiento, turno, area, callback) {
    db.run(
        `INSERT INTO asistencia (empleado_id, fecha, hora, movimiento, turno, area) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [empleado_id, fecha, hora, movimiento, turno, area],
        function(err) {
            if (err) {
                console.error(`Error al insertar asistencia:`, err);
                callback(err);
            } else {
                callback(null);
            }
        }
    );
}

// Función para generar asistencia realista para una semana
function generarAsistenciaSemana(empleado, fechaInicio) {
    const registros = [];
    const turno = Math.floor(Math.random() * 3) + 1; // Turno aleatorio 1, 2 o 3
    
    // Horarios de entrada por turno (8 horas de trabajo)
    const horariosEntrada = {
        1: 6,   // Turno 1: 6 AM
        2: 14,  // Turno 2: 2 PM
        3: 22   // Turno 3: 10 PM
    };
    
    const horariosSalida = {
        1: 14,  // Turno 1: 2 PM
        2: 22,  // Turno 2: 10 PM
        3: 6    // Turno 3: 6 AM (día siguiente)
    };
    
    for (let dia = 0; dia < 7; dia++) {
        const fecha = new Date(fechaInicio);
        fecha.setDate(fecha.getDate() + dia);
        const fechaStr = formatearFecha(fecha);
        const esDomingo = fecha.getDay() === 0;
        
        // 90% de probabilidad de asistir (10% de faltas)
        if (Math.random() > 0.1) {
            const horaEntrada = horariosEntrada[turno];
            const horaSalida = horariosSalida[turno];
            
            // Crear fecha de entrada
            const fechaEntrada = new Date(fecha);
            fechaEntrada.setHours(horaEntrada, Math.floor(Math.random() * 30), Math.floor(Math.random() * 60), 0);
            const horaEntradaStr = formatearHora(fechaEntrada);
            
            // Crear fecha de salida
            let fechaSalida = new Date(fecha);
            if (turno === 3) {
                fechaSalida.setDate(fechaSalida.getDate() + 1); // Día siguiente para turno 3
            }
            fechaSalida.setHours(horaSalida, Math.floor(Math.random() * 30), Math.floor(Math.random() * 60), 0);
            const horaSalidaStr = formatearHora(fechaSalida);
            
            // Calcular horas extras si aplica
            let horasExtras = 0;
            if (Math.random() < 0.2 && !esDomingo) {
                horasExtras = Math.floor(Math.random() * 2) + 1; // 1-2 horas extras
            }
            
            // Ajustar hora de salida si hay horas extras
            if (horasExtras > 0) {
                fechaSalida.setHours(fechaSalida.getHours() + horasExtras);
                fechaSalida.setMinutes(fechaSalida.getMinutes() + Math.floor(Math.random() * 30));
            }
            
            // Registro de entrada
            registros.push({
                empleado_id: empleado.id,
                fecha: fechaStr,
                hora: formatearHora(fechaEntrada),
                movimiento: 'ENTRADA',
                turno: turno,
                area: empleado.area
            });
            
            // Registro de salida
            registros.push({
                empleado_id: empleado.id,
                fecha: turno === 3 ? formatearFecha(fechaSalida) : fechaStr,
                hora: formatearHora(fechaSalida),
                movimiento: 'SALIDA',
                turno: turno,
                area: empleado.area
            });
        }
    }
    
    return registros;
}

// Función principal
function ejecutarScript() {
    console.log('🧹 Limpiando asistencia existente...');
    
    limpiarAsistencia((err) => {
        if (err) {
            console.error('❌ Error al limpiar:', err);
            db.close();
            process.exit(1);
        }
        
        console.log('📋 Obteniendo empleados...');
        obtenerEmpleados((err, empleados) => {
            if (err) {
                console.error('❌ Error al obtener empleados:', err);
                db.close();
                process.exit(1);
            }
            
            if (!empleados || empleados.length === 0) {
                console.log('⚠️ No hay empleados activos');
                db.close();
                process.exit(0);
            }
            
            console.log(`✅ Encontrados ${empleados.length} empleados`);
            console.log('📅 Generando asistencia para la semana del 13/01/2026 al 19/01/2026...');
            
            // Generar asistencia para la semana del 13/01/2026 (lunes) al 19/01/2026 (domingo)
            const lunesPasado = new Date(2026, 0, 13); // 13 de enero de 2026
            lunesPasado.setHours(0, 0, 0, 0);
            
            let registrosInsertados = 0;
            let totalRegistros = 0;
            const promesas = [];
            
            empleados.forEach(empleado => {
                const registros = generarAsistenciaSemana(empleado, lunesPasado);
                totalRegistros += registros.length;
                
                registros.forEach((registro) => {
                    promesas.push(new Promise((resolve, reject) => {
                        insertarAsistencia(
                            registro.empleado_id,
                            registro.fecha,
                            registro.hora,
                            registro.movimiento,
                            registro.turno,
                            registro.area,
                            (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            }
                        );
                    }));
                });
            });
            
            // Esperar a que se inserten todos los registros
            Promise.all(promesas)
                .then(() => {
                    console.log(`✅ ${totalRegistros} registros de asistencia insertados`);
                    console.log('✨ Proceso completado');
                    db.close();
                    process.exit(0);
                })
                .catch((err) => {
                    console.error('❌ Error al insertar registros:', err);
                    db.close();
                    process.exit(1);
                });
        });
    });
}
