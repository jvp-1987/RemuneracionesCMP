import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AsignacionesEspecialesService } from './asignaciones-especiales.service';

@Controller('asignaciones-especiales')
export class AsignacionesEspecialesController {
  constructor(private readonly asignacionesEspecialesService: AsignacionesEspecialesService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.asignacionesEspecialesService.create(createDto);
  }

  @Get()
  findAll() {
    return this.asignacionesEspecialesService.findAll();
  }

  @Get('funcionario/:rut')
  findByFuncionario(@Param('rut') rut: string) {
    return this.asignacionesEspecialesService.findByFuncionario(rut);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.asignacionesEspecialesService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.asignacionesEspecialesService.remove(+id);
  }
}
