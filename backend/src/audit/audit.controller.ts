import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener historial de un registro específico' })
  getLogs(
    @Query('tipo') tipo: string,
    @Query('id', ParseIntPipe) id: number,
  ) {
    return this.auditService.getLogs(tipo, id);
  }
}
