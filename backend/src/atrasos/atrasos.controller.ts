import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AtrasosService } from './atrasos.service';
import { CreateAtrasoDto } from './dto/create-atraso.dto';
import { UpdateAtrasoDto } from './dto/update-atraso.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAtrasoDto) {
    return this.atrasosService.update(req.user, +id, dto);
  }

  @Patch('bulk/:consolidadoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO')
  bulkUpdate(@Req() req: any, @Param('consolidadoId') consolidadoId: string, @Body() dto: UpdateAtrasoDto) {
    return this.atrasosService.bulkUpdate(req.user, +consolidadoId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'SECRETARIA', 'ADMIN_MAESTRO')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.atrasosService.remove(req.user, +id);
  }
}
