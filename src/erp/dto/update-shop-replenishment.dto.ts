import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateShopReplenishmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(90)
  notifyBufferDays!: number;
}
