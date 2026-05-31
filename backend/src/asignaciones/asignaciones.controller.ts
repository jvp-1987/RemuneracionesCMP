import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('asignaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  // ================= CATÁLOGO =================
  @Get('catalogo')
  getCatalogo() {
    return this.asignacionesService.getCatalogo();
  }

  @Post('catalogo')
  createCatalogo(@Body() data: { nombre: string }) {
    return this.asignacionesService.createCatalogo(data);
  }

  @Put('catalogo/:id/toggle')
  toggleCatalogoEstado(@Param('id') id: string) {
    return this.asignacionesService.toggleCatalogoEstado(Number(id));
  }

  @Put('catalogo/:id')
  updateCatalogo(@Param('id') id: string, @Body() data: { nombre: string }) {
    return this.asignacionesService.updateCatalogo(Number(id), data);
  }

  @Delete('catalogo/:id')
  deleteCatalogo(@Param('id') id: string) {
    return this.asignacionesService.deleteCatalogo(Number(id));
  }

  // ================= ASIGNACIONES POR FUNCIONARIO =================
  @Get('funcionario/:rut')
  getAsignacionesFuncionario(@Param('rut') rut: string) {
    return this.asignacionesService.getAsignacionesFuncionario(rut);
  }

  @Post('funcionario/bulk')
  createAsignacionesEnMasa(@Body() data: any) {
    return this.asignacionesService.createAsignacionesEnMasa(data);
  }

  @Post('funcionario')
  createAsignacionFuncionario(@Body() data: any) {
    return this.asignacionesService.createAsignacionFuncionario(data);
  }

  @Put('funcionario/:id')
  updateAsignacionFuncionario(@Param('id') id: string, @Body() data: any) {
    return this.asignacionesService.updateAsignacionFuncionario(Number(id), data);
  }

  @Put('funcionario/:id/toggle')
  toggleAsignacionFuncionarioEstado(@Param('id') id: string) {
    return this.asignacionesService.toggleAsignacionFuncionarioEstado(Number(id));
  }

  // ================= TODAS LAS ASIGNACIONES =================
  @Get('todas')
  getAsignacionesTodas() {
    return this.asignacionesService.getAsignacionesTodas();
  }

  // ================= VERIFICACIÓN MENSUAL =================
  @Post('verificacion/generar/:periodoId')
  generarVerificacionMensual(@Param('periodoId') periodoId: string) {
    return this.asignacionesService.generarVerificacionMensual(Number(periodoId));
  }

  @Get('verificacion/:periodoId')
  getVerificacionMensual(@Param('periodoId') periodoId: string) {
    return this.asignacionesService.getVerificacionMensual(Number(periodoId));
  }

  @Put('verificacion/:id/estado')
  updateEstadoVerificacion(
    @Param('id') id: string,
    @Body() data: { estado_verificacion: string; observaciones?: string }
  ) {
    return this.asignacionesService.updateEstadoVerificacion(
      Number(id),
      data.estado_verificacion,
      data.observaciones
    );
  }
}
