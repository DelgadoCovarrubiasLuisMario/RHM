const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const BASE_DIR = path.join(__dirname, '../..');
const archivos = fs.readdirSync(BASE_DIR);
let excelPath = null;

for (const archivo of archivos) {
    if (archivo.endsWith('.xlsx') && archivo.includes('INFORMACION')) {
        excelPath = path.join(BASE_DIR, archivo);
        break;
    }
}

if (!excelPath) {
    console.log('No se encontró archivo');
    process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const worksheet = workbook.Sheets['PERSONAL RHM'];
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

console.log('Total filas:', rawData.length);
console.log('\nPrimeras 10 filas:');
rawData.slice(0, 10).forEach((row, i) => {
    console.log(`\nFila ${i}:`, row);
});

// Buscar fila con "NOMBRE Y APELLIDOS"
let headerRow = -1;
for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];
    const rowStr = row.join('|');
    if (rowStr.includes('NOMBRE Y APELLIDOS')) {
        headerRow = i;
        console.log(`\n✅ Fila de encabezados encontrada en fila ${i}:`);
        console.log(row);
        break;
    }
}

if (headerRow >= 0) {
    console.log(`\n\nDatos desde fila ${headerRow + 1}:`);
    rawData.slice(headerRow + 1, headerRow + 5).forEach((row, i) => {
        console.log(`\nFila ${headerRow + 1 + i}:`, row);
    });
}

