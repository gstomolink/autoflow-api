import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { USER_ROLES } from '../constants/roles.constant';
import type { JwtPayload } from '../auth/jwt-payload';

export function resolveShopId(
  user: JwtPayload,
  queryShopId?: string,
): string {
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    const s = queryShopId?.trim();
    if (!s) {
      throw new BadRequestException('shopId is required');
    }
    return s;
  }
  if (!user.shopId) {
    throw new ForbiddenException();
  }
  return user.shopId;
}
