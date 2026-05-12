import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ViaticosService } from './viaticos.service';
import { CreateViaticoDto } from './dto/create-viatico.dto';
import { UpdateViaticoDto } from './dto/update-viatico.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateViaticoDto) {
    return this.viaticosService.update(req.user, +id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.viaticosService.remove(+id);
  }
}
