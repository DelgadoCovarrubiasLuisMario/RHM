const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');

const empleadosFaltantes = [
    { nombre: 'JESUS', apellido: 'ONTIVEROS SUAREZ' },
    { nombre: 'JULIAN', apellido: 'MARTINEZ MAGAÑA' },
    { nombre: 'IRMA MARGARITA', apellido: 'MONTAÑO ARREOLA' },
    { nombre: 'SAMUEL', apellido: 'MEDINA GENORIMO' },
    { nombre: 'EDY LEONEL', apellido: 'CAMARRO GONZALEZ' },
    { nombre: 'CHRISTIAN EMMANUEL', apellido: 'CASTREJON GARCIA' },
    { nombre: 'JOSE EFREN', apellido: 'MARMOLEJO CERVANTES' },
    { nombre: 'RICARDO ALBERTO', apellido: 'MOTAÑO CRUZ' },
    { nombre: 'PABLO ZAID', apellido: 'RODRIGUEZ MUÑIZ' }
];

function normalizar(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } else {
        db.all('SELECT id, nombre, apellido FROM empleados WHERE activo = 1 ORDER BY nombre, apellido', [], (err, empleados) => {
            if (err) {
                console.error('❌ Error:', err.message);
                db.close();
                return;
            }
            
            console.log('🔍 Buscando empleados faltantes en la base de datos...\n');
            console.log('='.repeat(80));
            
            empleadosFaltantes.forEach(faltante => {
                console.log(`\n📋 Buscando: ${faltante.nombre} ${faltante.apellido}`);
                const nombreNorm = normalizar(`${faltante.nombre} ${faltante.apellido}`);
                
                const coincidencias = empleados.filter(emp => {
                    const empNorm = normalizar(`${emp.nombre} ${emp.apellido}`);
                    return empNorm.includes(nombreNorm) || nombreNorm.includes(empNorm) ||
                           nombreNorm.split(' ')[0] === empNorm.split(' ')[0];
                });
                
                if (coincidencias.length > 0) {
                    console.log('   ✅ Posibles coincidencias:');
                    coincidencias.forEach(coinc => {
                        console.log(`      - ${coinc.nombre} ${coinc.apellido} (ID: ${coinc.id})`);
                    });
                } else {
                    console.log('   ❌ No encontrado');
                }
            });
            
            console.log('\n' + '='.repeat(80));
            console.log('\n📊 Todos los empleados en la BD:');
            empleados.forEach(emp => {
                console.log(`   ${emp.nombre} ${emp.apellido}`);
            });
            
            db.close();
            process.exit(0);
        });
    }
});

