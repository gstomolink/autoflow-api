import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { CustomerOrderEntity, CustomerOrderLineEntity } from '../inventory/entities/customer-order.entity';
import { InventoryOrderEntity } from '../inventory/entities/inventory-order.entity';
import { ShopEntity } from '../inventory/entities/shop.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';
import { WarehouseEntity } from '../inventory/entities/warehouse.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerOrderEntity,
      CustomerOrderLineEntity,
      InventoryOrderEntity,
      ShopEntity,
      UserEntity,
      ProductEntity,
      InventoryStockEntity,
      WarehouseEntity,
    ]),
    AuthModule,
  ],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
