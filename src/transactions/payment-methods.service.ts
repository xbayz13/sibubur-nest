import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PaymentMethod } from '../entities/payment-method.entity';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import type { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { buildPaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams } from '../common/dto/pagination-query.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async create(createPaymentMethodDto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    try {
      const paymentMethod = this.paymentMethodRepository.create(createPaymentMethodDto);
      return await this.paymentMethodRepository.save(paymentMethod);
    } catch (error: unknown) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : undefined;
      if (code === 'SQLITE_CONSTRAINT_UNIQUE' || code === '23505') {
        throw new ConflictException('Payment method name already exists');
      }
      throw error;
    }
  }

  async findAll(page?: number, limit?: number): Promise<PaginatedResponse<PaymentMethod>> {
    const { take, skip, page: p, limit: l } = getPaginationParams(page, limit);
    const [data, total] = await this.paymentMethodRepository.findAndCount({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return buildPaginatedResponse(data, total, p, l);
  }

  async findOne(id: number): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }
    return paymentMethod;
  }

  async update(id: number, updatePaymentMethodDto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    const paymentMethod = await this.findOne(id);
    Object.assign(paymentMethod, updatePaymentMethodDto);
    return await this.paymentMethodRepository.save(paymentMethod);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.paymentMethodRepository.softDelete(id);
  }
}

