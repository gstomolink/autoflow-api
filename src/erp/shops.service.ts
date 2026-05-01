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
import { USER_ROLES } from '../constants/roles.constant';
import type { JwtPayload } from '../auth/jwt-payload';

export type ShopListItem = {
  shopId: string;
  name: string;
  address: string | null;
  parentShopId: string | null;
  replenishmentNotifyBufferDays: number | null;
};

export type ShopTypeFilter = 'parent' | 'child';

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
        parentShopId: r.parentShopId ?? null,
        replenishmentNotifyBufferDays: r.replenishmentNotifyBufferDays,
      });
    }
    for (const id of await this.legacyShopIds()) {
      if (!byId.has(id)) {
        byId.set(id, {
          shopId: id,
          name: id,
          address: null,
          parentShopId: null,
          replenishmentNotifyBufferDays: null,
        });
      }
    }
    return [...byId.values()].sort((a, b) =>
      a.shopId.localeCompare(b.shopId),
    );
  }

  private applyTypeFilters(
    rows: ShopListItem[],
    storeType?: ShopTypeFilter,
    parentShopId?: string,
  ): ShopListItem[] {
    const normalizedParent = parentShopId?.trim() || '';
    let filtered = rows;
    if (storeType === 'parent') {
      filtered = filtered.filter((row) => !row.parentShopId);
    } else if (storeType === 'child') {
      filtered = filtered.filter((row) => Boolean(row.parentShopId));
    }
    if (normalizedParent) {
      filtered = filtered.filter((row) => row.parentShopId === normalizedParent);
    }
    return filtered;
  }

  async list(
    search?: string,
    page?: number,
    limit?: number,
    storeType?: ShopTypeFilter,
    parentShopId?: string,
  ): Promise<PaginatedResult<ShopListItem>> {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const rows = await this.mergedShopList();
    const typeFiltered = this.applyTypeFilters(rows, storeType, parentShopId);
    const q = search?.trim().toLowerCase();
    const filtered = !q
      ? typeFiltered
      : typeFiltered.filter(
          (row) =>
            row.shopId.toLowerCase().includes(q) ||
            row.name.toLowerCase().includes(q),
        );
    const total = filtered.length;
    const items = filtered.slice(skip, skip + l);
    return toPaginated(items, total, p, l);
  }

  async listForActor(
    actor: JwtPayload,
    search?: string,
    page?: number,
    limit?: number,
    storeType?: ShopTypeFilter,
    parentShopId?: string,
  ): Promise<PaginatedResult<ShopListItem>> {
    if (actor.role === USER_ROLES.SUPER_ADMIN) {
      return this.list(search, page, limit, storeType, parentShopId);
    }
    const resolvedParentShopId = await this.resolveParentShopId(actor.shopId ?? '');
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const rows = await this.mergedShopList();
    const scopeRows = rows.filter(
      (row) =>
        row.shopId === resolvedParentShopId ||
        row.parentShopId === resolvedParentShopId,
    );
    const scoped = this.applyTypeFilters(scopeRows, storeType, parentShopId);
    const q = search?.trim().toLowerCase();
    const filtered = !q
      ? scoped
      : scoped.filter(
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
    const parentShopId = dto.parentShopId?.trim() || null;
    if (parentShopId) {
      if (parentShopId === shopId) {
        throw new ConflictException('shop cannot be its own parent');
      }
      const parent = await this.shopsRepository.findOne({
        where: { shopId: parentShopId },
        select: { id: true, parentShopId: true },
      });
      if (!parent) {
        throw new NotFoundException('parent shop not registered');
      }
      if (parent.parentShopId) {
        throw new ConflictException('sub store cannot be parent');
      }
    }
    const row = this.shopsRepository.create({
      shopId,
      name: dto.name.trim(),
      address: dto.address.trim(),
      parentShopId,
    });
    return this.shopsRepository.save(row);
  }

  async createForActor(actor: JwtPayload, dto: CreateShopDto): Promise<ShopEntity> {
    if (actor.role === USER_ROLES.SUPER_ADMIN) {
      return this.create(dto);
    }
    const parentShopId = await this.resolveParentShopId(actor.shopId ?? '');
    return this.create({
      ...dto,
      parentShopId,
    });
  }

  async resolveParentShopId(shopId: string): Promise<string> {
    const row = await this.shopsRepository.findOne({
      where: { shopId },
      select: { shopId: true, parentShopId: true },
    });
    if (!row) {
      return shopId;
    }
    return row.parentShopId?.trim() || row.shopId;
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
