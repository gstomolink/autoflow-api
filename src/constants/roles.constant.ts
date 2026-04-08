export const USER_ROLES = {
  SUPER_ADMIN: 1,
  STORE_ADMIN: 2,
  STORE_STAFF: 3,
} as const;

export const STORE_STAFF_TYPES = {
  CASHIER: 'cashier',
  INVENTORY_STAFF: 'inventory_staff',
} as const;

export type UserRoleValue = (typeof USER_ROLES)[keyof typeof USER_ROLES];
export type StoreStaffTypeValue =
  (typeof STORE_STAFF_TYPES)[keyof typeof STORE_STAFF_TYPES];
