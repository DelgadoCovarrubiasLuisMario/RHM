const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const empleadosAEliminar = [
    'CORTES TORRES NESTOR RAFAEL',
    'GRANA VIRGEN JOSE GUADALUPE',
    'MARTINEZ HUERTA JOSÉ FRANCISCO',
    'MARTINEZ MAGAÑA JULIAN',
    'MORFIN SANDOVAL CARLOS ISMAEL',
    'MARTINEZ HUERTA AMELIA'
];

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Base de datos conectada');
    eliminarEmpleados();
});

function normalizarNombre(nombre) {
    return nombre.toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function eliminarEmpleados() {
    console.log('\n🗑️ Eliminando empleados que ya no trabajan...\n');
    
    let eliminados = 0;
    let noEncontrados = [];
    
    empleadosAEliminar.forEach((nombreBuscar, index) => {
        const nombreNormalizado = normalizarNombre(nombreBuscar);
        
        db.all('SELECT id, nombre, apellido FROM empleados', [], (err, empleados) => {
            if (err) {
                console.error('Error:', err.message);
                return;
            }
            
            // Buscar empleado
            const empleado = empleados.find(emp => {
                const empNombre = normalizarNombre(`${emp.nombre} ${emp.apellido}`);
                return empNombre === nombreNormalizado || 
                       empNombre.includes(nombreNormalizado) || 
                       nombreNormalizado.includes(empNombre);
            });
            
            if (empleado) {
                // Eliminar físicamente (o marcar como inactivo)
                db.run('DELETE FROM empleados WHERE id = ?', [empleado.id], function(err) {
                    if (err) {
                        console.error(`❌ Error al eliminar ${empleado.nombre} ${empleado.apellido}:`, err.message);
                    } else {
                        eliminados++;
                        console.log(`✅ ${eliminados}. ${empleado.nombre} ${empleado.apellido} - Eliminado`);
                        
                        // También eliminar exámenes médicos relacionados
                        db.run('DELETE FROM examenes_medicos WHERE empleado_id = ?', [empleado.id], () => {});
                    }
                });
            } else {
                noEncontrados.push(nombreBuscar);
            }
        });
    });
    
    setTimeout(() => {
        console.log(`\n✅ Proceso completado:`);
        console.log(`   - Empleados eliminados: ${eliminados}`);
        if (noEncontrados.length > 0) {
            console.log(`   - No encontrados: ${noEncontrados.length}`);
            noEncontrados.forEach(n => console.log(`     - ${n}`));
        }
        db.close();
    }, 2000);
}

