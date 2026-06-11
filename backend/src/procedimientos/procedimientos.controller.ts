import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProcedimientosService } from './procedimientos.service';
import { CreateProcedimientoDto } from './dto/create-procedimiento.dto';
import { UpdateProcedimientoDto } from './dto/update-procedimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Procedimientos')
@Controller('procedimientos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcedimientosController {
  constructor(private readonly procedimientosService: ProcedimientosService) {}

  @Post()
  create(@Body() dto: CreateProcedimientoDto) {
    return this.procedimientosService.create(dto);
  }

  @Get()
  findAll() {
    return this.procedimientosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.procedimientosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'ADMIN_MAESTRO', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'SECRETARIA')
  update(@Param('id') id: string, @Body() dto: UpdateProcedimientoDto, @Req() req: any) {
    return this.procedimientosService.update(+id, dto, req.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'ADMIN_MAESTRO', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'SECRETARIA')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.procedimientosService.remove(+id, req.user);
  }
}
