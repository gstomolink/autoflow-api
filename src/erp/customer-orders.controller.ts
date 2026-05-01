import {
  Body,
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
import { CustomerOrdersService } from './customer-orders.service';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';

@ApiTags('customer-orders')
@ApiBearerAuth()
@Controller('customer-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class CustomerOrdersController {
  constructor(private readonly customerOrdersService: CustomerOrdersService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customerOrdersService.list(
      resolveShopId(user, shopId),
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
    return this.customerOrdersService.findOne(
      resolveShopId(user, shopId),
      id,
    );
  }

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Body() dto: CreateCustomerOrderDto,
  ) {
    return this.customerOrdersService.create(
      resolveShopId(user, shopId),
      dto,
    );
  }
}
