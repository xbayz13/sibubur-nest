import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddStoreIdToUsers1732000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add store_id column to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'store_id',
        type: 'integer',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['store_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'stores',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get the foreign key constraint name
    const table = await queryRunner.getTable('users');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('store_id') !== -1,
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('users', foreignKey);
    }

    // Drop the column
    await queryRunner.dropColumn('users', 'store_id');
  }
}

