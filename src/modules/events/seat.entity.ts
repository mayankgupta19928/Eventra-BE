import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EventEntity } from './event.entity';
import { SeatStatus } from '../../common/enums/seat-status.enum';

@Entity('seats')
export class SeatEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => EventEntity, (e) => e.seats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event!: EventEntity;

  @Column({ name: 'row_label', type: 'varchar', length: 8 })
  rowLabel!: string;

  @Column({ name: 'seat_number', type: 'int' })
  seatNumber!: number;

  @Column({ type: 'varchar', length: 32, default: SeatStatus.Available })
  status!: SeatStatus;

  @Column({ name: 'held_until', type: 'timestamptz', nullable: true })
  heldUntil!: Date | null;
}
