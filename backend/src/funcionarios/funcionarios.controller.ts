import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FuncionariosService } from './funcionarios.service';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Funcionarios')
@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly funcionariosService: FuncionariosService) {}

  @Post()
  create(@Body() createFuncionarioDto: CreateFuncionarioDto) {
    return this.funcionariosService.create(createFuncionarioDto);
  }

  @Post('importar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importarExcel(@UploadedFile() file: Express.Multer.File, @Query('dryRun') dryRun?: string) {
    if (!file) {
      throw new BadRequestException('Por favor adjunta un archivo Excel.');
    }
    const isDryRun = dryRun === 'true';
    return this.funcionariosService.importarExcel(file.buffer, isDryRun);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  search(@Req() req: any, @Query('q') query: string) {
    if (!query || query.length < 2) return [];
    return this.funcionariosService.search(req.user, query);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  findAll(@Req() req: any, @Query('centroId') centroId?: string) {
    return this.funcionariosService.findAll(req.user, centroId ? +centroId : undefined);
  }

  @Get(':rut')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CONTROL', 'FINANZAS', 'CENTRO_SALUD', 'ADMIN_MAESTRO')
  findOne(@Param('rut') rut: string, @Req() req: any) {
    return this.funcionariosService.findOne(rut, req.user);
  }

  @Patch(':rut')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  update(@Param('rut') rut: string, @Body() updateFuncionarioDto: UpdateFuncionarioDto) {
    return this.funcionariosService.update(rut, updateFuncionarioDto);
  }

  @Delete(':rut')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ADMIN_MAESTRO')
  remove(@Param('rut') rut: string) {
    return this.funcionariosService.remove(rut);
  }
}
