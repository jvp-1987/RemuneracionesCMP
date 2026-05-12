import { SetMetadata } from '@nestjs/common';

// Decorador personalizado para asignar los roles requeridos a una ruta
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);