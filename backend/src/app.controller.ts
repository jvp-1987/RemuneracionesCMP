import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug-routes')
  debug() {
    return { ok: true, timestamp: new Date().toISOString() };
  }

  @Get('fix-all-turnos-programs')
  async fixAllTurnosPrograms() {
    const turnos = await this.prisma.turnosUrgencia.findMany({
      include: { funcionario: { include: { centro_salud: true } } }
    });

    let updatedCount = 0;
    for (const t of turnos) {
      const centroNombre = t.funcionario?.centro_salud?.nombre?.toUpperCase() || '';
      let progName = 'PROGRAMA DE TURNO';
      
      if (centroNombre.includes('LIQUIÑE')) {
        progName = 'PROG. SUR LIQUIÑE';
      } else if (centroNombre.includes('CHOSHUENCO')) {
        progName = 'PROG. SUR CHOSHUENCO';
      } else if (centroNombre.includes('NELTUME')) {
        progName = 'PROG. SUR NELTUME';
      } else if (centroNombre.includes('COÑARIPE')) {
        progName = 'PROG. SUR COÑARIPE';
      } else if (centroNombre.includes('SAR') || centroNombre.includes('PANGUIPULLI')) {
        progName = 'TURNO SAR';
      }

      let programa = await this.prisma.programa.findFirst({
        where: { nombre: progName }
      });
      if (!programa) {
        programa = await this.prisma.programa.create({
          data: {
            nombre: progName,
            categoria_enum: 'PROGRAMAS_TURNO'
          }
        });
      }

      await this.prisma.turnosUrgencia.update({
        where: { id: t.id },
        data: { programa_id: programa.id }
      });
      updatedCount++;
    }

    return { success: true, message: `Se actualizaron ${updatedCount} turnos con sus programas correspondientes.` };
  }

  @Get('fix-all-horas-programs')
  async fixAllHorasPrograms() {
    const PROGRAMAS_HE_LIST = [
      "ATENCIÓN INTEGRAL AL DESARROLLO INFANTOADOLESCENTE (TEA)",
      "CONTINUIDAD DE CUIDADOS PREVENTIVOS Y DE TRATAMIENTOS EN APS",
      "ESPACIOS AMIGABLES PARA ADOLESCENTES",
      "ESB - AT. ODONTOLÓGICA DE MORBILIDAD",
      "ESB - AT. INTEGRAL",
      "ESB - AT. RESOLUTIVIDAD",
      "IMÁGENES DIAGNÓSTICAS EN ATENCIÓN PRIMARIA DE SALUD",
      "MODELO DE ATENCIÓN INTEGRAL DE SALUD FAMILIAR Y COMUNITARIA EN ATENCIÓN PRIMARIA (MAISF)",
      "REHABILITACIÓN INTEGRAL EN LA RED DE SALUD",
      "SALUD MENTAL Y BIENESTAR PSICOSOCIAL",
      "SALUD RESPIRATORIA - VACUNACIÓN",
      "SALUD RESPIRATORIA - CAMPAÑA INVIERNO",
      "SERVICIO DE ATENCIÓN PRIMARIA DE URGENCIA DE ALTA RESOLUTIVIDAD (SAR)",
      "PROGRAMA SUR"
    ];

    const horas = await this.prisma.horasExtras.findMany({
      where: { programa_id: 1 }
    });

    let updatedCount = 0;
    for (const h of horas) {
      let matchedProgramName = null;
      let cleanObs25 = h.observaciones_25;
      let cleanObs50 = h.observaciones_50;

      if (h.observaciones_25) {
        const obsTrim = h.observaciones_25.trim().toUpperCase();
        for (const prog of PROGRAMAS_HE_LIST) {
          if (obsTrim === prog.toUpperCase() || obsTrim.includes(prog.toUpperCase())) {
            matchedProgramName = prog;
            cleanObs25 = '';
            break;
          }
        }
      }

      if (!matchedProgramName && h.observaciones_50) {
        const obsTrim = h.observaciones_50.trim().toUpperCase();
        for (const prog of PROGRAMAS_HE_LIST) {
          if (obsTrim === prog.toUpperCase() || obsTrim.includes(prog.toUpperCase())) {
            matchedProgramName = prog;
            cleanObs50 = '';
            break;
          }
        }
      }

      if (matchedProgramName) {
        let programa = await this.prisma.programa.findFirst({
          where: { nombre: matchedProgramName }
        });
        if (!programa) {
          programa = await this.prisma.programa.create({
            data: {
              nombre: matchedProgramName,
              categoria_enum: 'Programas APS'
            }
          });
        }

        await this.prisma.horasExtras.update({
          where: { id: h.id },
          data: {
            programa_id: programa.id,
            observaciones_25: cleanObs25,
            observaciones_50: cleanObs50
          }
        });
        updatedCount++;
      }
    }

    return { success: true, message: `Se actualizaron ${updatedCount} horas extras moviéndolas a sus programas correspondientes.` };
  }
}
