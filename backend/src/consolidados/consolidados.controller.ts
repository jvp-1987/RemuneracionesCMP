import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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
  getDashboardKpis() {
    return this.consolidadosService.getDashboardKpis();
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
}
