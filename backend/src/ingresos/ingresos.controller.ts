import { Controller, Post, Body } from '@nestjs/common';
import { IngresosService } from './ingresos.service';

@Controller('ingresos')
export class IngresosController {
  constructor(private readonly ingresosService: IngresosService) {}

  @Post('manual')
  guardarIngresos(@Body() data: any) {
    return this.ingresosService.guardarIngresos(data);
  }
}
