import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateProductSupplierDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId!: number;

  @IsOptional()
  @IsNumberString()
  unitPrice?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minOrderQty?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  setAsPrimary?: boolean;
}
