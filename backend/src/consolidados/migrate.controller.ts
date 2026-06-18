import { Controller, Get, Query, ForbiddenException } from '@nestjs/common';
import { ConsolidadosService } from './consolidados.service';

@Controller('database-maintenance')
export class MigrateController {
  constructor(private readonly consolidadosService: ConsolidadosService) {}

  @Get('migrate-base64-to-r2')
  async migrate(@Query('secret') secret: string) {
    if (secret !== 'remuneraciones_cmp_secret_migration_2026') {
      throw new ForbiddenException('Código secreto incorrecto');
    }
    return this.consolidadosService.migrateBase64ToR2();
  }
}
