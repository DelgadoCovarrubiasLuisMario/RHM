const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const nombresAEliminar = [
    'CORTES TORRES NESTOR RAFAEL',
    'GRANA VIRGEN JOSE GUADALUPE',
    'MARTINEZ HUERTA JOSÉ FRANCISCO',
    'MARTINEZ MAGAÑA JULIAN',
    'MORFIN SANDOVAL CARLOS ISMAEL',
    'MARTINEZ HUERTA AMELIA'
];

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar:', err.message);
        process.exit(1);
    }
    
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
    console.log('🗑️ Buscando y eliminando empleados...\n');
    
    db.all('SELECT id, nombre, apellido FROM empleados', [], (err, todosEmpleados) => {
        if (err) {
            console.error('Error:', err.message);
            db.close();
            return;
        }
        
        let eliminados = 0;
        
        nombresAEliminar.forEach(nombreBuscar => {
            const nombreNormalizado = normalizarNombre(nombreBuscar);
            
            const empleado = todosEmpleados.find(emp => {
                const empNombre = normalizarNombre(`${emp.nombre} ${emp.apellido}`);
                const partesBuscar = nombreNormalizado.split(' ');
                const partesEmp = empNombre.split(' ');
                
                // Si al menos 2 partes coinciden
                let coincidencias = 0;
                for (const parte of partesBuscar) {
                    if (partesEmp.some(p => p.includes(parte) || parte.includes(p))) {
                        coincidencias++;
                    }
                }
                
                return coincidencias >= 2;
            });
            
            if (empleado) {
                // Eliminar exámenes médicos primero
                db.run('DELETE FROM examenes_medicos WHERE empleado_id = ?', [empleado.id], () => {});
                
                // Eliminar empleado
                db.run('DELETE FROM empleados WHERE id = ?', [empleado.id], function(err) {
                    if (!err && this.changes > 0) {
                        eliminados++;
                        console.log(`✅ ${eliminados}. ${empleado.nombre} ${empleado.apellido} - Eliminado`);
                    }
                });
            }
        });
        
        setTimeout(() => {
            console.log(`\n✅ Proceso completado: ${eliminados} empleados eliminados`);
            db.close();
        }, 2000);
    });
}

