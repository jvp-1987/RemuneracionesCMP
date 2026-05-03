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
    const { rut, password } = loginDto;
    
    const usuario = await this.prisma.usuario.findUnique({
      where: { rut },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Por ahora, si la contraseña es la default "123456", permitimos entrar
    // En una segunda fase, deberíamos usar bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password, usuario.password) || password === usuario.password;

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { 
      sub: usuario.id, 
      rut: usuario.rut, 
      nombre: usuario.nombre, 
      rol: usuario.rol_enum 
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rut: usuario.rut,
        rol: usuario.rol_enum,
      }
    };
  }

  async validateUser(payload: any) {
    return this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });
  }
}
