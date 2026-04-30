import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { USER_ROLES } from '../constants/roles.constant';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveShopId } from '../common/shop-scope';
import type { JwtPayload } from '../auth/jwt-payload';
import { SuggestionsService } from './suggestions.service';

@ApiTags('inventory-suggestions')
@ApiBearerAuth()
@Controller('inventory-suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('shopId') shopId?: string) {
    return this.suggestionsService.list(resolveShopId(user, shopId));
  }

  @Post('run-ai')
  runAi(@CurrentUser() user: JwtPayload, @Query('shopId') shopId?: string) {
    return this.suggestionsService.runAi(resolveShopId(user, shopId));
  }

  @Post('run-replenishment')
  runReplenishment(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId?: string,
  ) {
    return this.suggestionsService.runReplenishment(
      resolveShopId(user, shopId),
    );
  }

  @Post(':id/create-order')
  createOrder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId?: string,
  ) {
    return this.suggestionsService.createOrderFromSuggestion(
      resolveShopId(user, shopId),
      id,
    );
  }
}
