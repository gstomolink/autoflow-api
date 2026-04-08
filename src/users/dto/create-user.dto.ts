import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Store Admin A' })
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @ApiProperty({ example: 'admin@store.com' })
  @IsEmail()
  email!: string;

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

  @ApiPropertyOptional({ example: 'cashier', enum: ['cashier', 'inventory_staff'] })
  @IsOptional()
  @IsString()
  staffType?: string;

  @ApiPropertyOptional({
    description: 'required when creator is store admin and role is store staff',
    example: 'd89e6a9e-3075-4ec4-b7f9-7f7d05e3d0f4',
  })
  @IsOptional()
  @IsString()
  createdByStoreAdminId?: string;
}
