import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';
import { SupplierEntity } from './supplier.entity';

@Entity({ name: 'supplier_products' })
@Index(['supplierId', 'productId'], { unique: true })
export class SupplierProductEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => SupplierEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: SupplierEntity;

  @Column({ type: 'int', unsigned: true })
  productId!: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: ProductEntity;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  unitPrice!: string;

  @Column({ type: 'int', unsigned: true, default: 1 })
  minOrderQty!: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  leadTimeDays!: number | null;
}
