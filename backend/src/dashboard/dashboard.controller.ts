import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('proyecciones')
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'ADMIN_MAESTRO', 'CENTRO_SALUD')
  getProyecciones(@Query('anio') anio?: string) {
    const year = anio ? parseInt(anio, 10) : new Date().getFullYear();
    return this.dashboardService.getProyecciones(year);
  }
}
