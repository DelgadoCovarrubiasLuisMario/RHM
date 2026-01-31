const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    }
});

db.all(`
    SELECT 
        e.nombre,
        e.apellido,
        COALESCE(e.sueldo_base, 0) as sueldo_base,
        e.area
    FROM empleados e
    WHERE e.activo = 1
    ORDER BY e.area, e.nombre, e.apellido
`, [], (err, empleados) => {
    if (err) {
        console.error('Error al obtener empleados:', err.message);
        db.close();
        process.exit(1);
    }

    console.log('LISTA DE EMPLEADOS - NOMBRE Y SUELDO');
    console.log('='.repeat(60));
    console.log('');

    let areaActual = '';
    
    empleados.forEach((emp, index) => {
        if (emp.area !== areaActual) {
            if (areaActual !== '') {
                console.log('');
            }
            console.log(`ÁREA: ${emp.area}`);
            console.log('-'.repeat(60));
            areaActual = emp.area;
        }

        const nombreCompleto = `${emp.nombre} ${emp.apellido}`.trim();
        let sueldo;
        if (emp.sueldo_base === null || emp.sueldo_base === undefined || emp.sueldo_base === 0 || emp.sueldo_base === 2000) {
            sueldo = '(falta)';
        } else {
            sueldo = `$${emp.sueldo_base.toFixed(2)}`;
        }
        
        console.log(`${nombreCompleto.padEnd(45)} ${sueldo}`);
    });

    console.log('');
    console.log('='.repeat(60));
    console.log(`Total de empleados: ${empleados.length}`);

    db.close();
});

