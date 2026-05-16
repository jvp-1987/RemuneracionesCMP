import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Param } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RelojControlService } from './reloj-control.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Reloj Control')
@Controller('reloj-control')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RelojControlController {
  constructor(
    private readonly relojControlService: RelojControlService,
    private readonly prisma: PrismaService
  ) {}

  @Post('proyectar-asistencia/:consolidadoId')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'ADMIN_MAESTRO', 'CENTRO_SALUD')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttendanceReport(
    @Param('consolidadoId') consolidadoId: string,
    @UploadedFile() file: any
  ) {
    if (!file) throw new BadRequestException('Archivo no detectado');
    const parsedData = await this.relojControlService.parseAttendanceReport(file.buffer);
    
    await this.prisma.consolidado.update({
      where: { id: parseInt(consolidadoId, 10) },
      data: { reloj_data: parsedData as any }
    });

    return parsedData;
  }
}
