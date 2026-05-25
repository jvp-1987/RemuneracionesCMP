const detalle = { 'TIPO CONTRATO EN PERSONAL': 'INDEFINIDO' };
let contratoKey = Object.keys(detalle).find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL'));
console.log('Key:', contratoKey);
console.log('Value:', detalle[contratoKey]);

let val = '';
if (contratoKey && detalle[contratoKey]) val = String(detalle[contratoKey]).trim().toUpperCase();
console.log('Final:', val);
