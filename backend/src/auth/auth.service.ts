import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const rut = loginDto.rut.trim();
    const password = loginDto.password.trim();
    
    const usuario = await this.prisma.usuario.findUnique({
      where: { rut },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(password, usuario.password);
    const isPlainValid = password === usuario.password;

    if (!isPasswordValid && !isPlainValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const payload = { 
      sub: usuario.id, 
      rut: usuario.rut, 
      nombre: usuario.nombre, 
      rol: usuario.rol_enum,
      centro_salud_id: usuario.centro_salud_id
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rut: usuario.rut,
        rol: usuario.rol_enum,
        centro_salud_id: usuario.centro_salud_id,
      }
    };
  }

  async validateUser(payload: any) {
    return this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });
  }

  async bootstrap() {
    const password = await bcrypt.hash('123456', 10);
    const rut = '16.853.223-7';

    const admin = await this.prisma.usuario.upsert({
      where: { rut },
      update: {
        password: password,
        rol_enum: 'ADMIN',
      },
      create: {
        rut: rut,
        nombre: 'Juan Vidal (Admin)',
        email: 'juan.vidal@cmpanguipulli.com',
        password: password,
        rol_enum: 'ADMIN',
      },
    });

    return { 
      message: '¡Perfil Maestro sincronizado con éxito!', 
      usuario: admin.nombre,
      rut: admin.rut,
      instruccion: 'Ya puedes cerrar esta pestaña e iniciar sesión en la web principal.'
    };
  }
}
