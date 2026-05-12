import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CentrosSaludModule } from './centros-salud/centros-salud.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProgramasModule } from './programas/programas.module';
import { FuncionariosModule } from './funcionarios/funcionarios.module';
import { PeriodosModule } from './periodos/periodos.module';
import { ConsolidadosModule } from './consolidados/consolidados.module';
import { HorasExtrasModule } from './horas-extras/horas-extras.module';
import { TurnosUrgenciaModule } from './turnos-urgencia/turnos-urgencia.module';
import { ViaticosModule } from './viaticos/viaticos.module';
import { AtrasosModule } from './atrasos/atrasos.module';
import { ProcedimientosModule } from './procedimientos/procedimientos.module';
import { AuditModule } from './audit/audit.module';
import { ReportesModule } from './reportes/reportes.module';
import { IngresosModule } from './ingresos/ingresos.module';
import { AuthModule } from './auth/auth.module';
import { RemuneracionesModule } from './remuneraciones/remuneraciones.module';
import { CalculosModule } from './calculos/calculos.module';
import { ContratosModule } from './contratos/contratos.module';
import { AusentismosModule } from './ausentismos/ausentismos.module';
import { AsignacionesEspecialesModule } from './asignaciones-especiales/asignaciones-especiales.module';
import { AlertasRrhhModule } from './alertas-rrhh/alertas-rrhh.module';
import { AuditService } from './audit.service';

@Module({
  imports: [
    AuthModule, 
    PrismaModule, 
    CentrosSaludModule, 
    UsuariosModule, 
    ProgramasModule, 
    FuncionariosModule, 
    PeriodosModule, 
    ConsolidadosModule, 
    HorasExtrasModule, 
    TurnosUrgenciaModule, 
    ViaticosModule, 
    AtrasosModule, 
    ProcedimientosModule, 
    AuditModule, 
    ReportesModule, 
    IngresosModule, 
    RemuneracionesModule, 
    CalculosModule, 
    ContratosModule, 
    AusentismosModule, 
    AsignacionesEspecialesModule, 
    AlertasRrhhModule
  ],
  controllers: [AppController],
  providers: [AppService, AuditService],
})
export class AppModule {}
