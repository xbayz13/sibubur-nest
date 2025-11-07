import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPorridgeAmountToProduction1731000000000 implements MigrationInterface {
  name = 'AddPorridgeAmountToProduction1731000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'productions',
      new TableColumn({
        name: 'porridge_amount',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('productions', 'porridge_amount');
  }
}

