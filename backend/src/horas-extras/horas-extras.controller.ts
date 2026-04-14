import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { HorasExtrasService } from './horas-extras.service';
import { CreateHorasExtrasDto } from './dto/create-horas-extras.dto';
import { UpdateHorasExtrasDto } from './dto/update-horas-extras.dto';

@ApiTags('Horas Extras')
@Controller('horas-extras')
export class HorasExtrasController {
  constructor(private readonly horasExtrasService: HorasExtrasService) {}

  @Post()
  create(@Body() dto: CreateHorasExtrasDto) {
    return this.horasExtrasService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'consolidado_id', required: false })
  findAll(@Query('consolidado_id') consolidadoId?: string) {
    if (consolidadoId) return this.horasExtrasService.findByConsolidado(+consolidadoId);
    return this.horasExtrasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.horasExtrasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHorasExtrasDto) {
    return this.horasExtrasService.update(+id, dto);
  }

  @Patch('bulk/:consolidadoId')
  bulkUpdate(@Param('consolidadoId') consolidadoId: string, @Body() dto: UpdateHorasExtrasDto) {
    return this.horasExtrasService.bulkUpdate(+consolidadoId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.horasExtrasService.remove(+id);
  }
}
