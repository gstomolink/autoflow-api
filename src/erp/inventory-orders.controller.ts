import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { resolveShopId } from '../common/shop-scope';
import type { JwtPayload } from '../auth/jwt-payload';
import { InventoryOrdersService } from './inventory-orders.service';
import { CreateInventoryOrderDto } from './dto/create-inventory-order.dto';
import { UpdateInventoryOrderDto } from './dto/update-inventory-order.dto';

@ApiTags('inventory-orders')
@ApiBearerAuth()
@Controller('inventory-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class InventoryOrdersController {
  constructor(private readonly inventoryOrdersService: InventoryOrdersService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Query('source') source?: 'manual' | 'automated',
    @Query('status') status?: string,
    @Query('month') month?: string,
    @Query('supplierId') supplierId?: string,
    @Query('productSearch') productSearch?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryOrdersService.list(
      resolveShopId(user, shopId),
      source,
      status,
      month,
      supplierId !== undefined ? Number(supplierId) : undefined,
      productSearch,
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inventoryOrdersService.findOne(
      resolveShopId(user, shopId),
      id,
    );
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Body() dto: CreateInventoryOrderDto,
  ) {
    return this.inventoryOrdersService.createManual(
      resolveShopId(user, shopId),
      dto,
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryOrderDto,
  ) {
    return this.inventoryOrdersService.updateManual(
      resolveShopId(user, shopId),
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.inventoryOrdersService.remove(
      resolveShopId(user, shopId),
      id,
    );
  }
}
