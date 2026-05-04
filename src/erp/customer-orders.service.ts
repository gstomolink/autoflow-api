import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizePagination, toPaginated } from '../common/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  CustomerOrderEntity,
  CustomerOrderLineEntity,
} from '../inventory/entities/customer-order.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { ShopEntity } from '../inventory/entities/shop.entity';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';
import { UpdateCustomerOrderDto } from './dto/update-customer-order.dto';

@Injectable()
export class CustomerOrdersService {
  constructor(
    @InjectRepository(CustomerOrderEntity)
    private readonly ordersRepository: Repository<CustomerOrderEntity>,
    @InjectRepository(CustomerOrderLineEntity)
    private readonly linesRepository: Repository<CustomerOrderLineEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    @InjectRepository(ShopEntity)
    private readonly shopsRepository: Repository<ShopEntity>,
    private readonly dataSource: DataSource,
  ) {}

  private async expandShopIds(shopId: string): Promise<string[]> {
    const row = await this.shopsRepository.findOne({
      where: { shopId },
      select: { shopId: true, parentShopId: true },
    });
    if (!row || row.parentShopId) {
      return [shopId];
    }
    const children = await this.shopsRepository.find({
      where: { parentShopId: shopId },
      select: { shopId: true },
    });
    return [shopId, ...children.map((c) => c.shopId)];
  }

  async list(
    shopId: string,
    fromDate?: string,
    toDate?: string,
    status?: string,
    paymentType?: string,
    page?: number,
    limit?: number,
  ) {
    const { page: p, limit: l, skip } = normalizePagination(page, limit);
    const shopIds = await this.expandShopIds(shopId);
    const qb = this.ordersRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.lines', 'l')
      .leftJoinAndSelect('l.product', 'p')
      .where('o.shopId IN (:...shopIds)', { shopIds })
      .orderBy('o.createdAt', 'DESC');
    if (fromDate?.trim()) {
      qb.andWhere('DATE(o.createdAt) >= :fromDate', { fromDate: fromDate.trim() });
    }
    if (toDate?.trim()) {
      qb.andWhere('DATE(o.createdAt) <= :toDate', { toDate: toDate.trim() });
    }
    if (status?.trim()) {
      qb.andWhere('LOWER(o.status) = :status', {
        status: status.trim().toLowerCase(),
      });
    }
    if (paymentType?.trim()) {
      qb.andWhere('LOWER(o.paymentStatus) = :paymentStatus', {
        paymentStatus: paymentType.trim().toLowerCase(),
      });
    }
    const total = await qb.getCount();
    const items = await qb.skip(skip).take(l).getMany();
    return toPaginated(items, total, p, l);
  }

  async findOne(shopId: string, id: number) {
    const o = await this.ordersRepository.findOne({
      where: { id, shopId },
      relations: ['lines', 'lines.product'],
    });
    if (!o) {
      throw new NotFoundException();
    }
    return o;
  }

  async create(shopId: string, dto: CreateCustomerOrderDto) {
    let total = 0;
    const priced: { product: ProductEntity; quantity: number; unit: string }[] =
      [];
    for (const l of dto.lines) {
      const p = await this.productsRepository.findOne({
        where: { id: l.productId },
      });
      if (!p) {
        throw new BadRequestException(`product ${l.productId}`);
      }
      const unit = p.basePrice;
      const lineTotal = Number(unit) * l.quantity;
      total += lineTotal;
      priced.push({ product: p, quantity: l.quantity, unit });
    }
    const orderNumber = `CO-${Date.now()}`;
    return this.dataSource.transaction(async (m) => {
      const orderRepo = m.getRepository(CustomerOrderEntity);
      const lineRepo = m.getRepository(CustomerOrderLineEntity);
      const order = await orderRepo.save(
        orderRepo.create({
          shopId,
          orderNumber,
          customerName: dto.customerName.trim(),
          customerEmail: dto.customerEmail?.trim().toLowerCase() ?? null,
          customerPhone: dto.customerPhone?.trim() ?? null,
          status: 'pending',
          paymentStatus: 'pending',
          totalAmount: String(total),
        }),
      );
      for (const row of priced) {
        const lt = Number(row.unit) * row.quantity;
        await lineRepo.save(
          lineRepo.create({
            orderId: order.id,
            productId: row.product.id,
            quantity: row.quantity,
            unitPrice: row.unit,
            lineTotal: String(lt),
          }),
        );
      }
      return orderRepo.findOneOrFail({
        where: { id: order.id },
        relations: ['lines', 'lines.product'],
      });
    });
  }

  async update(shopId: string, id: number, dto: UpdateCustomerOrderDto) {
    const order = await this.ordersRepository.findOne({ where: { id, shopId } });
    if (!order) {
      throw new NotFoundException();
    }
    if (dto.status !== undefined) order.status = dto.status;
    if (dto.paymentStatus !== undefined) order.paymentStatus = dto.paymentStatus;
    return this.ordersRepository.save(order);
  }

  async remove(shopId: string, id: number): Promise<void> {
    const order = await this.ordersRepository.findOne({
      where: { id, shopId },
      relations: ['lines'],
    });
    if (!order) {
      throw new NotFoundException();
    }
    if (order.lines && order.lines.length > 0) {
      await this.linesRepository.remove(order.lines);
    }
    await this.ordersRepository.remove(order);
  }
}
