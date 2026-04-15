import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { WarehouseEntity } from '../inventory/entities/warehouse.entity';

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

  async listRows(shopId: string) {
    const warehouses = await this.warehousesRepository.find({
      where: { shopId },
      select: { id: true },
    });
    const whIds = warehouses.map((w) => w.id);
    if (!whIds.length) {
      return [];
    }
    const rows = await this.stockRepository.find({
      where: { warehouseId: In(whIds) },
      relations: ['warehouse', 'product'],
    });
    const scoped = rows.filter((r) => r.product?.shopId === shopId);
    return scoped.map((r) => ({
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
  }

  async ensureRow(
    shopId: string,
    warehouseId: number,
    productId: number,
  ): Promise<InventoryStockEntity> {
    await this.warehousesRepository.findOneOrFail({
      where: { id: warehouseId, shopId },
    });
    await this.productsRepository.findOneOrFail({
      where: { id: productId, shopId },
    });
    let row = await this.stockRepository.findOne({
      where: { warehouseId, productId },
    });
    if (!row) {
      row = this.stockRepository.create({
        warehouseId,
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
    if (
      !row ||
      row.warehouse?.shopId !== shopId ||
      row.product?.shopId !== shopId
    ) {
      throw new NotFoundException();
    }
    row.quantityOnHand = Math.max(0, row.quantityOnHand + delta);
    return this.stockRepository.save(row);
  }
}
