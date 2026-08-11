import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderItemAddon } from '../entities/order-item-addon.entity';
import { Product } from '../entities/product.entity';
import { ProductAddonProduct } from '../entities/product-addon-product.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderEventsListener } from './order-events.listener';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderItemAddon,
      Product,
      ProductAddonProduct,
    ]),
    GuardsModule,
  ],
  providers: [OrdersService, OrderEventsListener],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
