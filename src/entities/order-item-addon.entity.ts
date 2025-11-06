import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { ProductAddon } from './product-addon.entity';

@Entity('order_item_addons')
export class OrderItemAddon {
  @PrimaryColumn({ name: 'order_item_id' })
  orderItemId: number;

  @PrimaryColumn({ name: 'addon_id' })
  addonId: number;

  @ManyToOne(() => OrderItem, (orderItem) => orderItem.orderItemAddons)
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  @ManyToOne(() => ProductAddon, (addon) => addon.orderItemAddons)
  @JoinColumn({ name: 'addon_id' })
  addon: ProductAddon;

  @Column({ name: 'addon_price', type: 'decimal', precision: 12, scale: 2 })
  addonPrice: number;

  @Column()
  quantity: number;
}


