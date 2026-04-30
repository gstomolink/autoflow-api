import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../inventory/entities/category.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { SupplierEntity } from '../inventory/entities/supplier.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
  ) {}

  async findAll(shopId?: string) {
    const where = shopId ? { shopId } : {};
    const rows = await this.productsRepository.find({
      where,
      relations: ['category', 'primarySupplier'],
      order: { name: 'ASC' },
    });
    return rows.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      imageUrl: p.imageUrl,
      basePrice: p.basePrice,
      categoryName: p.category?.name ?? '',
      supplierCode:
        p.primarySupplier?.code ?? p.primarySupplier?.name ?? '',
      primarySupplierId: p.primarySupplier?.id ?? null,
      reorderPoint: p.reorderPoint,
      safetyStock: p.safetyStock,
      avgDailySales: p.avgDailySales,
    }));
  }

  async create(shopId: string, dto: CreateProductDto) {
    const sku = dto.sku.trim();
    const exists = await this.productsRepository.findOne({
      where: { shopId, sku },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('sku already exists');
    }
    if (dto.categoryId) {
      const cat = await this.categoriesRepository.findOne({
        where: { id: dto.categoryId, shopId },
      });
      if (!cat) {
        throw new NotFoundException('category not found');
      }
    }
    if (dto.primarySupplierId) {
      const sup = await this.suppliersRepository.findOne({
        where: { id: dto.primarySupplierId, shopId },
      });
      if (!sup) {
        throw new NotFoundException('supplier not found');
      }
    }
    const row = this.productsRepository.create({
      shopId,
      sku,
      name: dto.name.trim(),
      categoryId: dto.categoryId ?? null,
      imageUrl: dto.imageUrl?.trim() ?? null,
      basePrice: dto.basePrice ?? '0',
      reorderPoint: dto.reorderPoint ?? 0,
      safetyStock: dto.safetyStock ?? 0,
      avgDailySales: dto.avgDailySales ?? '0',
    });
    if (dto.primarySupplierId) {
      row.primarySupplier = await this.suppliersRepository.findOneOrFail({
        where: { id: dto.primarySupplierId, shopId },
      });
    }
    return this.productsRepository.save(row);
  }

  async update(shopId: string, id: number, dto: UpdateProductDto) {
    const row = await this.productsRepository.findOne({
      where: { id, shopId },
      relations: ['primarySupplier'],
    });
    if (!row) {
      throw new NotFoundException();
    }
    if (dto.sku !== undefined) {
      const sku = dto.sku.trim();
      const clash = await this.productsRepository.findOne({
        where: { shopId, sku },
        select: { id: true },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException('sku already exists');
      }
      row.sku = sku;
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.imageUrl !== undefined) {
      row.imageUrl = dto.imageUrl?.trim() ?? null;
    }
    if (dto.basePrice !== undefined) row.basePrice = dto.basePrice;
    if (dto.reorderPoint !== undefined) row.reorderPoint = dto.reorderPoint;
    if (dto.safetyStock !== undefined) row.safetyStock = dto.safetyStock;
    if (dto.avgDailySales !== undefined) {
      row.avgDailySales = dto.avgDailySales;
    }
    if (dto.categoryId !== undefined) {
      if (dto.categoryId) {
        const cat = await this.categoriesRepository.findOne({
          where: { id: dto.categoryId, shopId },
        });
        if (!cat) {
          throw new NotFoundException('category not found');
        }
      }
      row.categoryId = dto.categoryId ?? null;
    }
    if (dto.primarySupplierId !== undefined) {
      if (dto.primarySupplierId) {
        const sup = await this.suppliersRepository.findOne({
          where: { id: dto.primarySupplierId, shopId },
        });
        if (!sup) {
          throw new NotFoundException('supplier not found');
        }
        row.primarySupplier = sup;
      } else {
        row.primarySupplier = null;
      }
    }
    return this.productsRepository.save(row);
  }

  async remove(shopId: string, id: number) {
    const row = await this.productsRepository.findOne({ where: { id, shopId } });
    if (!row) {
      throw new NotFoundException();
    }
    await this.productsRepository.remove(row);
  }
}
