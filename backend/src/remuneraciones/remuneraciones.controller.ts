import { Controller, Post, Get, Body, Param, Query, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RemuneracionesService } from './remuneraciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Remuneraciones')
@Controller('remuneraciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemuneracionesController {
  constructor(private readonly remuneracionesService: RemuneracionesService) {}

  @Post('importar-maestro-mensual')
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        periodoId: { type: 'number' }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importarMaestroMensual(
    @UploadedFile() file: Express.Multer.File,
    @Body('periodoId') periodoId: number,
    @Query('dryRun') dryRun?: string
  ) {
    if (!file) throw new BadRequestException('Archivo no detectado');
    if (!periodoId) throw new BadRequestException('ID de periodo es requerido');
    const isDryRun = dryRun === 'true';
    return this.remuneracionesService.importarMaestroMensual(file.buffer, periodoId, isDryRun);
  }

  @Post('importar-validacion')
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        periodoId: { type: 'number' }
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importarValidacion(
    @UploadedFile() file: Express.Multer.File,
    @Body('periodoId') periodoId: number,
    @Query('dryRun') dryRun?: string
  ) {
    if (!file) throw new BadRequestException('Archivo no detectado');
    if (!periodoId) throw new BadRequestException('ID de periodo es requerido');
    const isDryRun = dryRun === 'true';
    return this.remuneracionesService.importarValidacion(file.buffer, periodoId, isDryRun);
  }

  @Get('historial/:rut')
  getHistorial(@Param('rut') rut: string) {
    return this.remuneracionesService.getHistorial(rut);
  }

  @Get('detalle/:rut/:periodoId')
  getDetalle(@Param('rut') rut: string, @Param('periodoId') periodoId: number) {
    return this.remuneracionesService.getLiquidacion(rut, periodoId);
  }
}
