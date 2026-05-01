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
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehousesService.findAll(
      resolveShopId(user, shopId),
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Body() dto: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(resolveShopId(user, shopId), dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(
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
    return this.warehousesService.remove(resolveShopId(user, shopId), id);
  }
}
