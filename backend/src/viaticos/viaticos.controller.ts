import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ViaticosService } from './viaticos.service';
import { CreateViaticoDto } from './dto/create-viatico.dto';
import { UpdateViaticoDto } from './dto/update-viatico.dto';

@ApiTags('Viáticos')
@Controller('viaticos')
export class ViaticosController {
  constructor(private readonly viaticosService: ViaticosService) {}

  @Post()
  create(@Body() dto: CreateViaticoDto) {
    return this.viaticosService.create(dto);
  }

  @Get()
  findAll() {
    return this.viaticosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.viaticosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateViaticoDto) {
    return this.viaticosService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.viaticosService.remove(+id);
  }
}
