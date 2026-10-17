import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpenseDescription1792233179480 implements MigrationInterface {
    name = 'AddExpenseDescription1792233179480'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "productions" ADD "portions_sold" integer`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD "description" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "productions" DROP COLUMN "portions_sold"`);
    }

}
