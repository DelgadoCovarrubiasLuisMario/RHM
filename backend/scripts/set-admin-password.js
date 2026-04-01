const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/rhr.db');
const usuario = process.argv[2] || 'admin';
const nuevaPassword = process.argv[3];

if (!nuevaPassword) {
    console.error('Uso: node backend/scripts/set-admin-password.js <usuario> <nueva_password>');
    console.error('Ejemplo: node backend/scripts/set-admin-password.js admin RhmAdmin!2026#');
    process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error al abrir base de datos:', err.message);
        process.exit(1);
    }

    db.run(
        'UPDATE administradores SET password = ? WHERE usuario = ?',
        [nuevaPassword, usuario],
        function(updateErr) {
            if (updateErr) {
                console.error('Error al actualizar contraseña:', updateErr.message);
                db.close();
                process.exit(1);
            }
            if (this.changes === 0) {
                console.error(`No existe usuario admin '${usuario}'`);
                db.close();
                process.exit(1);
            }
            console.log(`Contraseña actualizada para '${usuario}'.`);
            db.close();
            process.exit(0);
        }
    );
});
