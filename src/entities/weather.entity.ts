import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Production } from './production.entity';

@Entity('weathers')
export class Weather {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ name: 'location_name', nullable: true })
  locationName: string;

  @Column({ name: 'location_code', nullable: true })
  locationCode: string;

  @Column({ name: 'weather_json', type: 'json', nullable: true })
  weatherJson: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Production, (production) => production.weather)
  productions: Production[];
}


