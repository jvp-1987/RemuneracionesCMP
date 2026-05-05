const xlsx = require('xlsx');
const path = require('path');

const filePath = '/Users/juanvidalp/Documents/REMUNERACIONES  2026/REMUNERACIONES MARZO 2026.xlsx';

try {
    const workbook = xlsx.readFile(filePath);
    console.log('--- ESTRUCTURA DE LA PLANILLA ---');
    console.log('Hojas detectadas:', workbook.SheetNames);
    console.log('\n');

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        // Obtener las primeras 5 filas para ver encabezados y datos
        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' }).slice(0, 8);
        
        console.log(`HOJA: [${sheetName}]`);
        data.forEach((row, idx) => {
            console.log(`  Fila ${idx}:`, JSON.stringify(row));
        });
        console.log('--------------------------------\n');
    });
} catch (err) {
    console.error('Error leyendo el archivo:', err.message);
}
