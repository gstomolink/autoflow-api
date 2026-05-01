import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'shops' })
export class ShopEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  shopId!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parentShopId!: string | null;

  @Column({ type: 'int', unsigned: true, default: 1 })
  replenishmentNotifyBufferDays!: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
