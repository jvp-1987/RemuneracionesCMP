import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';

@ApiTags('Reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('stats')
  getGlobalStats() {
    return this.reportesService.getGlobalStats();
  }

  @Get('centros')
  getStatsByCentro() {
    return this.reportesService.getStatsByCentro();
  }
}
