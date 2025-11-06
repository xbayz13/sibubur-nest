import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { ProductAddon } from './product-addon.entity';

@Entity('product_addon_products')
export class ProductAddonProduct {
  @PrimaryColumn({ name: 'product_id' })
  productId: number;

  @PrimaryColumn({ name: 'addon_id' })
  addonId: number;

  @ManyToOne(() => Product, (product) => product.productAddons)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => ProductAddon, (addon) => addon.productAddonProducts)
  @JoinColumn({ name: 'addon_id' })
  addon: ProductAddon;

  @Column({ name: 'addon_price_override', type: 'decimal', precision: 12, scale: 2, nullable: true })
  addonPriceOverride: number;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}


