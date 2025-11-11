import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { UserRole } from "@/common/entities";

@Injectable()
export class OwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) {
      throw new ForbiddenException("User not found in request");
    }

    // Admin can access everything
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Get resource owner ID from different sources
    const resourceOwnerId = this.getResourceOwnerId(request);

    if (!resourceOwnerId) {
      throw new ForbiddenException("Cannot determine resource ownership");
    }

    // Check if user owns the resource
    if (user.id !== resourceOwnerId) {
      throw new ForbiddenException("You can only access your own resources");
    }

    return true;
  }

  private getResourceOwnerId(request: any): number | null {
    // Check if the resource has an ownerId field (for NFTs)
    if (request.nft?.ownerId) {
      return request.nft.ownerId;
    }

    // Check if we're accessing user resources via URL params
    if (request.params?.id && request.url.includes("/users/")) {
      return parseInt(request.params.id);
    }

    // For creating resources, the owner is the current user
    if (request.method === "POST") {
      return request.user.id;
    }

    return null;
  }
}
