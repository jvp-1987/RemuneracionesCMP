const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const liquidaciones = await prisma.liquidacionMensual.findMany({
    include: {
      funcionario: {
        include: {
          liquidaciones: {
            take: 6,
            orderBy: [{ periodo: { anio: 'desc' } }, { periodo: { mes: 'desc' } }],
            include: { periodo: true }
          }
        }
      }
    }
  });

  const distinctFuncionariosMap = new Map();
  liquidaciones.forEach(l => {
    if (!distinctFuncionariosMap.has(l.funcionario_rut)) {
      distinctFuncionariosMap.set(l.funcionario_rut, l.funcionario);
    }
  });

  const uniqueFuncionarios = Array.from(distinctFuncionariosMap.values());
  
  for (const f of uniqueFuncionarios) {
    let contratoKey;
    let matchedDetalle = {};

    if (f.liquidaciones) {
      for (const liq of f.liquidaciones) {
        const detalle = liq.detalle_json || {};
        
        contratoKey = Object.keys(detalle).find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL'));
        if (!contratoKey) {
          contratoKey = Object.keys(detalle).find(k => {
            const key = k.toUpperCase();
            return key.includes('TIPO DE CONTRATO') || key.includes('CALIDAD JURIDICA');
          });
        }
        if (!contratoKey) {
          contratoKey = Object.keys(detalle).find(k => {
            const key = k.toUpperCase();
            return key.includes('CONTRATO') && !key.includes('FECHA') && !key.includes('Nº') && !key.includes('N°');
          });
        }

        if (contratoKey) {
          matchedDetalle = detalle;
          break;
        }
      }
    }
    
    let tipo = 'Sin Contrato';
    if (contratoKey && matchedDetalle[contratoKey]) {
      tipo = String(matchedDetalle[contratoKey]).trim().toUpperCase();
    } else {
      const activeContrato = f.contratos && f.contratos.length > 0 ? f.contratos[0] : null;
      if (activeContrato) tipo = activeContrato.tipo_contrato;
    }

    if (tipo === 'CONTRATA') {
      console.log(`RUT: ${f.rut}, Nombre: ${f.nombre_completo}, Tipo: ${tipo}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
