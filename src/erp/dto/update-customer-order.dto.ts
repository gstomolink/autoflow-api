import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'paid', 'failed', 'refunded'])
  paymentStatus?: string;
}
