import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReportesService } from './reportes.service';

@ApiTags('Reportes')
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  private parsePeriodoIds(ids?: string): number[] | undefined {
    if (!ids) return undefined;
    return ids.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  }

  @Get('hr-stats')
  getHRStats(@Query('periodoIds') periodoIds?: string) {
    return this.reportesService.getHRStats(this.parsePeriodoIds(periodoIds));
  }

  @Get('financial-stats')
  getFinancialStats(@Query('periodoIds') periodoIds?: string) {
    return this.reportesService.getFinancialStats(this.parsePeriodoIds(periodoIds));
  }

  @Get('centros-stats')
  getCentrosStats(@Query('periodoIds') periodoIds?: string) {
    return this.reportesService.getCentrosStats(this.parsePeriodoIds(periodoIds));
  }

  @Get('haberes-stats')
  getHaberesStats(@Query('periodoIds') periodoIds?: string) {
    return this.reportesService.getHaberesStats(this.parsePeriodoIds(periodoIds));
  }
}
