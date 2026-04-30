import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  InventoryOrderEntity,
  InventoryOrderLineEntity,
  InventoryOrderSource,
  InventoryOrderStatus,
} from '../inventory/entities/inventory-order.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { SupplierEntity } from '../inventory/entities/supplier.entity';
import { CreateInventoryOrderDto } from './dto/create-inventory-order.dto';

@Injectable()
export class InventoryOrdersService {
  constructor(
    @InjectRepository(InventoryOrderEntity)
    private readonly ordersRepository: Repository<InventoryOrderEntity>,
    @InjectRepository(InventoryOrderLineEntity)
    private readonly linesRepository: Repository<InventoryOrderLineEntity>,
    @InjectRepository(SupplierEntity)
    private readonly suppliersRepository: Repository<SupplierEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(shopId: string, source?: InventoryOrderSource) {
    const q = this.ordersRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.supplier', 's')
      .leftJoinAndSelect('o.lines', 'l')
      .leftJoinAndSelect('l.product', 'p')
      .where('o.shopId = :shopId', { shopId })
      .orderBy('o.createdAt', 'DESC');
    if (source) {
      q.andWhere('o.source = :source', { source });
    }
    return q.getMany();
  }

  async findOne(shopId: string, id: number) {
    const o = await this.ordersRepository.findOne({
      where: { id, shopId },
      relations: ['supplier', 'lines', 'lines.product'],
    });
    if (!o) {
      throw new NotFoundException();
    }
    return o;
  }

  async createManual(shopId: string, dto: CreateInventoryOrderDto) {
    const supplier = await this.suppliersRepository.findOne({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new NotFoundException('supplier not found');
    }
    for (const line of dto.lines) {
      const p = await this.productsRepository.findOne({
        where: { id: line.productId },
      });
      if (!p) {
        throw new BadRequestException(`product ${line.productId} not found`);
      }
    }
    const orderNumber = `IO-${Date.now()}`;
    const expected = dto.expectedDeliveryDate
      ? new Date(dto.expectedDeliveryDate)
      : null;
    return this.dataSource.transaction(async (m) => {
      const orderRepo = m.getRepository(InventoryOrderEntity);
      const lineRepo = m.getRepository(InventoryOrderLineEntity);
      const order = await orderRepo.save(
        orderRepo.create({
          shopId,
          supplierId: supplier.id,
          orderNumber,
          status: 'draft' as InventoryOrderStatus,
          source: 'manual' as InventoryOrderSource,
          expectedDeliveryDate: expected,
        }),
      );
      for (const l of dto.lines) {
        await m.getRepository(ProductEntity).findOneOrFail({
          where: { id: l.productId },
        });
        await lineRepo.save(
          lineRepo.create({
            orderId: order.id,
            productId: l.productId,
            quantityOrdered: l.quantityOrdered,
            unitCost: l.unitCost,
          }),
        );
      }
      return orderRepo.findOneOrFail({
        where: { id: order.id },
        relations: ['supplier', 'lines', 'lines.product'],
      });
    });
  }

  async remove(shopId: string, id: number) {
    const o = await this.ordersRepository.findOne({ where: { id, shopId } });
    if (!o) {
      throw new NotFoundException();
    }
    await this.ordersRepository.remove(o);
  }
}
