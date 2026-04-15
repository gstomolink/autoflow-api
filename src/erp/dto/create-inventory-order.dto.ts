import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class InventoryOrderLineInputDto {
  @Type(() => Number)
  @IsInt()
  productId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityOrdered!: number;

  @IsString()
  unitCost!: string;
}

export class CreateInventoryOrderDto {
  @Type(() => Number)
  @IsInt()
  supplierId!: number;

  @IsOptional()
  @IsString()
  expectedDeliveryDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryOrderLineInputDto)
  lines!: InventoryOrderLineInputDto[];
}
