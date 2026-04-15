import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  STORE_STAFF_TYPES,
  USER_ROLES,
} from '../../constants/roles.constant';
import type {
  StoreStaffTypeValue,
  UserRoleValue,
} from '../../constants/roles.constant';

@Entity({ name: 'users' })
@Index(['shopId', 'userId'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn({
    type: 'int',
    unsigned: true,
  })
  id!: number;

  @Column({ length: 120 })
  fullName!: string;

  @Column({ length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 180, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({
    type: 'tinyint',
    unsigned: true,
  })
  role!: UserRoleValue;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  shopId!: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  staffType!: StoreStaffTypeValue | null;

  @Column({
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  createdByStoreAdminId!: number | null;

  @ManyToOne(() => UserEntity, (user) => user.createdStaffMembers, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdByStoreAdminId' })
  createdByStoreAdmin!: UserEntity | null;

  @OneToMany(() => UserEntity, (user) => user.createdByStoreAdmin)
  createdStaffMembers!: UserEntity[];
}

export const roleCreationRules: Record<UserRoleValue, UserRoleValue[]> = {
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.STORE_ADMIN],
  [USER_ROLES.STORE_ADMIN]: [USER_ROLES.STORE_STAFF],
  [USER_ROLES.STORE_STAFF]: [],
};

export const validStoreStaffTypes = [
  STORE_STAFF_TYPES.CASHIER,
  STORE_STAFF_TYPES.INVENTORY_STAFF,
];
