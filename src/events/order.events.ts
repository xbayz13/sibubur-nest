/** Domain event: order created (items and addons persisted). */
export const ORDER_CREATED = 'order.created';

export interface OrderCreatedPayload {
  orderId: number;
  storeId: number;
  userId: number;
  totalAmount: number;
}

/** Domain event: order marked as paid (transaction recorded). */
export const ORDER_PAID = 'order.paid';

export interface OrderPaidPayload {
  orderId: number;
  transactionId: number;
  amount: number;
  storeId: number;
}
