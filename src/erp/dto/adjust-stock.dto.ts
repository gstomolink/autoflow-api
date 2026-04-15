import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class AdjustStockDto {
  @Type(() => Number)
  @IsInt()
  delta!: number;
}
