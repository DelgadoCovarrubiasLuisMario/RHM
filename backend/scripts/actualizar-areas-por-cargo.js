const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada\n');
        actualizarAreas();
    }
});

function actualizarAreas() {
    console.log('📋 Actualizando áreas según cargo...\n');
    
    // Obtener todos los empleados activos
    db.all('SELECT id, nombre, apellido, area, cargo FROM empleados WHERE activo = 1', [], (err, empleados) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        let actualizados = 0;
        let sinCambios = 0;
        const cambios = [];
        
        empleados.forEach(empleado => {
            const cargoUpper = (empleado.cargo || '').toUpperCase();
            let areaCorrecta = null;
            
            // Si el cargo contiene "GEOCYCLE", es GeoCycle
            if (cargoUpper.includes('GEOCYCLE')) {
                areaCorrecta = 'GeoCycle';
            } else if (cargoUpper && cargoUpper !== 'DESCONOCIDO') {
                // Si tiene cargo y no es desconocido, es Planta
                areaCorrecta = 'Planta';
            }
            
            // Si se determinó un área y es diferente a la actual, actualizar
            if (areaCorrecta && empleado.area !== areaCorrecta) {
                db.run(
                    'UPDATE empleados SET area = ? WHERE id = ?',
                    [areaCorrecta, empleado.id],
                    function(updateErr) {
                        if (updateErr) {
                            console.error(`   ❌ Error al actualizar ${empleado.nombre}:`, updateErr.message);
                        } else {
                            actualizados++;
                            cambios.push({
                                nombre: `${empleado.nombre} ${empleado.apellido}`,
                                cargo: empleado.cargo || 'Sin cargo',
                                areaAnterior: empleado.area,
                                areaNueva: areaCorrecta
                            });
                            console.log(`   ✅ ${empleado.nombre} ${empleado.apellido}: ${empleado.area} → ${areaCorrecta} (${empleado.cargo || 'Sin cargo'})`);
                        }
                        
                        // Cuando terminemos de procesar todos
                        if (actualizados + sinCambios === empleados.length) {
                            console.log(`\n✅ Proceso completado:`);
                            console.log(`   - ${actualizados} empleados actualizados`);
                            console.log(`   - ${sinCambios} empleados sin cambios`);
                            
                            if (cambios.length > 0) {
                                console.log(`\n📋 Cambios realizados:`);
                                cambios.forEach(c => {
                                    console.log(`   • ${c.nombre} (${c.cargo}): ${c.areaAnterior} → ${c.areaNueva}`);
                                });
                            }
                            
                            db.close();
                            process.exit(0);
                        }
                    }
                );
            } else {
                sinCambios++;
                if (actualizados + sinCambios === empleados.length) {
                    console.log(`\n✅ Proceso completado:`);
                    console.log(`   - ${actualizados} empleados actualizados`);
                    console.log(`   - ${sinCambios} empleados sin cambios`);
                    db.close();
                    process.exit(0);
                }
            }
        });
        
        if (empleados.length === 0) {
            console.log('⚠️  No hay empleados activos');
            db.close();
            process.exit(0);
        }
    });
}

