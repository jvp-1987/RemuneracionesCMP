import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtenemos los roles requeridos para la ruta desde el decorador @Roles
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // Si la ruta no tiene el decorador @Roles, permite el paso
    }
    
    // Obtenemos el usuario que fue decodificado del JWT
    const { user } = context.switchToHttp().getRequest();
    
    // Verificamos si el rol del usuario está dentro de los requeridos
    // Nota: Usamos rol_enum que es el campo real en nuestro modelo de Prisma
    const userRole = user?.rol_enum || user?.rol;
    
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException('No tienes permisos suficientes para realizar esta acción');
    }

    return true;
  }
}