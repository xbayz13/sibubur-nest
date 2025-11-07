/**
 * Comprehensive permissions mapping for all modules
 * Maps frontend routes and backend controllers to permissions
 */

export interface PermissionDefinition {
  module: string;
  action: string;
  slug: string;
  description?: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Dashboard
  { module: 'dashboard', action: 'read', slug: 'dashboard.read', description: 'View dashboard' },

  // Cashier
  { module: 'cashier', action: 'create', slug: 'cashier.create', description: 'Create orders via cashier' },
  { module: 'cashier', action: 'read', slug: 'cashier.read', description: 'View cashier page' },

  // Orders
  { module: 'orders', action: 'create', slug: 'orders.create', description: 'Create orders' },
  { module: 'orders', action: 'read', slug: 'orders.read', description: 'View orders' },
  { module: 'orders', action: 'update', slug: 'orders.update', description: 'Update orders' },
  { module: 'orders', action: 'delete', slug: 'orders.delete', description: 'Delete orders' },

  // Transactions
  { module: 'transactions', action: 'create', slug: 'transactions.create', description: 'Create transactions' },
  { module: 'transactions', action: 'read', slug: 'transactions.read', description: 'View transactions' },
  { module: 'transactions', action: 'update', slug: 'transactions.update', description: 'Update transactions' },

  // Productions
  { module: 'productions', action: 'create', slug: 'productions.create', description: 'Create productions' },
  { module: 'productions', action: 'read', slug: 'productions.read', description: 'View productions' },
  { module: 'productions', action: 'update', slug: 'productions.update', description: 'Update productions' },
  { module: 'productions', action: 'delete', slug: 'productions.delete', description: 'Delete productions' },

  // Supplies
  { module: 'supplies', action: 'create', slug: 'supplies.create', description: 'Create supplies' },
  { module: 'supplies', action: 'read', slug: 'supplies.read', description: 'View supplies' },
  { module: 'supplies', action: 'update', slug: 'supplies.update', description: 'Update supplies' },
  { module: 'supplies', action: 'delete', slug: 'supplies.delete', description: 'Delete supplies' },

  // Expenses
  { module: 'expenses', action: 'create', slug: 'expenses.create', description: 'Create expenses' },
  { module: 'expenses', action: 'read', slug: 'expenses.read', description: 'View expenses' },
  { module: 'expenses', action: 'update', slug: 'expenses.update', description: 'Update expenses' },
  { module: 'expenses', action: 'delete', slug: 'expenses.delete', description: 'Delete expenses' },

  // Employees
  { module: 'employees', action: 'create', slug: 'employees.create', description: 'Create employees' },
  { module: 'employees', action: 'read', slug: 'employees.read', description: 'View employees' },
  { module: 'employees', action: 'update', slug: 'employees.update', description: 'Update employees' },
  { module: 'employees', action: 'delete', slug: 'employees.delete', description: 'Delete employees' },

  // Attendances
  { module: 'attendances', action: 'create', slug: 'attendances.create', description: 'Create attendances' },
  { module: 'attendances', action: 'read', slug: 'attendances.read', description: 'View attendances' },
  { module: 'attendances', action: 'update', slug: 'attendances.update', description: 'Update attendances' },

  // Reports
  { module: 'reports', action: 'read', slug: 'reports.read', description: 'View reports' },

  // Products (Master Data)
  { module: 'products', action: 'create', slug: 'products.create', description: 'Create products' },
  { module: 'products', action: 'read', slug: 'products.read', description: 'View products' },
  { module: 'products', action: 'update', slug: 'products.update', description: 'Update products' },
  { module: 'products', action: 'delete', slug: 'products.delete', description: 'Delete products' },

  // Product Categories (Master Data)
  { module: 'product-categories', action: 'create', slug: 'product-categories.create', description: 'Create product categories' },
  { module: 'product-categories', action: 'read', slug: 'product-categories.read', description: 'View product categories' },
  { module: 'product-categories', action: 'update', slug: 'product-categories.update', description: 'Update product categories' },
  { module: 'product-categories', action: 'delete', slug: 'product-categories.delete', description: 'Delete product categories' },

  // Product Addons (Master Data)
  { module: 'product-addons', action: 'create', slug: 'product-addons.create', description: 'Create product addons' },
  { module: 'product-addons', action: 'read', slug: 'product-addons.read', description: 'View product addons' },
  { module: 'product-addons', action: 'update', slug: 'product-addons.update', description: 'Update product addons' },
  { module: 'product-addons', action: 'delete', slug: 'product-addons.delete', description: 'Delete product addons' },

  // Stores (Master Data)
  { module: 'stores', action: 'create', slug: 'stores.create', description: 'Create stores' },
  { module: 'stores', action: 'read', slug: 'stores.read', description: 'View stores' },
  { module: 'stores', action: 'update', slug: 'stores.update', description: 'Update stores' },
  { module: 'stores', action: 'delete', slug: 'stores.delete', description: 'Delete stores' },

  // Expense Categories (Master Data)
  { module: 'expense-categories', action: 'create', slug: 'expense-categories.create', description: 'Create expense categories' },
  { module: 'expense-categories', action: 'read', slug: 'expense-categories.read', description: 'View expense categories' },
  { module: 'expense-categories', action: 'update', slug: 'expense-categories.update', description: 'Update expense categories' },
  { module: 'expense-categories', action: 'delete', slug: 'expense-categories.delete', description: 'Delete expense categories' },

  // Payment Methods (Master Data - read only for most users)
  { module: 'payment-methods', action: 'read', slug: 'payment-methods.read', description: 'View payment methods' },

  // Weather (Master Data - typically read only)
  { module: 'weather', action: 'create', slug: 'weather.create', description: 'Create weather data' },
  { module: 'weather', action: 'read', slug: 'weather.read', description: 'View weather data' },
  { module: 'weather', action: 'update', slug: 'weather.update', description: 'Update weather data' },

  // Users (Admin)
  { module: 'users', action: 'create', slug: 'users.create', description: 'Create users' },
  { module: 'users', action: 'read', slug: 'users.read', description: 'View users' },
  { module: 'users', action: 'update', slug: 'users.update', description: 'Update users' },
  { module: 'users', action: 'delete', slug: 'users.delete', description: 'Delete users' },

  // Roles (Admin)
  { module: 'roles', action: 'create', slug: 'roles.create', description: 'Create roles' },
  { module: 'roles', action: 'read', slug: 'roles.read', description: 'View roles' },
  { module: 'roles', action: 'update', slug: 'roles.update', description: 'Update roles' },
  { module: 'roles', action: 'delete', slug: 'roles.delete', description: 'Delete roles' },

  // Permissions (Admin)
  { module: 'permissions', action: 'read', slug: 'permissions.read', description: 'View permissions' },

  // Role Permissions (Admin)
  { module: 'role-permissions', action: 'create', slug: 'role-permissions.create', description: 'Assign permissions to roles' },
  { module: 'role-permissions', action: 'update', slug: 'role-permissions.update', description: 'Update role permissions' },
];

/**
 * Route to permission mapping for frontend
 */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/': ['dashboard.read'],
  '/cashier': ['cashier.read', 'cashier.create'],
  '/open-orders': ['orders.read'],
  '/productions': ['productions.read', 'productions.create', 'productions.update'],
  '/orders': ['orders.read', 'orders.update'],
  '/transactions': ['transactions.read'],
  '/supplies': ['supplies.read', 'supplies.update'],
  '/expenses': ['expenses.read', 'expenses.create', 'expenses.update', 'expenses.delete'],
  '/employees': ['employees.read', 'employees.create', 'employees.update', 'employees.delete', 'attendances.read', 'attendances.create', 'attendances.update'],
  '/reports': ['reports.read'],
  '/master-data/products': ['products.read', 'products.create', 'products.update', 'products.delete'],
  '/master-data/product-categories': ['product-categories.read', 'product-categories.create', 'product-categories.update', 'product-categories.delete'],
  '/master-data/product-addons': ['product-addons.read', 'product-addons.create', 'product-addons.update', 'product-addons.delete'],
  '/master-data/stores': ['stores.read', 'stores.create', 'stores.update', 'stores.delete'],
  '/master-data/employees': ['employees.read', 'employees.create', 'employees.update', 'employees.delete'],
  '/master-data/expense-categories': ['expense-categories.read', 'expense-categories.create', 'expense-categories.update', 'expense-categories.delete'],
  '/users': ['users.read', 'users.create', 'users.update', 'users.delete'],
  '/roles': ['roles.read', 'roles.create', 'roles.update', 'roles.delete'],
  '/permissions': ['permissions.read'],
};

/**
 * Menu items with their required permissions
 */
export const MENU_ITEMS_PERMISSIONS: Record<string, string[]> = {
  'Dashboard': ['dashboard.read'],
  'Kasir': ['cashier.read'],
  'Pesanan Terbuka': ['orders.read'],
  'Produksi Harian': ['productions.read'],
  'Pesanan': ['orders.read'],
  'Transaksi': ['transactions.read'],
  'Persediaan': ['supplies.read'],
  'Pengeluaran': ['expenses.read'],
  'Karyawan': ['employees.read'],
  'Laporan': ['reports.read'],
  'Data Master': ['products.read', 'stores.read', 'product-categories.read', 'product-addons.read', 'employees.read', 'expense-categories.read'],
  'Pengguna': ['users.read'],
  'Role & Izin': ['roles.read'],
};

/**
 * Role permission assignments
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Owner': ALL_PERMISSIONS.map(p => p.slug), // Owner has all permissions (same as SuperAdmin)
  'SuperAdmin': [], // SuperAdmin bypasses permission checks, so no need to assign permissions
  'Manager': [
    'dashboard.read',
    'orders.read',
    'orders.update',
    'transactions.read',
    'productions.read',
    'productions.create',
    'productions.update',
    'supplies.read',
    'supplies.update',
    'expenses.read',
    'expenses.create',
    'expenses.update',
    'employees.read',
    'employees.create',
    'employees.update',
    'attendances.read',
    'attendances.create',
    'attendances.update',
    'reports.read',
    'products.read',
    'product-categories.read',
    'product-addons.read',
    'stores.read',
    'expense-categories.read',
    'payment-methods.read',
  ],
  'Cashier': [
    'dashboard.read',
    'cashier.read',
    'cashier.create',
    'orders.read',
    'orders.create',
    'transactions.read',
    'transactions.create',
    'products.read',
    'payment-methods.read',
  ],
  'Kitchen Staff': [
    'dashboard.read',
    'orders.read',
    'productions.read',
    'productions.create',
    'productions.update',
    'supplies.read',
  ],
};

