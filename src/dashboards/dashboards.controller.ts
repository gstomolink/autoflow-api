import { Controller, Get, UseGuards, Query, Req } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { USER_ROLES } from '../constants/roles.constant';

@Controller('dashboards')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('super-admin')
  @Roles(USER_ROLES.SUPER_ADMIN)
  async getSuperAdminDashboard() {
    return this.dashboardsService.getSuperAdminDashboard();
  }

  @Get('store-admin')
  @Roles(USER_ROLES.STORE_ADMIN, USER_ROLES.SUPER_ADMIN)
  async getStoreAdminDashboard(
    @Query('shopId') shopId: string,
    @Query('year') year: string,
    @Req() req: any,
  ) {
    const actualShopId = shopId || req.user?.shopId;
    const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.dashboardsService.getStoreAdminDashboard(actualShopId, req.user, yearNum);
  }

  @Get('cashier')
  @Roles(USER_ROLES.STORE_STAFF, USER_ROLES.SUPER_ADMIN)
  async getCashierDashboard(@Query('shopId') shopId: string, @Req() req: any) {
    const actualShopId = shopId || req.user?.shopId;
    return this.dashboardsService.getCashierDashboard(actualShopId, req.user);
  }

  @Get('inventory-staff')
  @Roles(USER_ROLES.STORE_STAFF, USER_ROLES.STORE_ADMIN, USER_ROLES.SUPER_ADMIN)
  async getInventoryStaffDashboard(@Query('shopId') shopId: string, @Req() req: any) {
    const actualShopId = shopId || req.user?.shopId;
    return this.dashboardsService.getInventoryStaffDashboard(actualShopId, req.user);
  }
}
