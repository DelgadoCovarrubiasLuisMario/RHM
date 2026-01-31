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
        e.id,
        e.nombre,
        e.apellido,
        e.area,
        COALESCE(e.sueldo_base, 0) as sueldo_base,
        COALESCE(e.cargo, '') as cargo,
        em.quimica_sanguinea,
        em.antidoping,
        em.electrocardiogram,
        em.espirometrias,
        em.audiometrias,
        em.vigencia_de,
        em.fecha_nacimiento,
        em.vence_induccion,
        em.mandar_a_curso
    FROM empleados e
    LEFT JOIN examenes_medicos em ON e.id = em.empleado_id
    WHERE e.activo = 1
    ORDER BY e.area, e.nombre, e.apellido
`, [], (err, empleados) => {
    if (err) {
        console.error('Error al obtener empleados:', err.message);
        db.close();
        process.exit(1);
    }

    console.log('='.repeat(80));
    console.log('EMPLEADOS CON INFORMACIÓN FALTANTE');
    console.log('='.repeat(80));
    console.log('');

    const empleadosConFaltantes = [];

    empleados.forEach(emp => {
        const faltantes = [];
        
        // Verificar sueldo
        if (!emp.sueldo_base || emp.sueldo_base === 0 || emp.sueldo_base === 2000) {
            faltantes.push('Sueldo');
        }
        
        // Verificar cargo
        if (!emp.cargo || emp.cargo === '' || emp.cargo === 'Desconocido') {
            faltantes.push('Cargo');
        }
        
        // Verificar si tiene registro de exámenes médicos
        const tieneExamenes = emp.quimica_sanguinea !== null || 
                              emp.antidoping !== null || 
                              emp.electrocardiogram !== null || 
                              emp.espirometrias !== null || 
                              emp.audiometrias !== null;
        
        if (!tieneExamenes) {
            faltantes.push('Exámenes Médicos');
        } else {
            // Verificar exámenes individuales
            if (emp.quimica_sanguinea === null || emp.quimica_sanguinea === 0) {
                faltantes.push('Química Sanguínea');
            }
            if (emp.antidoping === null || emp.antidoping === 0) {
                faltantes.push('Antidoping');
            }
            if (emp.electrocardiogram === null || emp.electrocardiogram === 0) {
                faltantes.push('Electrocardiograma');
            }
            if (emp.espirometrias === null || emp.espirometrias === 0) {
                faltantes.push('Espirometrías');
            }
            if (emp.audiometrias === null || emp.audiometrias === 0) {
                faltantes.push('Audiometrías');
            }
        }
        
        // Verificar información adicional
        if (!emp.vigencia_de || emp.vigencia_de === '') {
            faltantes.push('Vigencia de');
        }
        if (!emp.fecha_nacimiento || emp.fecha_nacimiento === '') {
            faltantes.push('Fecha de Nacimiento');
        }
        if (!emp.vence_induccion || emp.vence_induccion === '') {
            faltantes.push('Vence Inducción');
        }
        if (!emp.mandar_a_curso || emp.mandar_a_curso === '') {
            faltantes.push('Mandar a Curso');
        }
        
        if (faltantes.length > 0) {
            empleadosConFaltantes.push({
                nombre: `${emp.nombre} ${emp.apellido}`.trim(),
                area: emp.area,
                faltantes: faltantes
            });
        }
    });

    if (empleadosConFaltantes.length === 0) {
        console.log('✅ Todos los empleados tienen información completa.');
        db.close();
        return;
    }

    let areaActual = '';
    
    empleadosConFaltantes.forEach((emp, index) => {
        if (emp.area !== areaActual) {
            if (areaActual !== '') {
                console.log('');
            }
            console.log(`ÁREA: ${emp.area}`);
            console.log('-'.repeat(80));
            areaActual = emp.area;
        }

        console.log('');
        console.log(`${index + 1}. ${emp.nombre}`);
        console.log(`   Información faltante:`);
        emp.faltantes.forEach(falta => {
            console.log(`   - ${falta}`);
        });
    });

    console.log('');
    console.log('='.repeat(80));
    console.log(`Total de empleados con información faltante: ${empleadosConFaltantes.length}`);
    console.log(`Total de empleados: ${empleados.length}`);
    console.log('='.repeat(80));

    db.close();
});

