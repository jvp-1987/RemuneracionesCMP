const fs = require('fs');
const content = fs.readFileSync('/Users/juanvidalp/Documents/GitHub/RemuneracionesCMP/frontend/src/app/funcionarios/[rut]/page.tsx', 'utf-8');
const index = content.indexOf('HeroField label="Tipo de Contrato"');
console.log(content.substring(index, index + 1000));
