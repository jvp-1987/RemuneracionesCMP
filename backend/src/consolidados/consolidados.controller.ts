import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, Req, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
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

  @Get('dashboard')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  getDashboardKpis(@Req() req: any, @Query('periodoId') periodoId?: string, @Query('fuente') fuente?: string, @Query('centroId') centroId?: string) {
    return this.consolidadosService.getDashboardKpis(req.user, periodoId ? +periodoId : undefined, fuente, centroId ? +centroId : undefined);
  }

  @Get()
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  findAll(@Req() req: any, @Query('centroId') centroId?: string) {
    return this.consolidadosService.findAll(req.user, centroId ? +centroId : undefined);
  }

  @Get(':id')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.consolidadosService.findOne(+id, req.user);
  }

  @Patch(':id')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  update(@Param('id') id: string, @Body() dto: UpdateConsolidadoDto, @Request() req: any) {
    return this.consolidadosService.update(+id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consolidadosService.remove(+id);
  }
  
  @Post(':id/respaldo')
  @UseInterceptors(FileInterceptor('file'))
  uploadRespaldo(@Param('id') id: string, @UploadedFile() file: any) {
    return this.consolidadosService.uploadRespaldo(+id, file);
  }

  @Post(':id/respaldo/:type/:recordId')
  @UseInterceptors(FileInterceptor('file'))
  uploadRecordRespaldo(
    @Param('id') id: string,
    @Param('type') type: string,
    @Param('recordId') recordId: string,
    @UploadedFile() file: any
  ) {
    return this.consolidadosService.uploadRecordRespaldo(+id, type, +recordId, file);
  }
}
