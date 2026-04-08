import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Store Admin A' })
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @Length(3, 64)
  userId!: string;

  @ApiPropertyOptional({ example: 'admin@store.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({
    description: '1=super admin, 2=store admin, 3=store staff',
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  role!: number;

  @ApiPropertyOptional({
    description: 'required for store admin and store staff users',
    example: 'shop-001',
  })
  @IsOptional()
  @IsString()
  @Length(2, 64)
  shopId?: string;

  @ApiPropertyOptional({ example: 'cashier', enum: ['cashier', 'inventory_staff'] })
  @IsOptional()
  @IsString()
  staffType?: string;

  @ApiPropertyOptional({
    description: 'required when creator is store admin and role is store staff',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  createdByStoreAdminId?: number;
}
