import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  InventoryOrderEntity,
  InventoryOrderLineEntity,
  type InventoryOrderSource,
  type InventoryOrderStatus,
} from '../inventory/entities/inventory-order.entity';
import { CustomerOrderLineEntity } from '../inventory/entities/customer-order.entity';
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
    @InjectRepository(InventoryOrderEntity)
    private readonly ordersRepository: Repository<InventoryOrderEntity>,
    @InjectRepository(CustomerOrderLineEntity)
    private readonly customerOrderLinesRepository: Repository<CustomerOrderLineEntity>,
  ) {}

  private formatYmd(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private async dedicatedForecastForProduct(
    shopId: string,
    productId: number,
    fallbackDailyUsage: number,
  ): Promise<{
    forecastQty30d: number;
    dailyUsage: number;
    confidence: number;
    reason: string;
  }> {
    const lookbackDays = 90;
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - lookbackDays);

    const rows = await this.customerOrderLinesRepository
      .createQueryBuilder('l')
      .innerJoin('l.order', 'o')
      .where('l.productId = :productId', { productId })
      .andWhere('o.shopId = :shopId', { shopId })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('o.createdAt >= :start', { start })
      .select('DATE(o.createdAt)', 'day')
      .addSelect('SUM(l.quantity)', 'qty')
      .groupBy('DATE(o.createdAt)')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; qty: string }>();

    const series: number[] = [];
    const byDay = new Map<string, number>();
    for (const row of rows) {
      byDay.set(row.day, Number(row.qty));
    }
    for (let i = lookbackDays - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = this.formatYmd(d);
      series.push(byDay.get(key) ?? 0);
    }

    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const avg = (values: number[]) =>
      values.length ? sum(values) / values.length : 0;

    const recent28 = series.slice(-28);
    const prev28 = series.slice(-56, -28);
    const baseRecentDaily = avg(recent28);
    const prevDaily = Math.max(avg(prev28), 0.0001);
    const trendRatio = (baseRecentDaily - prevDaily) / prevDaily;
    const clampedTrend = Math.max(-0.35, Math.min(0.5, trendRatio));

    const overallDaily = Math.max(
      avg(series),
      fallbackDailyUsage,
      MIN_DAILY_USAGE,
    );
    const seasonality = new Array<number>(7).fill(1);
    const weekdayBuckets: number[][] = [[], [], [], [], [], [], []];

    for (let i = 0; i < series.length; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      weekdayBuckets[d.getDay()].push(series[i]);
    }

    for (let i = 0; i < 7; i += 1) {
      const weekdayAvg = avg(weekdayBuckets[i]);
      if (weekdayAvg > 0) {
        seasonality[i] = Math.max(
          0.5,
          Math.min(1.8, weekdayAvg / overallDaily),
        );
      }
    }

    let forecastQty30d = 0;
    for (let i = 1; i <= 30; i += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      const seasonalFactor = seasonality[day.getDay()] ?? 1;
      const trendedBase = overallDaily * (1 + clampedTrend);
      forecastQty30d += Math.max(0, trendedBase * seasonalFactor);
    }

    const mean = overallDaily;
    const variance = avg(series.map((v) => (v - mean) * (v - mean)));
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 2;
    const daysWithData = series.filter((v) => v > 0).length;
    const coverageScore = Math.min(1, daysWithData / 45);
    const stabilityPenalty = Math.min(0.45, cv * 0.2);
    const confidence = Math.max(
      0.45,
      Math.min(0.95, 0.6 + coverageScore * 0.35 - stabilityPenalty),
    );

    return {
      forecastQty30d: Math.max(1, Math.round(forecastQty30d)),
      dailyUsage: Math.max(MIN_DAILY_USAGE, overallDaily),
      confidence,
      reason: `model: 90d trend+weekday seasonality, data days ${daysWithData}/90`,
    };
  }

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
      const baselineDailyUsage = Math.max(
        Number.isFinite(rawDaily) ? rawDaily : 0,
        MIN_DAILY_USAGE,
      );
      const model = await this.dedicatedForecastForProduct(
        shopId,
        p.id,
        baselineDailyUsage,
      );
      const dailyUsage = model.dailyUsage;
      const daysCover = stock / dailyUsage;

      let supplier: SupplierEntity | null = p.primarySupplier ?? null;
      let supplierLeadOverride: number | null = null;
      if (!supplier) {
        const link = await this.supplierProductsRepository.findOne({
          where: { productId: p.id },
          relations: ['supplier'],
        });
        supplier = link?.supplier ?? null;
        supplierLeadOverride = link?.leadTimeDays ?? null;
      } else {
        const link = await this.supplierProductsRepository.findOne({
          where: { productId: p.id, supplierId: supplier.id },
          select: { leadTimeDays: true },
        });
        supplierLeadOverride = link?.leadTimeDays ?? null;
      }
      if (!supplier || supplier.shopId !== shopId) {
        continue;
      }
      const leadTimeDays = supplierLeadOverride ?? supplier.defaultLeadTimeDays;
      const coverThreshold = leadTimeDays + notifyBufferDays;
      const belowReorder = stock < p.reorderPoint;
      const withinCoverWindow = daysCover <= coverThreshold;
      if (!belowReorder && !withinCoverWindow) {
        continue;
      }

      const reorder = p.reorderPoint;
      const forecastQty = model.forecastQty30d;
      const suggestedQty = Math.max(
        1,
        Math.max(p.safetyStock + reorder - stock, forecastQty - stock),
      );
      const daysUntilStockout = Math.max(0, daysCover);
      const slackDays = daysUntilStockout - leadTimeDays;
      const urgencyStatus =
        slackDays < 0
          ? 'order_passed'
          : slackDays <= 2
            ? 'urgent'
            : slackDays <= 7
              ? 'next_week'
              : 'on_track';
      const recommendedOrderDate = new Date();
      recommendedOrderDate.setDate(
        recommendedOrderDate.getDate() + Math.max(0, Math.floor(slackDays)),
      );
      const aiReason = `${model.reason}; stock covers ${daysUntilStockout.toFixed(1)} days, lead time ${leadTimeDays} days`;
      const finalSuggestedQty = suggestedQty;
      const finalForecastQty = forecastQty;
      const finalConfidence = model.confidence.toFixed(2);

      const row = this.suggestionsRepository.create({
        shopId,
        product: p,
        supplier,
        suggestedQty: finalSuggestedQty,
        stockAtCalc: stock,
        reorderPoint: reorder,
        forecastQty: finalForecastQty,
        periodStart,
        periodEnd,
        status: 'pending',
        computedAt: new Date(),
        leadTimeDays,
        notifyBufferDays,
        daysCover: daysCover.toFixed(4),
        dailyUsageRate: dailyUsage.toFixed(4),
        maxOrderToDeliveryDays: leadTimeDays,
        daysUntilStockout: daysUntilStockout.toFixed(4),
        urgencyStatus,
        recommendedOrderDate,
        aiConfidence: finalConfidence,
        aiReason,
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

  async createOrderFromSuggestion(shopId: string, suggestionId: number) {
    const suggestion = await this.suggestionsRepository.findOne({
      where: { id: suggestionId, shopId },
      relations: ['product', 'supplier'],
    });
    if (!suggestion) {
      throw new NotFoundException('suggestion not found');
    }

    const orderNumber = `IO-AUTO-${Date.now()}`;
    const expectedDeliveryDate = new Date();
    expectedDeliveryDate.setDate(
      expectedDeliveryDate.getDate() + (suggestion.maxOrderToDeliveryDays ?? 0),
    );

    const created = await this.ordersRepository.manager.transaction(
      async (manager) => {
        const orderRepository = manager.getRepository(InventoryOrderEntity);
        const lineRepository = manager.getRepository(InventoryOrderLineEntity);
        const suggestionsRepository = manager.getRepository(
          InventoryOrderSuggestionEntity,
        );

        const order = await orderRepository.save(
          orderRepository.create({
            shopId,
            supplierId: suggestion.supplierId,
            orderNumber,
            status: 'draft' as InventoryOrderStatus,
            source: 'automated' as InventoryOrderSource,
            expectedDeliveryDate,
          }),
        );

        await lineRepository.save(
          lineRepository.create({
            orderId: order.id,
            productId: suggestion.productId,
            quantityOrdered: suggestion.suggestedQty,
            unitCost: '0',
          }),
        );

        suggestion.status = 'converted';
        await suggestionsRepository.save(suggestion);

        return orderRepository.findOne({
          where: { id: order.id },
          relations: ['supplier', 'lines', 'lines.product'],
        });
      },
    );

    return created;
  }
}
