import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';
import { WarehouseEntity } from './warehouse.entity';

@Entity({ name: 'inventory_stock' })
@Index(['warehouseId', 'productId'], { unique: true })
export class InventoryStockEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'int', unsigned: true })
  warehouseId!: number;

  @ManyToOne(() => WarehouseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouseId' })
  warehouse!: WarehouseEntity;

  @Column({ type: 'int', unsigned: true })
  productId!: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product!: ProductEntity;

  @Column({ type: 'int', default: 0 })
  quantityOnHand!: number;

  @Column({ type: 'int', default: 0 })
  reservedQuantity!: number;
}
