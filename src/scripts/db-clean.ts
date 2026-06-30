import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { DataSource } from 'typeorm';
import { getDatabaseConfig } from '../config/database.config';

type CleanGroup = 'all' | 'master' | 'productions' | 'transactions';

const TABLE_ORDER = [
  'order_item_addons',
  'order_items',
  'transactions',
  'orders',
  'expenses',
  'production_supplies',
  'productions',
  'attendances',
  'employees',
  'product_addon_products',
  'product_addons',
  'products',
  'media',
  'product_categories',
  'role_permissions',
  'users',
  'roles',
  'permissions',
  'payment_methods',
  'expense_categories',
  'stores',
  'supplies',
];

const GROUP_TABLES: Record<Exclude<CleanGroup, 'all'>, string[]> = {
  // Transactional sales data
  transactions: ['order_item_addons', 'order_items', 'transactions', 'orders'],
  // Operational production data
  productions: ['expenses', 'production_supplies', 'productions', 'attendances', 'employees'],
  // Master data (not touched by the new seeders, but kept for full wipe)
  master: [
    'product_addon_products',
    'product_addons',
    'products',
    'media',
    'product_categories',
    'role_permissions',
    'users',
    'roles',
    'permissions',
    'payment_methods',
    'expense_categories',
    'stores',
    'supplies',
  ],
};

const GROUP_DEPENDENCIES: Record<CleanGroup, CleanGroup[]> = {
  all: ['transactions', 'productions', 'master'],
  master: ['transactions', 'productions'],
  transactions: [],
  productions: [],
};

const VALID_GROUPS: CleanGroup[] = ['all', 'master', 'transactions', 'productions'];

function resolveGroups(target: CleanGroup): CleanGroup[] {
  const queue: CleanGroup[] = [target];
  const seen = new Set<CleanGroup>();

  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const deps = GROUP_DEPENDENCIES[current] ?? [];
    queue.push(...deps);
  }

  return Array.from(seen);
}

function resolveTables(target: CleanGroup): string[] {
  if (target === 'all') return TABLE_ORDER;

  const groups = resolveGroups(target).filter((g) => g !== 'all');
  const included = new Set<string>();

  for (const group of groups) {
    const tables = GROUP_TABLES[group as Exclude<CleanGroup, 'all'>] ?? [];
    tables.forEach((table) => included.add(table));
  }

  return TABLE_ORDER.filter((table) => included.has(table));
}

async function promptConfirmation(groups: CleanGroup[], tables: string[]) {
  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `Are you sure you want to clean this data: ${groups.join(', ')}?\n` +
      `Tables to be cleared (child-first): ${tables.join(', ')}\n` +
      'Type "yes" to proceed: ',
  );
  await rl.close();

  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('Aborted. No data was removed.');
    process.exit(0);
  }
}

async function cleanTables(dataSource: DataSource, tables: string[]) {
  const runner = dataSource.createQueryRunner();
  await runner.connect();

  for (const table of tables) {
    console.log(`- Clearing ${table}`);
    await runner.query(`DELETE FROM "${table}"`);
  }
}

async function main() {
  const arg = (process.argv[2] ?? 'all').toLowerCase();
  const target: CleanGroup = VALID_GROUPS.includes(arg as CleanGroup)
    ? (arg as CleanGroup)
    : 'all';

  const groups = resolveGroups(target);
  const tables = resolveTables(target);

  if (!tables.length) {
    console.log('No tables resolved for cleaning. Exiting.');
    process.exit(0);
  }

  console.log('Weather data is left untouched by design.');
  await promptConfirmation(groups, tables);

  const dataSource = new DataSource({
    ...getDatabaseConfig(),
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    await cleanTables(dataSource, tables);
    console.log('✅ Data cleaning complete.');
  } catch (error) {
    console.error('❌ Failed to clean data:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}

main();
