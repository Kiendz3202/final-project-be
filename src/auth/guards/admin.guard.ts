import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { UserRole } from "@/common/entities";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException("User not found in request");
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}
