import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // TODO: revert this change
    // Bypass auth checks until Verifier is ready.
    return true;

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    // console.dir(user, { depth: null })

    const hasuraCliams = JSON.parse(user['https://hasura.io/jwt/claims']);
    const userRole = hasuraCliams['x-hasura-default-role'];

    if (requiredRoles.includes(userRole)) {
      return true;
    }

    return false;
  }
}
