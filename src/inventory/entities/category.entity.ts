import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'categories' })
export class CategoryEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  parentShopId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
