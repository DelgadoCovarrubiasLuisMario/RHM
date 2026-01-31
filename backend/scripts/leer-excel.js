const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Buscar el archivo Excel
const files = fs.readdirSync(path.join(__dirname, '../..')).filter(f => f.endsWith('.xlsx') && f.includes('PERSONAL'));
const filePath = files.length > 0 
    ? path.join(__dirname, '../../' + files[0])
    : null;

if (!filePath || !fs.existsSync(filePath)) {
    console.error('No se encontró el archivo Excel');
    process.exit(1);
}

try {
    console.log('Leyendo archivo:', filePath);
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log('\n===========================================');
    console.log('HOJAS ENCONTRADAS:', sheetNames.join(', '));
    console.log('===========================================\n');
    
    sheetNames.forEach((name, index) => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`HOJA ${index + 1}: ${name}`);
        console.log('='.repeat(50));
        
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ''});
        
        console.log(`Total de filas: ${data.length}`);
        
        if (data.length > 0) {
            console.log('\nPrimeras 20 filas:');
            console.log('-'.repeat(80));
            
            data.slice(0, 20).forEach((row, i) => {
                const rowStr = Array.isArray(row) 
                    ? row.map(cell => String(cell || '')).join(' | ')
                    : JSON.stringify(row);
                console.log(`Fila ${i + 1}: ${rowStr}`);
            });
            
            if (data.length > 20) {
                console.log(`\n... (${data.length - 20} filas más)`);
            }
        }
    });
    
} catch (error) {
    console.error('Error al leer el archivo:', error.message);
    process.exit(1);
}
