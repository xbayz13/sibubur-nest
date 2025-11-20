# Database Seeding Guide

This guide explains how to seed the database with dummy data to test the complete application flow.

## Quick Start

### 1. Seed the Database

Run the seed script to populate the database with realistic dummy data:

```bash
npm run seed
```

This will create:
- **4 Roles**: Owner, Manager, Cashier, Kitchen Staff
- **10 Permissions**: Various CRUD permissions
- **3 Users**: owner, manager1, cashier1
- **3 Stores**: SiBubur Cabang Utama, Mall, Pasar
- **3 Product Categories**: Bubur Ayam, Bubur Kacang Hijau, Bubur Sumsum
- **5 Products**: Various bubur items with prices
- **5 Product Addons**: Kerupuk, Kacang, Telur, Ati Ampela, Cakwe
- **4 Employees**: Assigned to different stores
- **2 Payment Methods**: Cash, QRIS
- **4 Expense Categories**: Bahan Baku, Operasional, Transportasi, Lain-lain
- **6 Supplies**: Beras, Ayam, Kacang Hijau, Gula, Garam, Minyak
- **2 Weather Records**: For yesterday and today
- **2 Production Records**: With supply usage
- **3 Orders**: With items and addons
- **3 Transactions**: Payment records
- **3 Expenses**: Various expense records
- **4 Attendances**: Employee attendance records

### 2. View the Seeded Data

To view what was created in the database:

```bash
npm run view-data
```

### 3. Start the Application

Start the NestJS application:

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`
Swagger documentation at `http://localhost:3000/api`

## Test Credentials

After seeding, you can login with these credentials:

| Username | Password | Role | Name |
|----------|----------|------|------|
| `owner` | `owner123` | Owner | Budi Santoso |
| `manager1` | `manager123` | Manager | Siti Nurhaliza |
| `cashier1` | `cashier123` | Cashier | Ahmad Fauzi |

## Application Flow (As Seeded)

The seed script follows the complete application flow:

### Step 1: Prepare Data ✅
- Products, addons, employees, stores, supplies, and expense categories are created

### Step 2: Daily Production Recording ✅
- Production records are created for yesterday and today
- Each production includes weather data and supply usage

### Step 3: Cashier Records Orders ✅
- 3 orders are created with:
  - Order items (products with quantities)
  - Order item addons (toppings/addons)
  - Calculated totals (subtotal, tax, total)

### Step 4: Customer Payments ✅
- 3 transactions are created, one for each order
- Orders are marked as "paid" after transaction creation
- Different payment methods are used (Cash, QRIS)

### Step 5: Owner Restocks Supplies ✅
- 3 expense records are created for different categories
- Expenses are linked to stores

### Step 6: Employee Attendance ✅
- Attendance records are created for all employees
- All marked as "present" for today

### Step 7: Reports Generation
- You can now use the Reports API to generate:
  - Daily reports
  - Monthly reports
  - Yearly reports

## Testing the API

### 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cashier1",
    "password": "cashier123"
  }'
```

### 2. Get Orders (with token)

```bash
curl -X GET http://localhost:3000/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Products

```bash
curl -X GET http://localhost:3000/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Daily Report

```bash
curl -X GET "http://localhost:3000/reports/daily?date=2025-11-06" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Viewing Data in Database

### Using SQLite (if using SQLite)

```bash
sqlite3 sibubur.db

# View all tables
.tables

# View orders
SELECT * FROM orders;

# View transactions
SELECT * FROM transactions;

# View products
SELECT * FROM products;

# Exit
.exit
```

### Using PostgreSQL (if using PostgreSQL)

```bash
psql -h localhost -U postgres -d sibubur

# View orders
SELECT * FROM orders;

# View transactions
SELECT * FROM transactions;

# View products
SELECT * FROM products;

# Exit
\q
```

## Resetting the Database

To clear and reseed the database:

```bash
npm run seed
```

The seed script automatically clears existing data before seeding.

## Customizing Seed Data

Edit `src/scripts/seed-database.ts` to customize:
- Number of records created
- Data values
- Relationships between entities

## Notes

- The seed script uses transactions to ensure data integrity
- All dates are set relative to today (yesterday and today)
- Order numbers and transaction numbers are auto-generated
- All passwords are hashed using bcrypt
- The script supports both SQLite and PostgreSQL

