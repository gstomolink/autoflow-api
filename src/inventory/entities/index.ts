import { CategoryEntity } from './category.entity';
import {
  CustomerOrderEntity,
  CustomerOrderLineEntity,
} from './customer-order.entity';
import { InventoryStockEntity } from './inventory-stock.entity';
import {
  InventoryOrderEntity,
  InventoryOrderLineEntity,
} from './inventory-order.entity';
import { InventoryOrderSuggestionEntity } from './inventory-order-suggestion.entity';
import { ProductEntity } from './product.entity';
import { SupplierProductEntity } from './supplier-product.entity';
import { SupplierEntity } from './supplier.entity';
import { ShopEntity } from './shop.entity';
import { WarehouseEntity } from './warehouse.entity';

export const inventoryEntities = [
  ShopEntity,
  CategoryEntity,
  ProductEntity,
  SupplierEntity,
  SupplierProductEntity,
  WarehouseEntity,
  InventoryStockEntity,
  InventoryOrderEntity,
  InventoryOrderLineEntity,
  InventoryOrderSuggestionEntity,
  CustomerOrderEntity,
  CustomerOrderLineEntity,
];

export {
  ShopEntity,
  CategoryEntity,
  ProductEntity,
  SupplierEntity,
  SupplierProductEntity,
  WarehouseEntity,
  InventoryStockEntity,
  InventoryOrderEntity,
  InventoryOrderLineEntity,
  InventoryOrderSuggestionEntity,
  CustomerOrderEntity,
  CustomerOrderLineEntity,
};
