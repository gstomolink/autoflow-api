import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizePagination, toPaginated } from '../common/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../inventory/entities/category.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { SupplierProductEntity } from '../inventory/entities/supplier-product.entity';
import { SupplierEntity } from '../inventory/entities/supplier.entity';
import { CreateProductSupplierDto } from './dto/create-product-supplier.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductSupplierDto } from './dto/update-product-supplier.dto';
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
    @InjectRepository(SupplierProductEntity)
    private readonly supplierProductsRepository: Repository<SupplierProductEntity>,
  ) {}

  async findAll(
    parentShopId: string,
    search?: string,
    category?: string,
    page?: number,
    limit?: number,
  ) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const qb = this.productsRepository
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.category', 'c')
      .leftJoinAndSelect('pr.primarySupplier', 'ps')
      .where('pr.parentShopId = :parentShopId', { parentShopId })
      .orderBy('pr.name', 'ASC')
      .skip(skip)
      .take(l);
    const q = search?.trim().toLowerCase();
    if (q) {
      qb.andWhere('(LOWER(pr.name) LIKE :q OR LOWER(pr.sku) LIKE :q)', {
        q: `%${q}%`,
      });
    }
    const categoryName = category?.trim().toLowerCase();
    if (categoryName) {
      qb.andWhere('LOWER(c.name) = :categoryName', { categoryName });
    }
    const [rows, total] = await qb.getManyAndCount();
    const items = rows.map((pr) => ({
      id: pr.id,
      sku: pr.sku,
      name: pr.name,
      imageUrl: pr.imageUrl,
      basePrice: pr.basePrice,
      categoryName: pr.category?.name ?? '',
      supplierCode:
        pr.primarySupplier?.code ?? pr.primarySupplier?.name ?? '',
      primarySupplierId: pr.primarySupplier?.id ?? null,
      reorderPoint: pr.reorderPoint,
      safetyStock: pr.safetyStock,
      avgDailySales: pr.avgDailySales,
    }));
    return toPaginated(items, total, p, l);
  }

  async create(parentShopId: string, dto: CreateProductDto) {
    const sku = dto.sku.trim();
    const exists = await this.productsRepository.findOne({
      where: { sku, parentShopId },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('sku already exists');
    }
    if (dto.categoryId) {
      const cat = await this.categoriesRepository.findOne({
        where: { id: dto.categoryId, parentShopId },
      });
      if (!cat) {
        throw new NotFoundException('category not found');
      }
    }
    if (dto.primarySupplierId) {
      const sup = await this.suppliersRepository.findOne({
        where: { id: dto.primarySupplierId, parentShopId },
      });
      if (!sup) {
        throw new NotFoundException('supplier not found');
      }
    }
    const row = this.productsRepository.create({
      parentShopId,
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
        where: { id: dto.primarySupplierId, parentShopId },
      });
    }
    return this.productsRepository.save(row);
  }

  async update(parentShopId: string, id: number, dto: UpdateProductDto) {
    const row = await this.productsRepository.findOne({
      where: { id, parentShopId },
      relations: ['primarySupplier'],
    });
    if (!row) {
      throw new NotFoundException();
    }
    if (dto.sku !== undefined) {
      const sku = dto.sku.trim();
      const clash = await this.productsRepository.findOne({
        where: { sku, parentShopId },
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
          where: { id: dto.categoryId, parentShopId },
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
          where: { id: dto.primarySupplierId, parentShopId },
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

  async remove(parentShopId: string, id: number) {
    const row = await this.productsRepository.findOne({ where: { id, parentShopId } });
    if (!row) {
      throw new NotFoundException();
    }
    await this.productsRepository.remove(row);
  }

  async listProductSuppliers(productId: number) {
    await this.productsRepository.findOneOrFail({ where: { id: productId } });
    const links = await this.supplierProductsRepository.find({
      where: { productId },
      relations: ['supplier'],
      order: { id: 'ASC' },
    });
    return links.map((row) => ({
      id: row.id,
      supplierId: row.supplierId,
      supplierName: row.supplier?.name ?? '',
      supplierCode: row.supplier?.code ?? null,
      unitPrice: row.unitPrice,
      minOrderQty: row.minOrderQty,
      leadTimeDays: row.leadTimeDays,
    }));
  }

  async createProductSupplier(
    productId: number,
    dto: CreateProductSupplierDto,
  ) {
    await this.productsRepository.findOneOrFail({ where: { id: productId } });
    const supplier = await this.suppliersRepository.findOne({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException('supplier not found');
    }
    const existing = await this.supplierProductsRepository.findOne({
      where: { productId, supplierId: dto.supplierId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('supplier already linked to product');
    }
    const created = this.supplierProductsRepository.create({
      productId,
      supplierId: dto.supplierId,
      unitPrice: dto.unitPrice ?? '0',
      minOrderQty: dto.minOrderQty ?? 1,
      leadTimeDays: dto.leadTimeDays ?? null,
    });
    const saved = await this.supplierProductsRepository.save(created);
    if (dto.setAsPrimary) {
      const product = await this.productsRepository.findOneOrFail({
        where: { id: productId },
      });
      product.primarySupplier = supplier;
      await this.productsRepository.save(product);
    }
    return saved;
  }

  async updateProductSupplier(
    productId: number,
    linkId: number,
    dto: UpdateProductSupplierDto,
  ) {
    const link = await this.supplierProductsRepository.findOne({
      where: { id: linkId, productId },
    });
    if (!link) {
      throw new NotFoundException('supplier link not found');
    }
    let supplier: SupplierEntity | null = null;
    if (dto.supplierId !== undefined && dto.supplierId !== link.supplierId) {
      supplier = await this.suppliersRepository.findOne({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException('supplier not found');
      }
      const clash = await this.supplierProductsRepository.findOne({
        where: { productId, supplierId: dto.supplierId },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException('supplier already linked to product');
      }
      link.supplierId = dto.supplierId;
    }
    if (dto.unitPrice !== undefined) {
      link.unitPrice = dto.unitPrice;
    }
    if (dto.minOrderQty !== undefined) {
      if (dto.minOrderQty < 1) {
        throw new BadRequestException('minOrderQty must be at least 1');
      }
      link.minOrderQty = dto.minOrderQty;
    }
    if (dto.leadTimeDays !== undefined) {
      link.leadTimeDays = dto.leadTimeDays;
    }
    const updated = await this.supplierProductsRepository.save(link);
    if (dto.setAsPrimary) {
      const primarySupplier =
        supplier ??
        (await this.suppliersRepository.findOne({
          where: { id: updated.supplierId },
        }));
      if (!primarySupplier) {
        throw new NotFoundException('supplier not found');
      }
      const product = await this.productsRepository.findOneOrFail({
        where: { id: productId },
      });
      product.primarySupplier = primarySupplier;
      await this.productsRepository.save(product);
    }
    return updated;
  }

  async removeProductSupplier(productId: number, linkId: number) {
    const link = await this.supplierProductsRepository.findOne({
      where: { id: linkId, productId },
    });
    if (!link) {
      throw new NotFoundException('supplier link not found');
    }
    await this.supplierProductsRepository.remove(link);
    const product = await this.productsRepository.findOne({
      where: { id: productId },
      relations: ['primarySupplier'],
    });
    if (product?.primarySupplier?.id === link.supplierId) {
      product.primarySupplier = null;
      await this.productsRepository.save(product);
    }
  }
}
