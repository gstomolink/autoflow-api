import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  normalizePagination,
  toPaginated,
  type PaginatedResult,
} from '../common/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopEntity } from '../inventory/entities/shop.entity';
import { WarehouseEntity } from '../inventory/entities/warehouse.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateShopDto } from './dto/create-shop.dto';

export type ShopListItem = {
  shopId: string;
  name: string;
  address: string | null;
  replenishmentNotifyBufferDays: number | null;
};

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly shopsRepository: Repository<ShopEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(WarehouseEntity)
    private readonly warehousesRepository: Repository<WarehouseEntity>,
  ) {}

  private async legacyShopIds(): Promise<string[]> {
    const fromUsers = await this.usersRepository
      .createQueryBuilder('u')
      .select('DISTINCT u.shopId', 'shopId')
      .where('u.shopId IS NOT NULL')
      .getRawMany<{ shopId: string }>();
    const fromWh = await this.warehousesRepository.find({
      select: { shopId: true },
    });
    const set = new Set<string>();
    for (const r of fromUsers) {
      if (r.shopId) {
        set.add(r.shopId);
      }
    }
    for (const w of fromWh) {
      set.add(w.shopId);
    }
    return [...set];
  }

  private async mergedShopList(): Promise<ShopListItem[]> {
    const registered = await this.shopsRepository.find({
      order: { shopId: 'ASC' },
    });
    const byId = new Map<string, ShopListItem>();
    for (const r of registered) {
      byId.set(r.shopId, {
        shopId: r.shopId,
        name: r.name,
        address: r.address ?? null,
        replenishmentNotifyBufferDays: r.replenishmentNotifyBufferDays,
      });
    }
    for (const id of await this.legacyShopIds()) {
      if (!byId.has(id)) {
        byId.set(id, {
          shopId: id,
          name: id,
          address: null,
          replenishmentNotifyBufferDays: null,
        });
      }
    }
    return [...byId.values()].sort((a, b) =>
      a.shopId.localeCompare(b.shopId),
    );
  }

  async list(
    search?: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<ShopListItem>> {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const rows = await this.mergedShopList();
    const q = search?.trim().toLowerCase();
    const filtered = !q
      ? rows
      : rows.filter(
          (row) =>
            row.shopId.toLowerCase().includes(q) ||
            row.name.toLowerCase().includes(q),
        );
    const total = filtered.length;
    const items = filtered.slice(skip, skip + l);
    return toPaginated(items, total, p, l);
  }

  async create(dto: CreateShopDto): Promise<ShopEntity> {
    const shopId = dto.shopId.trim();
    const exists = await this.shopsRepository.findOne({
      where: { shopId },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('shop id already registered');
    }
    const row = this.shopsRepository.create({
      shopId,
      name: dto.name.trim(),
      address: dto.address.trim(),
    });
    return this.shopsRepository.save(row);
  }

  async allShopIds(): Promise<string[]> {
    const registered = await this.shopsRepository.find({
      select: { shopId: true },
    });
    const set = new Set<string>();
    for (const r of registered) {
      set.add(r.shopId);
    }
    for (const id of await this.legacyShopIds()) {
      set.add(id);
    }
    return [...set].sort();
  }

  async updateReplenishmentBuffer(shopId: string, notifyBufferDays: number) {
    const row = await this.shopsRepository.findOne({ where: { shopId } });
    if (!row) {
      throw new NotFoundException('shop not registered');
    }
    row.replenishmentNotifyBufferDays = notifyBufferDays;
    return this.shopsRepository.save(row);
  }
}
