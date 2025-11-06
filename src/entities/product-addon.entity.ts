import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { ProductAddonProduct } from './product-addon-product.entity';
import { OrderItemAddon } from './order-item-addon.entity';

@Entity('product_addons')
export class ProductAddon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @OneToMany(() => ProductAddonProduct, (pap) => pap.addon)
  productAddonProducts: ProductAddonProduct[];

  @OneToMany(() => OrderItemAddon, (oia) => oia.addon)
  orderItemAddons: OrderItemAddon[];
}


