import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../inventory/entities/product.entity';
import { SupplierProductEntity } from '../inventory/entities/supplier-product.entity';
import { SupplierEntity } from '../inventory/entities/supplier.entity';
import { CreateSupplierProductLinkDto } from './dto/create-supplier-product-link.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(SupplierProductEntity)
    private readonly supplierProductsRepository: Repository<SupplierProductEntity>,
  ) {}

  findAll(shopId?: string) {
    const where = shopId ? { shopId } : {};
    return this.suppliersRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateSupplierDto) {
    const row = this.suppliersRepository.create({
      name: dto.name.trim(),
      code: dto.code?.trim() ?? null,
      email: dto.email?.trim().toLowerCase() ?? null,
      phone: dto.phone?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      defaultLeadTimeDays: dto.defaultLeadTimeDays,
    });
    return this.suppliersRepository.save(row);
  }

  async update(id: number, dto: UpdateSupplierDto) {
    const row = await this.suppliersRepository.findOne({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException();
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code?.trim() ?? null;
    if (dto.email !== undefined) {
      row.email = dto.email?.trim().toLowerCase() ?? null;
    }
    if (dto.phone !== undefined) row.phone = dto.phone?.trim() ?? null;
    if (dto.address !== undefined) {
      row.address = dto.address?.trim() ?? null;
    }
    if (dto.defaultLeadTimeDays !== undefined) {
      row.defaultLeadTimeDays = dto.defaultLeadTimeDays;
    }
    return this.suppliersRepository.save(row);
  }

  async remove(id: number) {
    const row = await this.suppliersRepository.findOne({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException();
    }
    await this.suppliersRepository.remove(row);
  }

  async listProducts(id: number) {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('supplier not found');
    }
    const rows = await this.supplierProductsRepository.find({
      where: { supplierId: id },
      relations: ['product', 'product.category', 'product.primarySupplier'],
      order: { id: 'ASC' },
    });
    return rows.map((row) => ({
      linkId: row.id,
      productId: row.productId,
      sku: row.product?.sku ?? '',
      name: row.product?.name ?? '',
      categoryName: row.product?.category?.name ?? '',
      basePrice: row.product?.basePrice ?? '0',
      unitPrice: row.unitPrice,
      minOrderQty: row.minOrderQty,
      leadTimeDays: row.leadTimeDays,
      isPrimarySupplier: row.product?.primarySupplier?.id === id,
    }));
  }

  async addProduct(id: number, dto: CreateSupplierProductLinkDto) {
    const supplier = await this.suppliersRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('supplier not found');
    }
    const product = await this.productsRepository.findOne({
      where: { id: dto.productId },
      relations: ['primarySupplier'],
    });
    if (!product) {
      throw new NotFoundException('product not found');
    }
    const exists = await this.supplierProductsRepository.findOne({
      where: { supplierId: id, productId: dto.productId },
      select: { id: true },
    });
    if (exists) {
      return exists;
    }
    const link = this.supplierProductsRepository.create({
      supplierId: id,
      productId: dto.productId,
      unitPrice: dto.unitPrice ?? '0',
      minOrderQty: dto.minOrderQty ?? 1,
      leadTimeDays: dto.leadTimeDays ?? null,
    });
    const saved = await this.supplierProductsRepository.save(link);
    if (dto.setAsPrimary) {
      product.primarySupplier = supplier;
      await this.productsRepository.save(product);
    }
    return saved;
  }
}
