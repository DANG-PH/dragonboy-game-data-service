import { MusicStatus } from 'proto/game-data.pb';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('music')
export class MusicEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  fileUrl: string;

  @Column({ unique: true, length: 32 })
  hash: string;

  @Column({ type: 'enum', enum: MusicStatus, default: MusicStatus.PROCESSING })
  status: MusicStatus;
}