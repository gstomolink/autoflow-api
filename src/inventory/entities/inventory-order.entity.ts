import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';
import { SupplierEntity } from './supplier.entity';

export type InventoryOrderSource = 'manual' | 'automated';

export type InventoryOrderStatus =
  | 'draft'
  | 'submitted'
  | 'partially_received'
  | 'received'
  | 'cancelled';

@Entity({ name: 'inventory_orders' })
@Index(['shopId', 'orderNumber'], { unique: true })
export class InventoryOrderEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  shopId!: string;

  @Column({ type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => SupplierEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: SupplierEntity;

  @Column({ length: 32 })
  orderNumber!: string;

  @Column({ type: 'varchar', length: 24 })
  status!: InventoryOrderStatus;

  @Column({ type: 'varchar', length: 16 })
  source!: InventoryOrderSource;

  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => InventoryOrderLineEntity, (line) => line.order)
  lines!: InventoryOrderLineEntity[];
}

@Entity({ name: 'inventory_order_lines' })
export class InventoryOrderLineEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true })
  orderId!: number;

  @ManyToOne(() => InventoryOrderEntity, (order) => order.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'orderId' })
  order!: InventoryOrderEntity;

  @Column({ type: 'int', unsigned: true })
  productId!: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: ProductEntity;

  @Column({ type: 'int' })
  quantityOrdered!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  unitCost!: string;
}
