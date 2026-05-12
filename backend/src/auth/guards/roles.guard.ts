import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    
    // Si no hay usuario o no tiene rol, denegar
    if (!user || !user.rol_enum) return false;

    // El ADMIN siempre tiene acceso a todo
    if (user.rol_enum === 'ADMIN' || user.rol_enum === 'ADMIN_MAESTRO') return true;

    return requiredRoles.includes(user.rol_enum);
  }
}
