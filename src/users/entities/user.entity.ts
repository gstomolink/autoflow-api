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
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  fullName!: string;

  @Index({ unique: true })
  @Column({ length: 180 })
  email!: string;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({
    type: 'tinyint',
    unsigned: true,
  })
  role!: UserRoleValue;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
  })
  staffType!: StoreStaffTypeValue | null;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  createdByStoreAdminId!: string | null;

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
