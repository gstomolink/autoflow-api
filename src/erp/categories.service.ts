import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../inventory/entities/category.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
  ) {}

  async findAll(shopId: string) {
    const rows = await this.categoriesRepository.find({
      where: { shopId },
      order: { name: 'ASC' },
    });
    const withCount = await Promise.all(
      rows.map(async (c) => {
        const productCount = await this.productsRepository.count({
          where: { categoryId: c.id, shopId },
        });
        return {
          ...c,
          productCount,
        };
      }),
    );
    return withCount;
  }

  async create(shopId: string, dto: CreateCategoryDto) {
    const row = this.categoriesRepository.create({
      shopId,
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
    });
    return this.categoriesRepository.save(row);
  }

  async update(shopId: string, id: number, dto: UpdateCategoryDto) {
    const row = await this.categoriesRepository.findOne({
      where: { id, shopId },
    });
    if (!row) {
      throw new NotFoundException();
    }
    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() ?? null;
    }
    return this.categoriesRepository.save(row);
  }

  async remove(shopId: string, id: number) {
    const row = await this.categoriesRepository.findOne({
      where: { id, shopId },
    });
    if (!row) {
      throw new NotFoundException();
    }
    await this.categoriesRepository.remove(row);
  }
}
