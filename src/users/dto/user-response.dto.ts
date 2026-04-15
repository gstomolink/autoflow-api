import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional()
  email!: string | null;

  @ApiPropertyOptional()
  phone!: string | null;

  @ApiProperty({ example: 2 })
  role!: number;

  @ApiPropertyOptional()
  shopId!: string | null;

  @ApiPropertyOptional({ enum: ['cashier', 'inventory_staff'] })
  staffType!: string | null;

  @ApiPropertyOptional()
  createdByStoreAdminId!: number | null;
}
