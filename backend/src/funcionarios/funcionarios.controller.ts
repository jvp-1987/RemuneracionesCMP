import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FuncionariosService } from './funcionarios.service';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';

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
  search(@Query('q') query: string) {
    if (!query || query.length < 2) return [];
    return this.funcionariosService.search(query);
  }

  @Get()
  findAll() {
    return this.funcionariosService.findAll();
  }

  @Get(':rut')
  findOne(@Param('rut') rut: string) {
    return this.funcionariosService.findOne(rut);
  }

  @Patch(':rut')
  update(@Param('rut') rut: string, @Body() updateFuncionarioDto: UpdateFuncionarioDto) {
    return this.funcionariosService.update(rut, updateFuncionarioDto);
  }

  @Delete(':rut')
  remove(@Param('rut') rut: string) {
    return this.funcionariosService.remove(rut);
  }
}
