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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierProductLinkDto } from './dto/create-supplier-product-link.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('suppliers')
@ApiBearerAuth()
@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(USER_ROLES.SUPER_ADMIN, USER_ROLES.STORE_ADMIN, USER_ROLES.STORE_STAFF)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.suppliersService.findAll(
      page !== undefined ? Number(page) : undefined,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.remove(id);
  }

  @Get(':id/products')
  listProducts(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.listProducts(id);
  }

  @Post(':id/products')
  addProduct(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSupplierProductLinkDto,
  ) {
    return this.suppliersService.addProduct(id, dto);
  }
}
