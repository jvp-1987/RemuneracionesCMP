import { Module } from '@nestjs/common';
import { FuncionariosController } from './funcionarios.controller';
import { FuncionariosService } from './funcionarios.service';
import { CalculosModule } from '../calculos/calculos.module';

@Module({
  imports: [CalculosModule],
  controllers: [FuncionariosController],
  providers: [FuncionariosService]
})
export class FuncionariosModule {}
