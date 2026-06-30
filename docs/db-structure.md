# Database Structure

Snapshot of the TypeORM entities and relationships used by the NestJS backend.

## Core Entities
- **users** (`src/users/user.entity.ts`): `id` PK; fields include `name`, `email`, `password`, `role_id`, optional `store_id`; relations: many-to-one `role`, many-to-one optional `store`, one-to-many `orders`, `transactions` (author), `productions` (author).
- **roles** (`src/entities/role.entity.ts`): `id` PK; one-to-many `users`; one-to-many `role_permissions` join rows.
- **permissions** (`src/entities/permission.entity.ts`): `id` PK; one-to-many `role_permissions`.
- **role_permissions** (`src/entities/role-permission.entity.ts`): composite PK `(role_id, permission_id)`; many-to-one `role`, many-to-one `permission`.

## Stores, Orders, Sales
- **stores** (`src/entities/store.entity.ts`): `id` PK; one-to-many `orders`, `transactions`, `productions`, `expenses`, `employees`.
- **orders** (`src/entities/order.entity.ts`): `id` PK; many-to-one `store`, many-to-one `user`, one-to-many `order_items`, one-to-many `transactions`.
- **order_items** (`src/entities/order-item.entity.ts`): `id` PK; many-to-one `order`, many-to-one `product`, one-to-many `order_item_addons`.
- **order_item_addons** (`src/entities/order-item-addon.entity.ts`): composite PK `(order_item_id, addon_id)`; many-to-one `order_item`, many-to-one `product_addon`.
- **transactions** (`src/entities/transaction.entity.ts`): `id` PK; many-to-one `payment_method`, many-to-one author `user`, many-to-one `store`, many-to-one `order`.
- **payment_methods** (`src/entities/payment-method.entity.ts`): `id` PK; one-to-many `transactions`.

## Products and Add-ons
- **product_categories** (`src/entities/product-category.entity.ts`): `id` PK; optional self-relation parent/children; one-to-many `products`.
- **products** (`src/entities/product.entity.ts`): `id` PK; many-to-one `product_category`; many-to-one `media` as `picture`; one-to-many `product_addon_products`; one-to-many `order_items`.
- **product_addons** (`src/entities/product-addon.entity.ts`): `id` PK; one-to-many `product_addon_products`; one-to-many `order_item_addons`.
- **product_addon_products** (`src/entities/product-addon-product.entity.ts`): composite PK `(product_id, addon_id)`; many-to-one `product`, many-to-one `product_addon`.
- **media** (`src/entities/media.entity.ts`): `id` PK; one-to-many `products` (as `picture`).

## Production and Supplies
- **productions** (`src/entities/production.entity.ts`): `id` PK; many-to-one `weather`, many-to-one `store`, many-to-one author `user`; one-to-many `production_supplies`.
- **production_supplies** (`src/entities/production-supply.entity.ts`): `id` PK; many-to-one `production`, many-to-one `supply`.
- **supplies** (`src/entities/supply.entity.ts`): `id` PK; one-to-many `production_supplies`.
- **weathers** (`src/entities/weather.entity.ts`): `id` PK; one-to-many `productions`.

## Employees and Attendance
- **employees** (`src/entities/employee.entity.ts`): `id` PK; many-to-one optional `store`; one-to-many `attendances`.
- **attendances** (`src/entities/attendance.entity.ts`): `id` PK; columns `date`, `employee_id`, `status`; many-to-one `employee`.

## Expenses
- **expense_categories** (`src/entities/expense-category.entity.ts`): `id` PK; one-to-many `expenses`.
- **expenses** (`src/entities/expense.entity.ts`): `id` PK; many-to-one `expense_category`; many-to-one `store`.

## Notes
- Join/link tables are modeled explicitly (no `@ManyToMany`): `role_permissions`, `product_addon_products`, `order_item_addons`, `production_supplies`.
- Date columns use `date` type where defined (e.g., attendances).
