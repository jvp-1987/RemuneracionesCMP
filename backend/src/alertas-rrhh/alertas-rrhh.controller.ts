import { Controller, Get } from '@nestjs/common';
import { AlertasRrhhService } from './alertas-rrhh.service';

@Controller('alertas-rrhh')
export class AlertasRrhhController {
  constructor(private readonly alertasRrhhService: AlertasRrhhService) {}

  @Get()
  getAlertas() {
    return this.alertasRrhhService.getAlertas();
  }
}
