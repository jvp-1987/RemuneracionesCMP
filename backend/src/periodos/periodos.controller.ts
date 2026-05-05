import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PeriodosService } from './periodos.service';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { UpdatePeriodoDto } from './dto/update-periodo.dto';

@ApiTags('Periodos')
@Controller('periodos')
export class PeriodosController {
  constructor(private readonly periodosService: PeriodosService) {}

  @Post()
  create(@Body() dto: CreatePeriodoDto) {
    return this.periodosService.create(dto);
  }

  @Get('status/detailed')
  getDetailedStatus() {
    return this.periodosService.getDetailedStatus();
  }

  @Post('seed/:year')
  seedYear(@Param('year') year: string) {
    return this.periodosService.seedYear(+year);
  }

  @Get()
  findAll() {
    return this.periodosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.periodosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePeriodoDto) {
    return this.periodosService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.periodosService.remove(+id);
  }
}
