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
import type { JwtPayload } from '../auth/jwt-payload';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveShopId } from '../common/shop-scope';
import { SuppliersService } from './suppliers.service';
import { ShopsService } from './shops.service';
import { CreateSupplierProductLinkDto } from './dto/create-supplier-product-link.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly shopsService: ShopsService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.suppliersService.findAll(
      parentShopId,
      search,
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async create(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Body() dto: CreateSupplierDto,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.suppliersService.create(parentShopId, dto);
  }

  @Patch(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.suppliersService.update(parentShopId, id, dto);
  }

  @Delete(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async remove(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.suppliersService.remove(parentShopId, id);
  }

  @Get(':id/products')
  listProducts(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.listProducts(id);
  }

  @Post(':id/products')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  addProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSupplierProductLinkDto,
  ) {
    return this.suppliersService.addProduct(id, dto);
  }
}
