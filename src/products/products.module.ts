import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { ProductAddon } from '../entities/product-addon.entity';
import { ProductAddonProduct } from '../entities/product-addon-product.entity';
import { Media } from '../entities/media.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductAddonsService } from './product-addons.service';
import { ProductAddonsController } from './product-addons.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductCategory,
      ProductAddon,
      ProductAddonProduct,
      Media,
    ]),
  ],
  providers: [
    ProductsService,
    ProductCategoriesService,
    ProductAddonsService,
  ],
  controllers: [
    ProductsController,
    ProductCategoriesController,
    ProductAddonsController,
  ],
  exports: [ProductsService, ProductCategoriesService, ProductAddonsService],
})
export class ProductsModule {}
