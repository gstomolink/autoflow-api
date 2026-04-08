import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ example: 2 })
  role!: number;

  @ApiPropertyOptional({ enum: ['cashier', 'inventory_staff'] })
  staffType!: string | null;

  @ApiPropertyOptional()
  createdByStoreAdminId!: string | null;
}
