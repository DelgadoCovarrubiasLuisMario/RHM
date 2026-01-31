const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
        process.exit(1);
    }
});

function formatearValor(valor) {
    if (valor === null || valor === undefined || valor === '' || valor === 0) {
        return '(falta)';
    }
    return valor;
}

function formatearFecha(fecha) {
    if (!fecha || fecha === null || fecha === '') {
        return '(falta)';
    }
    return fecha;
}

function formatearExamen(valor) {
    if (valor === null || valor === undefined) {
        return '(falta)';
    }
    return valor === 1 ? 'Sí' : 'No';
}

db.all(`
    SELECT 
        e.id,
        e.codigo,
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

    console.log('='.repeat(100));
    console.log('LISTA COMPLETA DE EMPLEADOS');
    console.log('='.repeat(100));
    console.log('');

    let areaActual = '';
    
    empleados.forEach((emp, index) => {
        // Mostrar separador por área
        if (emp.area !== areaActual) {
            if (areaActual !== '') {
                console.log('');
            }
            console.log('─'.repeat(100));
            console.log(`ÁREA: ${emp.area}`);
            console.log('─'.repeat(100));
            areaActual = emp.area;
        }

        console.log('');
        console.log(`${index + 1}. ${emp.nombre} ${emp.apellido}`);
        console.log(`   Código: ${emp.codigo}`);
        console.log(`   Área: ${emp.area}`);
        console.log(`   Cargo: ${formatearValor(emp.cargo)}`);
        console.log(`   Sueldo Base: $${emp.sueldo_base ? emp.sueldo_base.toFixed(2) : '(falta)'}`);
        console.log('');
        console.log('   EXÁMENES MÉDICOS:');
        console.log(`   - Química Sanguínea: ${formatearExamen(emp.quimica_sanguinea)}`);
        console.log(`   - Antidoping: ${formatearExamen(emp.antidoping)}`);
        console.log(`   - Electrocardiograma: ${formatearExamen(emp.electrocardiogram)}`);
        console.log(`   - Espirometrías: ${formatearExamen(emp.espirometrias)}`);
        console.log(`   - Audiometrías: ${formatearExamen(emp.audiometrias)}`);
        console.log('');
        console.log('   INFORMACIÓN ADICIONAL:');
        console.log(`   - Vigencia de: ${formatearFecha(emp.vigencia_de)}`);
        console.log(`   - Fecha de Nacimiento: ${formatearFecha(emp.fecha_nacimiento)}`);
        console.log(`   - Vence Inducción: ${formatearFecha(emp.vence_induccion)}`);
        console.log(`   - Mandar a Curso: ${formatearValor(emp.mandar_a_curso)}`);
        console.log('');
    });

    console.log('='.repeat(100));
    console.log(`Total de empleados: ${empleados.length}`);
    console.log('='.repeat(100));

    db.close();
});

