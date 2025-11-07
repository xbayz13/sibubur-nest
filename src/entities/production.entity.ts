import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Weather } from './weather.entity';
import { Store } from './store.entity';
import { User } from '../users/user.entity';
import { ProductionSupply } from './production-supply.entity';

@Entity('productions')
export class Production {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'weather_id', nullable: true })
  weatherId: number;

  @ManyToOne(() => Weather, (weather) => weather.productions)
  @JoinColumn({ name: 'weather_id' })
  weather: Weather;

  @Column({ name: 'store_id' })
  storeId: number;

  @ManyToOne(() => Store, (store) => store.productions)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ name: 'porridge_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  porridgeAmount: number;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProductionSupply, (ps) => ps.production)
  productionSupplies: ProductionSupply[];
}


