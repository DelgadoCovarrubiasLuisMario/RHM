const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error al conectar:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Base de datos conectada\n');
        generarListas();
    }
});

function generarListas() {
    // Obtener todos los empleados activos
    db.all(`
        SELECT 
            e.id,
            e.nombre,
            e.apellido,
            e.area,
            e.sueldo_base,
            e.cargo,
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
        ORDER BY e.nombre, e.apellido
    `, [], (err, empleados) => {
        if (err) {
            console.error('❌ Error al obtener empleados:', err.message);
            db.close();
            return;
        }
        
        const sinSueldo = [];
        const sinExamenes = [];
        const sinFechas = [];
        
        empleados.forEach(emp => {
            const nombreCompleto = `${emp.nombre} ${emp.apellido}`;
            const cargo = emp.cargo || 'Sin cargo';
            const area = emp.area;
            
            // 1. EMPLEADOS SIN SUELDO BASE DEFINIDO
            if (!emp.sueldo_base || emp.sueldo_base === 2000) {
                sinSueldo.push({
                    nombre: nombreCompleto,
                    cargo: cargo,
                    area: area,
                    sueldo_actual: emp.sueldo_base || 'No definido'
                });
            }
            
            // 2. EMPLEADOS CON EXÁMENES MÉDICOS PENDIENTES
            const examenesPend = [];
            if (emp.quimica_sanguinea !== 1) examenesPend.push('Química Sanguínea');
            if (emp.antidoping !== 1) examenesPend.push('Antidoping');
            if (emp.electrocardiogram !== 1) examenesPend.push('Electrocardiograma');
            if (emp.espirometrias !== 1) examenesPend.push('Espirometrías');
            if (emp.audiometrias !== 1) examenesPend.push('Audiometrías');
            
            if (examenesPend.length > 0) {
                sinExamenes.push({
                    nombre: nombreCompleto,
                    cargo: cargo,
                    area: area,
                    pendientes: examenesPend
                });
            }
            
            // 3. EMPLEADOS CON FECHAS PENDIENTES
            const fechasPend = [];
            if (!emp.vigencia_de) fechasPend.push('Vigencia de Estudios');
            if (!emp.fecha_nacimiento) fechasPend.push('Fecha de Nacimiento');
            if (!emp.vence_induccion) fechasPend.push('Vence Inducción');
            if (!emp.mandar_a_curso) fechasPend.push('Mandar a Curso');
            
            if (fechasPend.length > 0) {
                sinFechas.push({
                    nombre: nombreCompleto,
                    cargo: cargo,
                    area: area,
                    pendientes: fechasPend
                });
            }
        });
        
        // Mostrar listas
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📋 LISTAS DE INFORMACIÓN PENDIENTE');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        // LISTA 1: SUELDOS
        console.log('💰 EMPLEADOS SIN SUELDO BASE DEFINIDO');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(`Total: ${sinSueldo.length} empleados\n`);
        if (sinSueldo.length === 0) {
            console.log('✅ Todos los empleados tienen sueldo base definido\n');
        } else {
            sinSueldo.forEach((emp, index) => {
                console.log(`${index + 1}. ${emp.nombre}`);
                console.log(`   Cargo: ${emp.cargo} | Área: ${emp.area} | Sueldo actual: $${emp.sueldo_actual}\n`);
            });
        }
        
        // LISTA 2: EXÁMENES MÉDICOS
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🏥 EMPLEADOS CON EXÁMENES MÉDICOS PENDIENTES');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(`Total: ${sinExamenes.length} empleados\n`);
        if (sinExamenes.length === 0) {
            console.log('✅ Todos los empleados tienen exámenes médicos completos\n');
        } else {
            sinExamenes.forEach((emp, index) => {
                console.log(`${index + 1}. ${emp.nombre}`);
                console.log(`   Cargo: ${emp.cargo} | Área: ${emp.area}`);
                console.log(`   Exámenes pendientes: ${emp.pendientes.join(', ')}\n`);
            });
        }
        
        // LISTA 3: FECHAS
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📅 EMPLEADOS CON FECHAS PENDIENTES');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(`Total: ${sinFechas.length} empleados\n`);
        if (sinFechas.length === 0) {
            console.log('✅ Todos los empleados tienen fechas completas\n');
        } else {
            sinFechas.forEach((emp, index) => {
                console.log(`${index + 1}. ${emp.nombre}`);
                console.log(`   Cargo: ${emp.cargo} | Área: ${emp.area}`);
                console.log(`   Fechas pendientes: ${emp.pendientes.join(', ')}\n`);
            });
        }
        
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        // Generar texto plano para copiar
        const textoListas = `
═══════════════════════════════════════════════════════════════
💰 EMPLEADOS SIN SUELDO BASE DEFINIDO (${sinSueldo.length})
═══════════════════════════════════════════════════════════════

${sinSueldo.length === 0 ? '✅ Todos los empleados tienen sueldo base definido' : sinSueldo.map((emp, i) => `${i + 1}. ${emp.nombre} | ${emp.cargo} | ${emp.area} | Sueldo actual: $${emp.sueldo_actual}`).join('\n')}

═══════════════════════════════════════════════════════════════
🏥 EMPLEADOS CON EXÁMENES MÉDICOS PENDIENTES (${sinExamenes.length})
═══════════════════════════════════════════════════════════════

${sinExamenes.length === 0 ? '✅ Todos los empleados tienen exámenes médicos completos' : sinExamenes.map((emp, i) => `${i + 1}. ${emp.nombre} | ${emp.cargo} | ${emp.area}\n   Pendientes: ${emp.pendientes.join(', ')}`).join('\n\n')}

═══════════════════════════════════════════════════════════════
📅 EMPLEADOS CON FECHAS PENDIENTES (${sinFechas.length})
═══════════════════════════════════════════════════════════════

${sinFechas.length === 0 ? '✅ Todos los empleados tienen fechas completas' : sinFechas.map((emp, i) => `${i + 1}. ${emp.nombre} | ${emp.cargo} | ${emp.area}\n   Pendientes: ${emp.pendientes.join(', ')}`).join('\n\n')}
`;
        
        console.log('📄 LISTAS EN TEXTO PLANO:');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(textoListas);
        
        db.close();
        process.exit(0);
    });
}

