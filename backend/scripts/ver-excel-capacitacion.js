const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const BASE_DIR = path.join(__dirname, '../..');
const archivos = fs.readdirSync(BASE_DIR);
let excelPath = null;

for (const archivo of archivos) {
    if (archivo.endsWith('.xlsx') && 
        (archivo.includes('INFORMACION') || archivo.includes('PERSONAL') || archivo.includes('CURSOS'))) {
        excelPath = path.join(BASE_DIR, archivo);
        break;
    }
}

if (!excelPath) {
    console.log('No se encontró archivo Excel');
    process.exit(1);
}

console.log(`Leyendo: ${path.basename(excelPath)}\n`);

const workbook = XLSX.readFile(excelPath);
console.log('Hojas:', workbook.SheetNames);
console.log('');

workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`\nHoja: ${sheetName}`);
    console.log(`Registros: ${data.length}`);
    
    if (data.length > 0) {
        console.log('\nColumnas encontradas:');
        console.log(Object.keys(data[0]));
        
        console.log('\nPrimeros 3 registros:');
        data.slice(0, 3).forEach((row, i) => {
            console.log(`\n${i + 1}.`, row);
        });
    }
});

