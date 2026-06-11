import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TurnosUrgenciaService } from './turnos-urgencia.service';
import { CreateTurnoUrgenciaDto } from './dto/create-turno-urgencia.dto';
import { UpdateTurnoUrgenciaDto } from './dto/update-turno-urgencia.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Turnos Urgencia')
@Controller('turnos-urgencia')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles('ADMIN', 'ADMIN_MAESTRO', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'SECRETARIA')
  update(@Param('id') id: string, @Body() dto: UpdateTurnoUrgenciaDto, @Req() req: any) {
    return this.turnosUrgenciaService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'ADMIN_MAESTRO', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'SECRETARIA')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.turnosUrgenciaService.remove(+id, req.user);
  }
}
