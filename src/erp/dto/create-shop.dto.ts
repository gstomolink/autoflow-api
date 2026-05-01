import { IsOptional, IsString, Length } from 'class-validator';

export class CreateShopDto {
  @IsString()
  @Length(2, 64)
  shopId!: string;

  @IsString()
  @Length(1, 255)
  name!: string;

  @IsString()
  @Length(1, 512)
  address!: string;

  @IsOptional()
  @IsString()
  @Length(2, 64)
  parentShopId?: string;
}
