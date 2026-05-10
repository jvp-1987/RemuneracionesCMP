import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ConsolidadosService } from './consolidados.service';
import { CreateConsolidadoDto } from './dto/create-consolidado.dto';
import { UpdateConsolidadoDto } from './dto/update-consolidado.dto';

@ApiTags('Consolidados')
@Controller('consolidados')
export class ConsolidadosController {
  constructor(private readonly consolidadosService: ConsolidadosService) {}

  @Post()
  create(@Body() dto: CreateConsolidadoDto) {
    return this.consolidadosService.create(dto);
  }

  @Get('dashboard')
  getDashboardKpis(@Query('periodoId') periodoId?: string) {
    return this.consolidadosService.getDashboardKpis(periodoId ? +periodoId : undefined);
  }

  @Get()
  findAll() {
    return this.consolidadosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consolidadosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConsolidadoDto) {
    return this.consolidadosService.update(+id, dto);
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
}
