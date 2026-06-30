import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds indexes for frequently filtered/sorted columns to improve list and report query performance.
 */
export class AddPerformanceIndexes1733000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // orders: filter by store_id, date (created_at), status
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_store_created" ON "orders" ("store_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_status" ON "orders" ("status")`,
    );

    // transactions: filter by store_id, created_at, status
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_store_created" ON "transactions" ("store_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")`,
    );

    // expenses: filter by store_id, created_at
    await queryRunner.query(
      `CREATE INDEX "IDX_expenses_store_created" ON "expenses" ("store_id", "created_at")`,
    );

    // productions: filter by store_id, date
    await queryRunner.query(
      `CREATE INDEX "IDX_productions_store_date" ON "productions" ("store_id", "date")`,
    );

    // attendances: filter by employee_id, date
    await queryRunner.query(
      `CREATE INDEX "IDX_attendances_employee_date" ON "attendances" ("employee_id", "date")`,
    );

    // weathers: filter by date
    await queryRunner.query(
      `CREATE INDEX "IDX_weathers_date" ON "weathers" ("date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_weathers_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_attendances_employee_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_productions_store_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_expenses_store_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_store_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_store_created"`);
  }
}
