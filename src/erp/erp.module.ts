import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { inventoryEntities } from '../inventory/entities';
import { UserEntity } from '../users/entities/user.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CustomerOrdersController } from './customer-orders.controller';
import { CustomerOrdersService } from './customer-orders.service';
import { InventoryOrdersController } from './inventory-orders.controller';
import { InventoryOrdersService } from './inventory-orders.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ReplenishmentCronService } from './replenishment-cron.service';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { SuggestionsController } from './suggestions.controller';
import { SuggestionsService } from './suggestions.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([...inventoryEntities, UserEntity]),
    AuthModule,
  ],
  controllers: [
    CategoriesController,
    ProductsController,
    WarehousesController,
    SuppliersController,
    StockController,
    InventoryOrdersController,
    SuggestionsController,
    CustomerOrdersController,
    ShopsController,
  ],
  providers: [
    CategoriesService,
    ProductsService,
    WarehousesService,
    SuppliersService,
    StockService,
    InventoryOrdersService,
    SuggestionsService,
    CustomerOrdersService,
    ShopsService,
    ReplenishmentCronService,
  ],
})
export class ErpModule {}
