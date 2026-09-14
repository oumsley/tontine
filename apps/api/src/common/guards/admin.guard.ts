import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Minimal shared-secret gate for the back-office endpoints until a real
 * admin identity/authorization system is built.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const provided = request.headers["x-admin-key"];
    const expected = this.config.get("ADMIN_API_KEY");
    if (!expected || provided !== expected) {
      throw new UnauthorizedException("Invalid admin credentials");
    }
    return true;
  }
}
