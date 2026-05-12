import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { HorasExtrasService } from './horas-extras.service';
import { CreateHorasExtrasDto } from './dto/create-horas-extras.dto';
import { UpdateHorasExtrasDto } from './dto/update-horas-extras.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateHorasExtrasDto) {
    return this.horasExtrasService.update(req.user, +id, dto);
  }

  @Patch('bulk/:consolidadoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  bulkUpdate(@Req() req: any, @Param('consolidadoId') consolidadoId: string, @Body() dto: UpdateHorasExtrasDto) {
    return this.horasExtrasService.bulkUpdate(req.user, +consolidadoId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.horasExtrasService.remove(+id);
  }
}
