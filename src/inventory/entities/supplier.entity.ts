import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'suppliers' })
export class SupplierEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  shopId!: string | null;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address!: string | null;

  @Column({ type: 'int', unsigned: true, default: 7 })
  defaultLeadTimeDays!: number;
}
