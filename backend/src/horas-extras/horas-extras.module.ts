import { Module } from '@nestjs/common';
import { HorasExtrasController } from './horas-extras.controller';
import { HorasExtrasService } from './horas-extras.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [HorasExtrasController],
  providers: [HorasExtrasService]
})
export class HorasExtrasModule {}
