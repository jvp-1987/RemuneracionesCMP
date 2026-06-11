import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { IngresosService } from './ingresos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('ingresos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IngresosController {
  constructor(private readonly ingresosService: IngresosService) {}

  @Post('manual')
  @Roles('ADMIN', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  guardarIngresos(@Body() data: any, @Req() req: any) {
    return this.ingresosService.guardarIngresos(data, req.user);
  }
}
