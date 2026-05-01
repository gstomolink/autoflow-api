import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { SupplierEntity } from './supplier.entity';

@Entity({ name: 'products' })
@Index(['parentShopId', 'sku'], { unique: true })
export class ProductEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true, nullable: true })
  categoryId!: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parentShopId!: string | null;

  @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category!: CategoryEntity | null;

  @Column({ length: 64 })
  sku!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'longtext', nullable: true })
  imageUrl!: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  basePrice!: string;

  @ManyToOne(() => SupplierEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primarySupplierId' })
  primarySupplier!: SupplierEntity | null;

  @Column({ type: 'int', default: 0 })
  reorderPoint!: number;

  @Column({ type: 'int', default: 0 })
  safetyStock!: number;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 0 })
  avgDailySales!: string;
}
