import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ORDER_CREATED,
  ORDER_PAID,
  type OrderCreatedPayload,
  type OrderPaidPayload,
} from '../events/order.events';

/**
 * Listens to order domain events for side effects (e.g. logging, metrics).
 * Handlers run asynchronously and do not block the request.
 */
@Injectable()
export class OrderEventsListener {
  private readonly logger = new Logger(OrderEventsListener.name);

  @OnEvent(ORDER_CREATED)
  handleOrderCreated(payload: OrderCreatedPayload): void {
    this.logger.debug(
      `Order created: orderId=${payload.orderId} storeId=${payload.storeId} userId=${payload.userId} total=${payload.totalAmount}`,
    );
  }

  @OnEvent(ORDER_PAID)
  handleOrderPaid(payload: OrderPaidPayload): void {
    this.logger.debug(
      `Order paid: orderId=${payload.orderId} transactionId=${payload.transactionId} amount=${payload.amount} storeId=${payload.storeId}`,
    );
  }
}
