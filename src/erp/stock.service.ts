import { Injectable, NotFoundException } from '@nestjs/common';
import { normalizePagination, toPaginated } from '../common/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { WarehouseEntity } from '../inventory/entities/warehouse.entity';

const SHOP_INVENTORY_CODE = 'SHOP-STOCK';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(InventoryStockEntity)
    private readonly stockRepository: Repository<InventoryStockEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehousesRepository: Repository<WarehouseEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
  ) {}

  async listRows(shopId: string, page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const warehouses = await this.warehousesRepository.find({
      where: { shopId },
      select: { id: true },
    });
    const whIds = warehouses.map((w) => w.id);
    if (!whIds.length) {
      return toPaginated([], 0, p, l);
    }
    const rows = await this.stockRepository.find({
      where: { warehouseId: In(whIds) },
      relations: ['warehouse', 'product'],
    });
    const scoped = rows.filter((r) => r.warehouse?.shopId === shopId);
    const mapped = scoped.map((r) => ({
      id: r.id,
      productName: r.product?.name ?? '',
      warehouseName: r.warehouse?.name ?? '',
      quantityOnHand: r.quantityOnHand,
      reservedQuantity: r.reservedQuantity,
      available: r.quantityOnHand - r.reservedQuantity,
      reorderPoint: r.product?.reorderPoint ?? 0,
      status:
        r.quantityOnHand < (r.product?.reorderPoint ?? 0)
          ? 'Low Stock'
          : 'In Stock',
    }));
    const total = mapped.length;
    const items = mapped.slice(skip, skip + l);
    return toPaginated(items, total, p, l);
  }

  async ensureRow(
    shopId: string,
    warehouseId: number | undefined,
    productId: number,
  ): Promise<InventoryStockEntity> {
    let targetWarehouseId = warehouseId;
    if (targetWarehouseId === undefined) {
      const existingDefault = await this.warehousesRepository.findOne({
        where: { shopId, code: SHOP_INVENTORY_CODE },
        select: { id: true },
      });
      if (existingDefault) {
        targetWarehouseId = existingDefault.id;
      } else {
        const createdDefault = await this.warehousesRepository.save(
          this.warehousesRepository.create({
            shopId,
            code: SHOP_INVENTORY_CODE,
            name: 'Shop Inventory',
            address: null,
            managerName: null,
            contactPhone: null,
          }),
        );
        targetWarehouseId = createdDefault.id;
      }
    } else {
      await this.warehousesRepository.findOneOrFail({
        where: { id: targetWarehouseId, shopId },
      });
    }
    await this.productsRepository.findOneOrFail({
      where: { id: productId },
    });
    let row = await this.stockRepository.findOne({
      where: { warehouseId: targetWarehouseId, productId },
    });
    if (!row) {
      row = this.stockRepository.create({
        warehouseId: targetWarehouseId,
        productId,
        quantityOnHand: 0,
        reservedQuantity: 0,
      });
      row = await this.stockRepository.save(row);
    }
    return row;
  }

  async adjust(
    shopId: string,
    stockId: number,
    delta: number,
  ): Promise<InventoryStockEntity> {
    const row = await this.stockRepository.findOne({
      where: { id: stockId },
      relations: ['warehouse', 'product'],
    });
    if (!row || row.warehouse?.shopId !== shopId) {
      throw new NotFoundException();
    }
    row.quantityOnHand = Math.max(0, row.quantityOnHand + delta);
    return this.stockRepository.save(row);
  }
}
