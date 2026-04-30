import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../inventory/entities/category.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoriesRepository: Repository<CategoryEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
  ) {}

  async findAll() {
    const rows = await this.categoriesRepository.find({
      order: { name: 'ASC' },
    });
    const withCount = await Promise.all(
      rows.map(async (c) => {
        const productCount = await this.productsRepository.count({
          where: { categoryId: c.id },
        });
        return {
          ...c,
          productCount,
        };
      }),
    );
    return withCount;
  }

  async create(dto: CreateCategoryDto) {
    const row = this.categoriesRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim() ?? null,
    });
    return this.categoriesRepository.save(row);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const row = await this.categoriesRepository.findOne({
      where: { id },
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

  async remove(id: number) {
    const row = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!row) {
      throw new NotFoundException();
    }
    await this.categoriesRepository.remove(row);
  }

  async bulkCreate(file: Express.Multer.File) {
    const results: any[] = [];
    return new Promise((resolve, reject) => {
      Readable.from(file.buffer)
        .pipe(csvParser())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          let successCount = 0;
          for (const row of results) {
            // "Category Name", "Description" are standard from the frontend sample
            // Note: csv-parser parses headers verbatim unless configured otherwise
            // Frontend sample headers: "Category ID", "Category Name", "Description", "Status"
            const name = row['Category Name'] || row['name'] || row['Name'];
            const description = row['Description'] || row['description'];

            if (!name) continue; // skip invalid rows

            try {
              const newCategory = this.categoriesRepository.create({
                name: name.trim(),
                description: description?.trim() ?? null,
              });
              await this.categoriesRepository.save(newCategory);
              successCount++;
            } catch (err) {
              console.error('Failed to import row', row, err);
            }
          }
          resolve({ successCount });
        })
        .on('error', (error) => reject(error));
    });
  }
}
