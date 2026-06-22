const XLSX = require('xlsx');
const path = require('path');
const file = path.join(__dirname, '../MAESTRO SALUD Marzo  2026.xlsx');
const workbook = XLSX.readFile(file);
const haberesSheet = workbook.Sheets['Haberes'] || workbook.Sheets['haberes'];
if (!haberesSheet) {
  console.log("No Haberes sheet found.");
} else {
  const data = XLSX.utils.sheet_to_json(haberesSheet);
  const targetRuts = ["10765330-4", "17227257-1", "18131174-1", "15266879-0", "17329089-9"];
  const normalizeRut = (rut) => {
    if (!rut) return null;
    let str = String(rut).trim().toUpperCase();
    str = str.replace(/\./g, '');
    str = str.replace(/^0+/, '');
    return str;
  };
  data.forEach((row, i) => {
    const rut = normalizeRut(row['RUT']);
    if (targetRuts.includes(rut)) {
      console.log(`Found RUT ${rut} in Excel row ${i}:`, {
        'SUELDO BASE': row['SUELDO BASE'],
        'HORAS EXTRAS 25%': row['HORAS EXTRAS 25%'],
        'HORAS EXTRAS 50%': row['HORAS EXTRAS 50%'],
        'CANT. H.E. 25%': row['CANT. H.E. 25%'],
        'CANT. H.E. 50%': row['CANT. H.E. 50%']
      });
    }
  });
}


