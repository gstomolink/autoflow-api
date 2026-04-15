import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierEntity } from '../inventory/entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
  ) {}

  findAll(shopId: string) {
    return this.suppliersRepository.find({
      where: { shopId },
      order: { name: 'ASC' },
    });
  }

  async create(shopId: string, dto: CreateSupplierDto) {
    const row = this.suppliersRepository.create({
      shopId,
      name: dto.name.trim(),
      code: dto.code?.trim() ?? null,
      email: dto.email?.trim().toLowerCase() ?? null,
      phone: dto.phone?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      defaultLeadTimeDays: dto.defaultLeadTimeDays,
    });
    return this.suppliersRepository.save(row);
  }

  async update(shopId: string, id: number, dto: UpdateSupplierDto) {
    const row = await this.suppliersRepository.findOne({
      where: { id, shopId },
    });
    if (!row) {
      throw new NotFoundException();
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.code !== undefined) row.code = dto.code?.trim() ?? null;
    if (dto.email !== undefined) {
      row.email = dto.email?.trim().toLowerCase() ?? null;
    }
    if (dto.phone !== undefined) row.phone = dto.phone?.trim() ?? null;
    if (dto.address !== undefined) {
      row.address = dto.address?.trim() ?? null;
    }
    if (dto.defaultLeadTimeDays !== undefined) {
      row.defaultLeadTimeDays = dto.defaultLeadTimeDays;
    }
    return this.suppliersRepository.save(row);
  }

  async remove(shopId: string, id: number) {
    const row = await this.suppliersRepository.findOne({
      where: { id, shopId },
    });
    if (!row) {
      throw new NotFoundException();
    }
    await this.suppliersRepository.remove(row);
  }
}
