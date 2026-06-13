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
}
