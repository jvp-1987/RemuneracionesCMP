import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContratosService } from './contratos.service';

@Controller('contratos')
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.contratosService.create(createDto);
  }

  @Get()
  findAll() {
    return this.contratosService.findAll();
  }

  @Get('funcionario/:rut')
  findByFuncionario(@Param('rut') rut: string) {
    return this.contratosService.findByFuncionario(rut);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.contratosService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contratosService.remove(+id);
  }
}
