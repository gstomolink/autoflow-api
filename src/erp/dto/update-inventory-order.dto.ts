import { PartialType } from '@nestjs/swagger';
import { CreateInventoryOrderDto } from './create-inventory-order.dto';

export class UpdateInventoryOrderDto extends PartialType(CreateInventoryOrderDto) {}
