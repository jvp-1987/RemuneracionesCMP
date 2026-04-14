import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProcedimientosService } from './procedimientos.service';
import { CreateProcedimientoDto } from './dto/create-procedimiento.dto';
import { UpdateProcedimientoDto } from './dto/update-procedimiento.dto';

@ApiTags('Procedimientos')
@Controller('procedimientos')
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
  update(@Param('id') id: string, @Body() dto: UpdateProcedimientoDto) {
    return this.procedimientosService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.procedimientosService.remove(+id);
  }
}
