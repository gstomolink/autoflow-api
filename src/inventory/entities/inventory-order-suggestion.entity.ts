import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';
import { SupplierEntity } from './supplier.entity';

export type InventorySuggestionUrgencyStatus =
  | 'on_track'
  | 'next_week'
  | 'urgent'
  | 'order_passed';

@Entity({ name: 'inventory_order_suggestions' })
export class InventoryOrderSuggestionEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  shopId!: string;

  @Column({ type: 'int', unsigned: true })
  productId!: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: ProductEntity;

  @Column({ type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => SupplierEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: SupplierEntity;

  @Column({ type: 'int' })
  suggestedQty!: number;

  @Column({ type: 'int' })
  stockAtCalc!: number;

  @Column({ type: 'int' })
  reorderPoint!: number;

  @Column({ type: 'int' })
  forecastQty!: number;

  @Column({ type: 'date' })
  periodStart!: Date;

  @Column({ type: 'date' })
  periodEnd!: Date;

  @Column({ type: 'varchar', length: 24 })
  status!: string;

  @Column({ type: 'datetime' })
  computedAt!: Date;

  @Column({ type: 'int', unsigned: true, nullable: true })
  leadTimeDays!: number | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  notifyBufferDays!: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  daysCover!: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  dailyUsageRate!: string | null;

  @Column({ type: 'int', unsigned: true, nullable: true })
  maxOrderToDeliveryDays!: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 4, nullable: true })
  daysUntilStockout!: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  urgencyStatus!: InventorySuggestionUrgencyStatus | null;

  @Column({ type: 'date', nullable: true })
  recommendedOrderDate!: Date | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  aiConfidence!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  aiReason!: string | null;
}
