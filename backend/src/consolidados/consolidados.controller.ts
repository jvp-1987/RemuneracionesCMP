import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, Req, UseInterceptors, UploadedFile, UseGuards, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ConsolidadosService } from './consolidados.service';
import { CreateConsolidadoDto } from './dto/create-consolidado.dto';
import { UpdateConsolidadoDto } from './dto/update-consolidado.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Consolidados')
@Controller('consolidados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsolidadosController {
  constructor(private readonly consolidadosService: ConsolidadosService) {}

  @Post()
  create(@Body() dto: CreateConsolidadoDto) {
    return this.consolidadosService.create(dto);
  }

  @Delete('clear/all/test-data')
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  clearTestData() {
    return this.consolidadosService.clearTestData();
  }

  @Get('dashboard')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CONTABILIDAD', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO', 'VALIDADOR_CONVENIOS')
  getDashboardKpis(@Req() req: any, @Query('periodoId') periodoId?: string, @Query('fuente') fuente?: string, @Query('centroId') centroId?: string) {
    return this.consolidadosService.getDashboardKpis(req.user, periodoId ? +periodoId : undefined, fuente, centroId ? +centroId : undefined);
  }

  @Get()
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CONTABILIDAD', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO', 'VALIDADOR_CONVENIOS')
  findAll(@Req() req: any, @Query('centroId') centroId?: string) {
    return this.consolidadosService.findAll(req.user, centroId ? +centroId : undefined);
  }

  @Get(':id/export')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CONTABILIDAD', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO', 'VALIDADOR_CONVENIOS')
  async exportExcel(@Param('id') id: string, @Req() req: any, @Res() res: any) {
    const buffer = await this.consolidadosService.exportExcel(+id, req.user);
    // Fetch info for filename
    const data = await this.consolidadosService.findOne(+id, req.user);
    const filename = `consolidado_${data.centro_salud.nombre.replace(/\s+/g, '_')}_${data.periodo.mes}_${data.periodo.anio}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CONTABILIDAD', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO', 'VALIDADOR_CONVENIOS')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.consolidadosService.findOne(+id, req.user);
  }


  @Patch(':id')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CONTABILIDAD', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO', 'VALIDADOR_CONVENIOS')
  update(@Param('id') id: string, @Body() dto: UpdateConsolidadoDto, @Request() req: any) {
    return this.consolidadosService.update(+id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consolidadosService.remove(+id);
  }
  
  @Post(':id/respaldo')
  @UseInterceptors(FileInterceptor('file'))
  uploadRespaldo(@Param('id') id: string, @UploadedFile() file: any, @Req() req: any) {
    return this.consolidadosService.uploadRespaldo(+id, file, req.user);
  }

  @Post(':id/respaldo/:type/:recordId')
  @UseInterceptors(FileInterceptor('file'))
  uploadRecordRespaldo(
    @Param('id') id: string,
    @Param('type') type: string,
    @Param('recordId') recordId: string,
    @UploadedFile() file: any,
    @Req() req: any
  ) {
    return this.consolidadosService.uploadRecordRespaldo(+id, type, +recordId, file, req.user);
  }

  @Post('respaldo/presigned-url')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CONTABILIDAD', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO', 'VALIDADOR_CONVENIOS')
  getPresignedUrl(@Body('key') key: string) {
    return this.consolidadosService.getPresignedUrl(key);
  }
}
