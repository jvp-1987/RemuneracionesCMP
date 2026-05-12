import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PeriodosService } from './periodos.service';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { UpdatePeriodoDto } from './dto/update-periodo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Periodos')
@Controller('periodos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeriodosController {
  constructor(private readonly periodosService: PeriodosService) {}

  @Post()
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  create(@Body() dto: CreatePeriodoDto) {
    return this.periodosService.create(dto);
  }

  @Get('status/detailed')
  getDetailedStatus() {
    return this.periodosService.getDetailedStatus();
  }

  @Post('seed/:year')
  @Roles('ADMIN', 'ADMIN_MAESTRO')
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
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  update(@Param('id') id: string, @Body() dto: UpdatePeriodoDto) {
    return this.periodosService.update(+id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  remove(@Param('id') id: string) {
    return this.periodosService.remove(+id);
  }
}
