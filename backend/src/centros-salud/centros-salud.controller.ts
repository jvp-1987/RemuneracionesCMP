import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CentrosSaludService } from './centros-salud.service';
import { CreateCentroSaludDto } from './dto/create-centro-salud.dto';
import { UpdateCentroSaludDto } from './dto/update-centro-salud.dto';

@ApiTags('Centros de Salud')
@Controller('centros-salud')
export class CentrosSaludController {
  constructor(private readonly centrosSaludService: CentrosSaludService) {}

  @Post()
  create(@Body() createCentroSaludDto: CreateCentroSaludDto) {
    return this.centrosSaludService.create(createCentroSaludDto);
  }

  @Get()
  findAll() {
    return this.centrosSaludService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.centrosSaludService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCentroSaludDto: UpdateCentroSaludDto) {
    return this.centrosSaludService.update(+id, updateCentroSaludDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.centrosSaludService.remove(+id);
  }
}
