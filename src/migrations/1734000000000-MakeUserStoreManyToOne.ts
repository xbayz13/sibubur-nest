import { MigrationInterface, QueryRunner, TableIndex, TableUnique } from 'typeorm';

export class MakeUserStoreManyToOne1734000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    const uniqueConstraint = table?.uniques.find((uq) => uq.columnNames.includes('store_id'));
    if (uniqueConstraint) {
      await queryRunner.dropUniqueConstraint('users', uniqueConstraint);
    }

    const uniqueIndex = table?.indices.find(
      (idx) => idx.isUnique && idx.columnNames.length === 1 && idx.columnNames[0] === 'store_id',
    );
    if (uniqueIndex) {
      await queryRunner.dropIndex('users', uniqueIndex);
    }

    const existingIndex = table?.indices.find(
      (idx) => !idx.isUnique && idx.columnNames.length === 1 && idx.columnNames[0] === 'store_id',
    );
    if (!existingIndex) {
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_store_id',
          columnNames: ['store_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    const existingIndex = table?.indices.find(
      (idx) => idx.name === 'IDX_users_store_id' || idx.columnNames.includes('store_id'),
    );
    if (existingIndex) {
      await queryRunner.dropIndex('users', existingIndex);
    }

    const uniqueConstraint = table?.uniques.find((uq) => uq.columnNames.includes('store_id'));
    if (!uniqueConstraint) {
      await queryRunner.createUniqueConstraint(
        'users',
        new TableUnique({
          name: 'UQ_users_store_id',
          columnNames: ['store_id'],
        }),
      );
    }
  }
}
