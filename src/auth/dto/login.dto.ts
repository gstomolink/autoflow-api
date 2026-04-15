import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @Length(3, 64)
  userId!: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @Length(5, 128)
  password!: string;

  @ApiPropertyOptional({
    description:
      'required for store users; keep empty for super admin login',
    example: 'shop-001',
  })
  @IsOptional()
  @IsString()
  @Length(2, 64)
  shopId?: string;
}
