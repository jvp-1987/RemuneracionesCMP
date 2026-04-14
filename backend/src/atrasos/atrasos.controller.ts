import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AtrasosService } from './atrasos.service';
import { CreateAtrasoDto } from './dto/create-atraso.dto';
import { UpdateAtrasoDto } from './dto/update-atraso.dto';

@ApiTags('Atrasos')
@Controller('atrasos')
export class AtrasosController {
  constructor(private readonly atrasosService: AtrasosService) {}

  @Post()
  create(@Body() dto: CreateAtrasoDto) {
    return this.atrasosService.create(dto);
  }

  @Get()
  findAll() {
    return this.atrasosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.atrasosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAtrasoDto) {
    return this.atrasosService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.atrasosService.remove(+id);
  }
}
