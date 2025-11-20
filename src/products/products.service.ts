import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Product } from '../entities/product.entity';
import { ProductAddonProduct } from '../entities/product-addon-product.entity';
import { ProductAddon } from '../entities/product-addon.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddProductAddonDto } from './dto/add-product-addon.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductAddonProduct)
    private productAddonProductRepository: Repository<ProductAddonProduct>,
    @InjectRepository(ProductAddon)
    private productAddonRepository: Repository<ProductAddon>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const product = this.productRepository.create(createProductDto);
      return await this.productRepository.save(product);
    } catch (error) {
      throw new ConflictException('Failed to create product');
    }
  }

  async findAll(): Promise<Product[]> {
    return await this.productRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['category', 'picture', 'productAddons', 'productAddons.addon'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return await this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.productRepository.softDelete(id);
  }

  async addAddon(productId: number, addAddonDto: AddProductAddonDto): Promise<Product> {
    // Verify product exists
    const product = await this.findOne(productId);
    
    // Verify addon exists
    const addon = await this.productAddonRepository.findOne({
      where: { id: addAddonDto.addonId, deletedAt: IsNull() },
    });
    if (!addon) {
      throw new NotFoundException(`Addon with ID ${addAddonDto.addonId} not found`);
    }

    // Check if relationship already exists
    const existing = await this.productAddonProductRepository.findOne({
      where: {
        productId,
        addonId: addAddonDto.addonId,
      },
    });

    if (existing) {
      throw new ConflictException('Addon is already assigned to this product');
    }

    // Create the relationship
    const productAddonProduct = this.productAddonProductRepository.create({
      productId,
      addonId: addAddonDto.addonId,
      addonPriceOverride: addAddonDto.addonPriceOverride,
    });

    await this.productAddonProductRepository.save(productAddonProduct);

    // Return updated product with relations
    return await this.findOne(productId);
  }

  async removeAddon(productId: number, addonId: number): Promise<Product> {
    // Verify product exists
    await this.findOne(productId);

    // Find and remove the relationship
    const productAddonProduct = await this.productAddonProductRepository.findOne({
      where: {
        productId,
        addonId,
      },
    });

    if (!productAddonProduct) {
      throw new NotFoundException('Addon is not assigned to this product');
    }

    await this.productAddonProductRepository.remove(productAddonProduct);

    // Return updated product with relations
    return await this.findOne(productId);
  }

  async updateProductAddons(productId: number, addonIds: number[]): Promise<Product> {
    // Verify product exists
    await this.findOne(productId);

    // Get current relationships
    const currentRelations = await this.productAddonProductRepository.find({
      where: { productId },
    });

    const currentAddonIds = currentRelations.map((rel) => rel.addonId);
    
    // Find addons to add
    const addonIdsToAdd = addonIds.filter((id) => !currentAddonIds.includes(id));
    
    // Find addons to remove
    const addonIdsToRemove = currentAddonIds.filter((id) => !addonIds.includes(id));

    // Remove relationships
    for (const addonId of addonIdsToRemove) {
      await this.productAddonProductRepository.delete({
        productId,
        addonId,
      });
    }

    // Add new relationships
    if (addonIdsToAdd.length > 0) {
      // Verify all addons exist
      const addons = await this.productAddonRepository.find({
        where: {
          id: In(addonIdsToAdd),
          deletedAt: IsNull(),
        },
      });

      if (addons.length !== addonIdsToAdd.length) {
        throw new NotFoundException('One or more addons not found');
      }

      const newRelations = addonIdsToAdd.map((addonId) =>
        this.productAddonProductRepository.create({
          productId,
          addonId,
        }),
      );

      await this.productAddonProductRepository.save(newRelations);
    }

    // Return updated product with relations
    return await this.findOne(productId);
  }
}

