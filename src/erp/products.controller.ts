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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ProductsService } from './products.service';
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
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (paginated)' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
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
