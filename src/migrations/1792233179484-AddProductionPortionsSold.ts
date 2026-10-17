import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductionPortionsSold1792233179484 implements MigrationInterface {
    name = 'AddProductionPortionsSold1792233179484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "productions" ADD "portions_sold" integer`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD "description" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "productions" DROP COLUMN "portions_sold"`);
    }

}
