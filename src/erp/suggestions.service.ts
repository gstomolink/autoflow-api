import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryOrderSuggestionEntity } from '../inventory/entities/inventory-order-suggestion.entity';
import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { ShopEntity } from '../inventory/entities/shop.entity';
import { SupplierEntity } from '../inventory/entities/supplier.entity';
import { SupplierProductEntity } from '../inventory/entities/supplier-product.entity';

const MIN_DAILY_USAGE = 0.0001;

@Injectable()
export class SuggestionsService {
  constructor(
    @InjectRepository(InventoryOrderSuggestionEntity)
    private readonly suggestionsRepository: Repository<InventoryOrderSuggestionEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(InventoryStockEntity)
    private readonly stockRepository: Repository<InventoryStockEntity>,
    @InjectRepository(SupplierProductEntity)
    private readonly supplierProductsRepository: Repository<SupplierProductEntity>,
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
    @InjectRepository(ShopEntity)
    private readonly shopsRepository: Repository<ShopEntity>,
  ) {}

  async list(shopId: string) {
    return this.suggestionsRepository.find({
      where: { shopId },
      relations: ['product', 'supplier'],
      order: { computedAt: 'DESC' },
    });
  }

  private async notifyBufferForShop(shopId: string): Promise<number> {
    const row = await this.shopsRepository.findOne({
      where: { shopId },
      select: { replenishmentNotifyBufferDays: true },
    });
    return row?.replenishmentNotifyBufferDays ?? 1;
  }

  
  async runReplenishment(shopId: string) {
    const notifyBufferDays = await this.notifyBufferForShop(shopId);
    const products = await this.productsRepository.find({
      where: { shopId },
      relations: ['primarySupplier'],
    });
    const productIds = products.map((p) => p.id);
    if (!productIds.length) {
      await this.suggestionsRepository.delete({ shopId });
      return [];
    }
    const stockRows = await this.stockRepository.find({
      where: { productId: In(productIds) },
      relations: ['product'],
    });
    const totals = new Map<number, number>();
    for (const p of products) {
      totals.set(p.id, 0);
    }
    for (const s of stockRows) {
      if (s.product?.shopId === shopId) {
        totals.set(
          s.productId,
          (totals.get(s.productId) ?? 0) + s.quantityOnHand,
        );
      }
    }
    await this.suggestionsRepository.delete({ shopId });
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 30);

    for (const p of products) {
      const stock = totals.get(p.id) ?? 0;
      const rawDaily = Number(p.avgDailySales);
      const dailyUsage = Math.max(
        Number.isFinite(rawDaily) ? rawDaily : 0,
        MIN_DAILY_USAGE,
      );
      const daysCover = stock / dailyUsage;

      let supplier: SupplierEntity | null = p.primarySupplier ?? null;
      if (!supplier) {
        const link = await this.supplierProductsRepository.findOne({
          where: { productId: p.id },
          relations: ['supplier'],
        });
        supplier = link?.supplier ?? null;
      }
      if (!supplier || supplier.shopId !== shopId) {
        continue;
      }
      const leadTimeDays = supplier.defaultLeadTimeDays;
      const coverThreshold = leadTimeDays + notifyBufferDays;
      const belowReorder = stock < p.reorderPoint;
      const withinCoverWindow = daysCover <= coverThreshold;
      if (!belowReorder && !withinCoverWindow) {
        continue;
      }

      const reorder = p.reorderPoint;
      const forecastQty = Math.ceil(dailyUsage * 30);
      const suggestedQty = Math.max(
        1,
        Math.max(
          p.safetyStock + reorder - stock,
          forecastQty - stock,
        ),
      );
      const row = this.suggestionsRepository.create({
        shopId,
        product: p,
        supplier,
        suggestedQty,
        stockAtCalc: stock,
        reorderPoint: reorder,
        forecastQty,
        periodStart,
        periodEnd,
        status: 'pending',
        computedAt: new Date(),
        leadTimeDays,
        notifyBufferDays,
        daysCover: daysCover.toFixed(4),
        dailyUsageRate: dailyUsage.toFixed(4),
      });
      await this.suggestionsRepository.save(row);
    }
    return this.suggestionsRepository.find({
      where: { shopId },
      relations: ['product', 'supplier'],
      order: { computedAt: 'DESC' },
    });
  }

  async runAi(shopId: string) {
    return this.runReplenishment(shopId);
  }
}
