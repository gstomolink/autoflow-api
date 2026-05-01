import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizePagination, toPaginated } from '../common/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarehouseEntity } from '../inventory/entities/warehouse.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(WarehouseEntity)
    private readonly warehousesRepository: Repository<WarehouseEntity>,
  ) {}

  async findAll(shopId: string, page?: number, limit?: number) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const [items, total] = await this.warehousesRepository.findAndCount({
      where: { shopId },
      order: { name: 'ASC' },
      skip,
      take: l,
    });
    return toPaginated(items, total, p, l);
  }

  async create(shopId: string, dto: CreateWarehouseDto) {
    const code = dto.code.trim();
    const exists = await this.warehousesRepository.findOne({
      where: { shopId, code },
      select: { id: true },
    });
    if (exists) {
      throw new ConflictException('warehouse code already exists');
    }
    const row = this.warehousesRepository.create({
      shopId,
      name: dto.name.trim(),
      code,
      address: dto.address.trim(),
      managerName: dto.managerName.trim(),
      contactPhone: dto.contactPhone.trim(),
    });
    return this.warehousesRepository.save(row);
  }

  async update(shopId: string, id: number, dto: UpdateWarehouseDto) {
    const row = await this.warehousesRepository.findOne({
      where: { id, shopId },
    });
    if (!row) {
      throw new NotFoundException();
    }
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      const clash = await this.warehousesRepository.findOne({
        where: { shopId, code },
        select: { id: true },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException('warehouse code already exists');
      }
      row.code = code;
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.address !== undefined) row.address = dto.address.trim();
    if (dto.managerName !== undefined) {
      row.managerName = dto.managerName.trim();
    }
    if (dto.contactPhone !== undefined) {
      row.contactPhone = dto.contactPhone.trim();
    }
    return this.warehousesRepository.save(row);
  }

  async remove(shopId: string, id: number) {
    const row = await this.warehousesRepository.findOne({
      where: { id, shopId },
    });
    if (!row) {
      throw new NotFoundException();
    }
    await this.warehousesRepository.remove(row);
  }
}
