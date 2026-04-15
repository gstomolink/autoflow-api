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

export type CustomerOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type CustomerPaymentStatus = 'pending' | 'paid' | 'refunded';

@Entity({ name: 'customer_orders' })
@Index(['shopId', 'orderNumber'], { unique: true })
export class CustomerOrderEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  shopId!: string;

  @Column({ length: 32 })
  orderNumber!: string;

  @Column({ length: 255 })
  customerName!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  customerPhone!: string | null;

  @Column({ type: 'varchar', length: 24 })
  status!: CustomerOrderStatus;

  @Column({ type: 'varchar', length: 24 })
  paymentStatus!: CustomerPaymentStatus;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  totalAmount!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => CustomerOrderLineEntity, (l) => l.order)
  lines!: CustomerOrderLineEntity[];
}

@Entity({ name: 'customer_order_lines' })
export class CustomerOrderLineEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true })
  orderId!: number;

  @ManyToOne(() => CustomerOrderEntity, (o) => o.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: CustomerOrderEntity;

  @Column({ type: 'int', unsigned: true })
  productId!: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: ProductEntity;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  unitPrice!: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  lineTotal!: string;
}
