import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TurnosUrgenciaService } from './turnos-urgencia.service';
import { CreateTurnoUrgenciaDto } from './dto/create-turno-urgencia.dto';
import { UpdateTurnoUrgenciaDto } from './dto/update-turno-urgencia.dto';

@ApiTags('Turnos Urgencia')
@Controller('turnos-urgencia')
export class TurnosUrgenciaController {
  constructor(private readonly turnosUrgenciaService: TurnosUrgenciaService) {}

  @Post()
  create(@Body() dto: CreateTurnoUrgenciaDto) {
    return this.turnosUrgenciaService.create(dto);
  }

  @Get()
  findAll() {
    return this.turnosUrgenciaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.turnosUrgenciaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTurnoUrgenciaDto) {
    return this.turnosUrgenciaService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.turnosUrgenciaService.remove(+id);
  }
}
