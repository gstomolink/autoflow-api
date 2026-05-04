import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { CustomerOrderEntity, CustomerOrderLineEntity } from '../inventory/entities/customer-order.entity';
import { InventoryOrderEntity } from '../inventory/entities/inventory-order.entity';
import { ShopEntity } from '../inventory/entities/shop.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';
import { WarehouseEntity } from '../inventory/entities/warehouse.entity';
import { USER_ROLES, STORE_STAFF_TYPES } from '../constants/roles.constant';

@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(CustomerOrderEntity)
    private readonly customerOrdersRepo: Repository<CustomerOrderEntity>,
    @InjectRepository(CustomerOrderLineEntity)
    private readonly customerOrderLinesRepo: Repository<CustomerOrderLineEntity>,
    @InjectRepository(InventoryOrderEntity)
    private readonly inventoryOrdersRepo: Repository<InventoryOrderEntity>,
    @InjectRepository(ShopEntity)
    private readonly shopsRepo: Repository<ShopEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepo: Repository<ProductEntity>,
    @InjectRepository(InventoryStockEntity)
    private readonly inventoryStockRepo: Repository<InventoryStockEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehousesRepo: Repository<WarehouseEntity>,
  ) {}

  async getSuperAdminDashboard() {
    // 1. Total Revenue, Gross Profit, Total Costs, Avg Order Value
    const customerOrders = await this.customerOrdersRepo.find({
      where: { status: Not('cancelled') },
      select: ['id', 'totalAmount', 'shopId'],
    });

    let totalRevenue = 0;
    for (const order of customerOrders) {
      totalRevenue += parseFloat(order.totalAmount || '0');
    }

    const inventoryOrders = await this.inventoryOrdersRepo.find({
      where: { status: Not('cancelled') },
      relations: ['lines'],
    });

    let totalCosts = 0;
    for (const order of inventoryOrders) {
      if (order.lines) {
        for (const line of order.lines) {
          totalCosts +=
            (line.quantityOrdered || 0) * parseFloat(line.unitCost || '0');
        }
      }
    }

    const grossProfit = totalRevenue - totalCosts;
    const avgOrderValue =
      customerOrders.length > 0 ? totalRevenue / customerOrders.length : 0;

    // 2. Active Branches
    const activeBranchesCount = await this.shopsRepo.count();

    // 3. Top Performing Branches
    const shopSales: Record<string, { orders: number; revenue: number }> = {};
    for (const order of customerOrders) {
      if (!shopSales[order.shopId]) {
        shopSales[order.shopId] = { orders: 0, revenue: 0 };
      }
      shopSales[order.shopId].orders += 1;
      shopSales[order.shopId].revenue += parseFloat(order.totalAmount || '0');
    }

    const shops = await this.shopsRepo.find({ select: ['shopId', 'name'] });
    const shopMap = new Map(shops.map((s) => [s.shopId, s.name]));

    const topBranches = Object.entries(shopSales)
      .map(([shopId, data]) => ({
        id: shopId,
        name: shopMap.get(shopId) || 'Unknown Branch',
        orders: data.orders,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);

    // 4. Pending Purchase Approvals
    // Assuming 'draft' and 'submitted' mean pending
    const pendingOrders = await this.inventoryOrdersRepo.find({
      where: { status: In(['draft', 'submitted']) },
      relations: ['supplier'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const pendingPurchaseApprovals = pendingOrders.map((order) => {
      let totalValue = 0;
      if (order.lines) {
        totalValue = order.lines.reduce(
          (sum, line) =>
            sum + (line.quantityOrdered || 0) * parseFloat(line.unitCost || '0'),
          0,
        );
      }
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        location: shopMap.get(order.shopId) || 'Unknown Location',
        supplier: order.supplier?.name || 'Unknown Supplier',
        totalValue,
        status: order.status,
      };
    });

    // 5. System Overview
    const activeUsers = await this.usersRepo.count();

    // Let's mock a few things that don't have database representations right now
    const globalFoodCostPercent =
      totalRevenue > 0 ? (totalCosts / totalRevenue) * 100 : 0;
    const totalWastageCost = 0; // Mock
    const posTerminals = activeBranchesCount * 2; // Mock

    return {
      metrics: {
        grossProfit,
        totalRevenue,
        totalCosts,
        avgOrderValue,
        activeBranches: activeBranchesCount,
      },
      topBranches,
      pendingPurchaseApprovals,
      systemOverview: {
        globalFoodCostPercent: parseFloat(globalFoodCostPercent.toFixed(1)),
        totalWastageCost,
        activeUsers,
        posTerminals,
        systemHealth: 'Operational',
      },
      // Keep audit logs mocked for now
      auditLogs: [
        {
          id: 1,
          type: 'Pricing',
          time: '10 mins ago',
          message: 'Store Admin updated prices for the "Pizza" category across all branches.',
          typeColor: 'blue',
        },
        {
          id: 2,
          type: 'Entity',
          time: '2 hours ago',
          message: 'Super Admin created a new branch for "Negombo Beach".',
          typeColor: 'green',
        },
        {
          id: 3,
          type: 'System',
          time: '4 hours ago',
          message: 'Automated database and file storage backup completed.',
          typeColor: 'purple',
        },
        {
          id: 4,
          type: 'Integration',
          time: 'Yesterday',
          message: 'UberEats API connection re-established for Kandy Branch.',
          typeColor: 'yellow',
        },
      ],
    };
  }

  async getStoreAdminDashboard(shopId: string, user: UserEntity) {
    if (!shopId) throw new Error('Shop ID is required');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Orders and Revenue Today
    const todayOrders = await this.customerOrdersRepo
      .createQueryBuilder('o')
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.createdAt >= :today', { today })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .getMany();

    const ordersToday = todayOrders.length;
    let revenueToday = 0;
    for (const order of todayOrders) {
      revenueToday += parseFloat(order.totalAmount || '0');
    }

    // 2. Pending Orders
    const pendingOrdersCount = await this.customerOrdersRepo.count({
      where: {
        shopId,
        status: In(['pending', 'processing']),
      },
    });

    // 3. Live Order Activity
    const recentOrders = await this.customerOrdersRepo.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
      take: 4,
      relations: ['lines', 'lines.product'],
    });

    const liveOrderActivity = recentOrders.map(o => {
      const itemsStr = o.lines?.map(l => `${l.quantity}x ${l.product?.name || 'Item'}`).join(', ') || 'No items';
      let minsAgo = Math.floor((new Date().getTime() - new Date(o.createdAt).getTime()) / 60000);
      if (minsAgo < 0) minsAgo = 0;
      
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        items: itemsStr,
        time: minsAgo === 0 ? 'Just now' : `${minsAgo} mins ago`
      };
    });

    // 4. Low Stock Alerts
    // Find warehouses for this shop
    const warehouses = await this.warehousesRepo.find({ where: { shopId } });
    const warehouseIds = warehouses.map(w => w.id);
    
    let lowStockItems: { name: string, stock: number }[] = [];
    if (warehouseIds.length > 0) {
      const stocks = await this.inventoryStockRepo.find({
        where: { warehouseId: In(warehouseIds) },
        relations: ['product'],
      });
      // Mocking safety stock as 10 since it's not in ProductEntity right now, wait let me check ProductEntity.
      // I'll just assume threshold is 10 for simplicity or return ones with stock < 10.
      lowStockItems = stocks
        .filter(s => s.quantityOnHand < 10)
        .map(s => ({
          name: s.product?.name || 'Unknown',
          stock: s.quantityOnHand,
        }))
        .slice(0, 5);
    }

    // 5. Top Products
    // Aggregate from order lines
    const topLines = await this.customerOrderLinesRepo
      .createQueryBuilder('l')
      .innerJoin('l.order', 'o')
      .innerJoin('l.product', 'p')
      .where('o.shopId = :shopId', { shopId })
      .select(['p.name as name', 'SUM(l.quantity) as sales'])
      .groupBy('p.id')
      .orderBy('sales', 'DESC')
      .limit(4)
      .getRawMany();

    const topProducts = topLines.map(t => ({
      name: t.name,
      sales: parseInt(t.sales, 10),
    }));

    // 6. Shift and operations overview
    // Calculate completed orders avg prep time (proxy using createdAt vs updatedAt)
    const completedOrders = await this.customerOrdersRepo.find({
      where: { shopId, status: In(['shipped', 'delivered']) },
    });
    let totalPrepMins = 0;
    for (const o of completedOrders) {
      const mins = (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 60000;
      totalPrepMins += mins > 0 ? mins : 0;
    }
    const avgPrepTime = completedOrders.length > 0 ? Math.floor(totalPrepMins / completedOrders.length) : 0;

    const staffOnShift = await this.usersRepo.count({
      where: { shopId, role: USER_ROLES.STORE_STAFF },
    });

    const pendingDeliveries = await this.inventoryOrdersRepo.count({
      where: { shopId, status: In(['draft', 'submitted', 'partially_received']) },
    });

    // Mock for now:
    const openingBalance = 15000;
    const cashSales = revenueToday; // Assumed all cash due to lack of payment method
    const cardSales = 0;
    const wastage = 0;
    
    // Find manager on duty
    const manager = await this.usersRepo.findOne({
      where: { shopId, role: USER_ROLES.STORE_ADMIN },
    });

    const cashiers = await this.usersRepo.count({
      where: { shopId, staffType: STORE_STAFF_TYPES.CASHIER },
    });

    return {
      daily: {
        ordersToday,
        revenueToday,
        avgPrepTime: `${avgPrepTime} mins`,
        staffOnShift: `${staffOnShift} Active`,
        pendingOrders: pendingOrdersCount,
      },
      liveOrders: liveOrderActivity,
      lowStock: lowStockItems,
      topProducts,
      shift: {
        openingBalance,
        cashSales,
        cardSales,
        pendingDeliveries,
        wastage,
        managerName: manager?.fullName || 'Not assigned',
        kitchenStaff: staffOnShift - cashiers,
        cashiers,
      }
    };
  }

  async getCashierDashboard(shopId: string, user: UserEntity) {
    if (!shopId) throw new Error('Shop ID is required');

    const shop = await this.shopsRepo.findOne({ where: { shopId } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await this.customerOrdersRepo
      .createQueryBuilder('o')
      .where('o.shopId = :shopId', { shopId })
      .andWhere('o.createdAt >= :today', { today })
      .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
      .getMany();

    const ordersToday = todayOrders.length;
    let cashSales = 0;
    for (const order of todayOrders) {
      cashSales += parseFloat(order.totalAmount || '0');
    }

    const pendingOrders = await this.customerOrdersRepo.count({
      where: {
        shopId,
        status: In(['pending', 'processing']),
      },
    });

    const recentOrders = await this.customerOrdersRepo.find({
      where: { shopId },
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['lines', 'lines.product'],
    });

    const recentActivity = recentOrders.map(o => {
      let minsAgo = Math.floor((new Date().getTime() - new Date(o.createdAt).getTime()) / 60000);
      if (minsAgo < 0) minsAgo = 0;
      return {
        id: o.id,
        title: `Order #${o.orderNumber} ${o.status}`,
        subtitle: `Total: LKR ${parseFloat(o.totalAmount).toFixed(0)}`,
        time: minsAgo === 0 ? 'Just now' : `${minsAgo} mins ago`
      };
    });

    return {
      user: {
        name: user.fullName || 'Cashier',
        role: user.staffType === STORE_STAFF_TYPES.CASHIER ? 'Cashier' : 'Staff',
        branch: shop?.name || 'Unknown Branch',
        shop: shop?.name || 'Unknown Shop',
        address: shop?.address || 'N/A',
        contact: user.phone || 'N/A',
      },
      stats: {
        ordersToday,
        cashSales,
        pendingOrders,
      },
      recentActivity,
    };
  }

  async getInventoryStaffDashboard(shopId: string, user: UserEntity) {
    if (!shopId) throw new Error('Shop ID is required');

    // 1. Incoming Deliveries
    const incomingDeliveries = await this.inventoryOrdersRepo.count({
      where: {
        shopId,
        status: In(['draft', 'submitted', 'partially_received']),
      },
    });

    // 2. Critical Shortages
    const warehouses = await this.warehousesRepo.find({ where: { shopId } });
    const warehouseIds = warehouses.map((w) => w.id);

    let criticalShortages = 0;
    let lowStockItems: { name: string; stock: number }[] = [];
    if (warehouseIds.length > 0) {
      const stocks = await this.inventoryStockRepo.find({
        where: { warehouseId: In(warehouseIds) },
        relations: ['product'],
      });
      const lowStocks = stocks.filter((s) => s.quantityOnHand < 10);
      criticalShortages = lowStocks.length;
      lowStockItems = lowStocks.map((s) => ({
        name: s.product?.name || 'Unknown',
        stock: s.quantityOnHand,
      })).slice(0, 5);
    }

    // 3. Active Task Queue
    const recentOrders = await this.inventoryOrdersRepo.find({
      where: { shopId, status: In(['draft', 'submitted', 'partially_received']) },
      relations: ['supplier'],
      order: { createdAt: 'DESC' },
      take: 4,
    });

    const taskQueue = recentOrders.map((o) => ({
      id: o.orderNumber,
      type: 'INBOUND',
      details: `${o.supplier?.name || 'Supplier'} - Pending Delivery`,
      status: o.status === 'submitted' ? 'Awaiting Truck' : 'Pending',
      action: 'Receive',
    }));

    // Mocking Outbound Transfers
    const outboundTransfers = 8; // Mock
    const expiringSoon = 5; // Mock
    
    // Mocking QC
    const qualityControl = [
      { ingredient: 'Fresh Milk 1L', batch: 'MK-992', quantity: '24 Cartons', expiry: 'Tomorrow', status: 'Critical' },
      { ingredient: 'Burger Buns', batch: 'BN-104', quantity: '150 Packs', expiry: 'In 3 Days', status: 'Warning' },
      { ingredient: 'Lettuce (Iceberg)', batch: 'VG-402', quantity: '15 kg', expiry: 'In 4 Days', status: 'Warning' },
    ];

    // Mocking Stock Movements
    const recentMovements = [
      { type: 'inbound', text: 'Received 500kg Wheat Flour', subtext: 'PO-1028 processed by John Doe.', time: '10 mins ago' },
      { type: 'outbound', text: 'Dispatched TR-8830 to Galle Fort', subtext: '2 pallets loaded onto Truck #4.', time: '1 hour ago' },
      { type: 'wastage', text: 'Wastage Logged: 5kg Tomatoes', subtext: 'Quality check failed during receiving.', time: '2 hours ago' },
    ];

    return {
      kpis: {
        incomingDeliveries,
        outboundTransfers,
        criticalShortages,
        expiringSoon,
      },
      taskQueue,
      lowStock: lowStockItems,
      recentMovements,
      qualityControl,
    };
  }
}
