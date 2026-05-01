import {
  BadRequestException,
  Body,
  Controller,
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
import { StockService } from './stock.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('inventory-stock')
@ApiBearerAuth()
@Controller('inventory-stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stockService.listRows(
      resolveShopId(user, shopId),
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Patch(':id/adjust')
  adjust(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
  ) {
    return this.stockService.adjust(
      resolveShopId(user, shopId),
      id,
      dto.delta,
    );
  }

  @Post('ensure')
  ensure(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Query('warehouseId') warehouseId: string | undefined,
    @Query('productId', ParseIntPipe) productId: number,
  ) {
    const parsedWarehouseId =
      warehouseId && warehouseId.trim().length > 0
        ? Number(warehouseId)
        : undefined;
    if (parsedWarehouseId !== undefined && !Number.isInteger(parsedWarehouseId)) {
      throw new BadRequestException('warehouseId must be an integer');
    }
    return this.stockService.ensureRow(
      resolveShopId(user, shopId),
      parsedWarehouseId,
      productId,
    );
  }
}
