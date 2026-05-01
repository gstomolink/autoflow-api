import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import type { JwtPayload } from '../auth/jwt-payload';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopReplenishmentDto } from './dto/update-shop-replenishment.dto';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@ApiBearerAuth()
@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.shopsService.listForActor(
      user,
      search,
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateShopDto) {
    return this.shopsService.createForActor(user, dto);
  }

  @Patch(':shopId/replenishment')
  updateReplenishment(
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopReplenishmentDto,
  ) {
    return this.shopsService.updateReplenishmentBuffer(
      shopId,
      dto.notifyBufferDays,
    );
  }
}
