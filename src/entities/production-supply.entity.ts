import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Production } from './production.entity';
import { Supply } from './supply.entity';

@Entity('production_supplies')
export class ProductionSupply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'production_id' })
  productionId: number;

  @ManyToOne(() => Production, (production) => production.productionSupplies)
  @JoinColumn({ name: 'production_id' })
  production: Production;

  @Column({ name: 'supply_id' })
  supplyId: number;

  @ManyToOne(() => Supply, (supply) => supply.productionSupplies)
  @JoinColumn({ name: 'supply_id' })
  supply: Supply;

  @Column()
  quantity: number;
}


