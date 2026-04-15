import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  CustomerOrderEntity,
  CustomerOrderLineEntity,
} from '../inventory/entities/customer-order.entity';
import { ProductEntity } from '../inventory/entities/product.entity';
import { CreateCustomerOrderDto } from './dto/create-customer-order.dto';

@Injectable()
export class CustomerOrdersService {
  constructor(
    @InjectRepository(CustomerOrderEntity)
    private readonly ordersRepository: Repository<CustomerOrderEntity>,
    @InjectRepository(CustomerOrderLineEntity)
    private readonly linesRepository: Repository<CustomerOrderLineEntity>,
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    private readonly dataSource: DataSource,
  ) {}

  list(shopId: string) {
    return this.ordersRepository.find({
      where: { shopId },
      relations: ['lines', 'lines.product'],
      order: { createdAt: 'DESC' },
    });
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
        where: { id: l.productId, shopId },
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
}
