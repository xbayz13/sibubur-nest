import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { ProductCategory } from './product-category.entity';
import { Media } from './media.entity';
import { ProductAddonProduct } from './product-addon-product.entity';
import { OrderItem } from './order-item.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_category_id', nullable: true })
  productCategoryId: number;

  @ManyToOne(() => ProductCategory, (category) => category.products)
  @JoinColumn({ name: 'product_category_id' })
  category: ProductCategory;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'picture_id', nullable: true })
  pictureId: number;

  @ManyToOne(() => Media, (media) => media.products)
  @JoinColumn({ name: 'picture_id' })
  picture: Media;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @OneToMany(() => ProductAddonProduct, (pap) => pap.product)
  productAddons: ProductAddonProduct[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems: OrderItem[];
}


