import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Order } from '../entities/order.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, PaymentMethod, Order])],
  providers: [TransactionsService, PaymentMethodsService],
  controllers: [TransactionsController, PaymentMethodsController],
  exports: [TransactionsService, PaymentMethodsService],
})
export class TransactionsModule {}

