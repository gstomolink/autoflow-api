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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { USER_ROLES } from '../constants/roles.constant';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveShopId } from '../common/shop-scope';
import { ProductsService } from './products.service';
import { ShopsService } from './shops.service';
import { CreateProductSupplierDto } from './dto/create-product-supplier.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductSupplierDto } from './dto/update-product-supplier.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly shopsService: ShopsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List products (paginated)' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.productsService.findAll(
      parentShopId,
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async create(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Body() dto: CreateProductDto,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.productsService.create(parentShopId, dto);
  }

  @Patch(':id')
  @Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Query('shopId') shopId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    const resolvedShopId = resolveShopId(user, shopId);
    const parentShopId = await this.shopsService.resolveParentShopId(resolvedShopId);
    return this.productsService.update(parentShopId, id, dto);
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
    return this.productsService.remove(parentShopId, id);
  }

  @Get(':id/suppliers')
  @ApiOperation({ summary: 'List suppliers linked to a product' })
  listSuppliers(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.listProductSuppliers(id);
  }

  @Post(':id/suppliers')
  @ApiOperation({ summary: 'Link supplier to a product' })
  createSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductSupplierDto,
  ) {
    return this.productsService.createProductSupplier(id, dto);
  }

  @Patch(':id/suppliers/:linkId')
  @ApiOperation({ summary: 'Update supplier link for a product' })
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Param('linkId', ParseIntPipe) linkId: number,
    @Body() dto: UpdateProductSupplierDto,
  ) {
    return this.productsService.updateProductSupplier(id, linkId, dto);
  }

  @Delete(':id/suppliers/:linkId')
  @ApiOperation({ summary: 'Remove supplier link from product' })
  removeSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Param('linkId', ParseIntPipe) linkId: number,
  ) {
    return this.productsService.removeProductSupplier(id, linkId);
  }
}
