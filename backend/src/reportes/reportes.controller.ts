import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';

@ApiTags('Reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('hr-stats')
  getHRStats() {
    return this.reportesService.getHRStats();
  }

  @Get('financial-stats')
  getFinancialStats() {
    return this.reportesService.getFinancialStats();
  }

  @Get('centros-stats')
  getCentrosStats() {
    return this.reportesService.getCentrosStats();
  }
}
