import { Module } from '@nestjs/common';
import { RelojControlService } from './reloj-control.service';
import { RelojControlController } from './reloj-control.controller';

@Module({
  providers: [RelojControlService],
  controllers: [RelojControlController]
})
export class RelojControlModule {}
