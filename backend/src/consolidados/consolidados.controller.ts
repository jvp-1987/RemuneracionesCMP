import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Request, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { ConsolidadosService } from './consolidados.service';
import { CreateConsolidadoDto } from './dto/create-consolidado.dto';
import { UpdateConsolidadoDto } from './dto/update-consolidado.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Consolidados')
@Controller('consolidados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsolidadosController {
  constructor(private readonly consolidadosService: ConsolidadosService) {}

  @Post()
  create(@Body() dto: CreateConsolidadoDto) {
    return this.consolidadosService.create(dto);
  }

  @Get('dashboard')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS')
  getDashboardKpis(@Query('periodoId') periodoId?: string) {
    return this.consolidadosService.getDashboardKpis(periodoId ? +periodoId : undefined);
  }

  @Get()
  findAll() {
    return this.consolidadosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.consolidadosService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS')
  update(@Param('id') id: string, @Body() dto: UpdateConsolidadoDto, @Request() req: any) {
    return this.consolidadosService.update(+id, dto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.consolidadosService.remove(+id);
  }
  
  @Post(':id/respaldo')
  @UseInterceptors(FileInterceptor('file'))
  uploadRespaldo(@Param('id') id: string, @UploadedFile() file: any) {
    return this.consolidadosService.uploadRespaldo(+id, file);
  }
}
