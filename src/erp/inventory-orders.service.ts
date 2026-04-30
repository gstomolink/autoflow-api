import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  InventoryOrderEntity,
  InventoryOrderLineEntity,
  InventoryOrderSource,
  InventoryOrderStatus,
} from '../inventory/entities/inventory-order.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { SupplierProductEntity } from '../inventory/entities/supplier-product.entity';
import { SupplierEntity } from '../inventory/entities/supplier.entity';
import { CreateInventoryOrderDto } from './dto/create-inventory-order.dto';
import { UpdateInventoryOrderDto } from './dto/update-inventory-order.dto';

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
    @InjectRepository(SupplierProductEntity)
    private readonly supplierProductsRepository: Repository<SupplierProductEntity>,
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
    const productIds = [...new Set(dto.lines.map((line) => line.productId))];
    const linked = await this.supplierProductsRepository.find({
      where: { supplierId: supplier.id, productId: In(productIds) },
      select: { productId: true, unitPrice: true },
    });
    const linkedMap = new Map(linked.map((row) => [row.productId, row.unitPrice]));
    for (const line of dto.lines) {
      if (!linkedMap.has(line.productId)) {
        throw new BadRequestException(
          `product ${line.productId} is not linked to supplier ${supplier.id}`,
        );
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
            unitCost: l.unitCost?.trim() || linkedMap.get(l.productId) || '0',
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

  async updateManual(shopId: string, id: number, dto: UpdateInventoryOrderDto) {
    const order = await this.ordersRepository.findOne({
      where: { id, shopId },
      relations: ['lines'],
    });
    if (!order) {
      throw new NotFoundException();
    }
    if (dto.supplierId !== undefined) {
      const supplier = await this.suppliersRepository.findOne({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new NotFoundException('supplier not found');
      }
      order.supplierId = supplier.id;
    }
    if (dto.expectedDeliveryDate !== undefined) {
      order.expectedDeliveryDate = dto.expectedDeliveryDate
        ? new Date(dto.expectedDeliveryDate)
        : null;
    }

    return this.dataSource.transaction(async (m) => {
      const orderRepo = m.getRepository(InventoryOrderEntity);
      const lineRepo = m.getRepository(InventoryOrderLineEntity);

      await orderRepo.save(order);

      if (dto.lines !== undefined) {
        if (!dto.lines.length) {
          throw new BadRequestException('at least one line is required');
        }
        const effectiveSupplierId = dto.supplierId ?? order.supplierId;
        const productIds = [...new Set(dto.lines.map((line) => line.productId))];
        const linked = await m.getRepository(SupplierProductEntity).find({
          where: { supplierId: effectiveSupplierId, productId: In(productIds) },
          select: { productId: true, unitPrice: true },
        });
        const linkedMap = new Map(linked.map((row) => [row.productId, row.unitPrice]));
        for (const line of dto.lines) {
          if (!linkedMap.has(line.productId)) {
            throw new BadRequestException(
              `product ${line.productId} is not linked to supplier ${effectiveSupplierId}`,
            );
          }
        }
        await lineRepo.delete({ orderId: order.id });
        for (const line of dto.lines) {
          await lineRepo.save(
            lineRepo.create({
              orderId: order.id,
              productId: line.productId,
              quantityOrdered: line.quantityOrdered,
              unitCost: line.unitCost?.trim() || linkedMap.get(line.productId) || '0',
            }),
          );
        }
      }

      return orderRepo.findOneOrFail({
        where: { id: order.id },
        relations: ['supplier', 'lines', 'lines.product'],
      });
    });
  }
}
