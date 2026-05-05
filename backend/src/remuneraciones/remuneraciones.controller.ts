import { Controller, Post, Get, Body, Param, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RemuneracionesService } from './remuneraciones.service';

@ApiTags('Remuneraciones')
@Controller('remuneraciones')
export class RemuneracionesController {
  constructor(private readonly remuneracionesService: RemuneracionesService) {}

  @Post('importar-maestro-mensual')
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
