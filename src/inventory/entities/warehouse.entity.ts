import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'warehouses' })
@Index(['shopId', 'code'], { unique: true })
export class WarehouseEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 64 })
  shopId!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  managerName!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contactPhone!: string | null;
}
