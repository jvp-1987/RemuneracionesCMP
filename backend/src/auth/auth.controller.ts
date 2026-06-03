import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión y obtener token JWT' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión con Google OAuth' })
  googleLogin(@Body('credential') credential: string) {
    return this.authService.googleLogin(credential);
  }

  @Get('bootstrap')
  @ApiOperation({ summary: 'Crear el primer usuario administrador (solo si la tabla está vacía)' })
  bootstrap() {
    return this.authService.bootstrap();
  }
}
