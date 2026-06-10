import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BookingEntity } from './booking.entity';
import { SeatEntity } from '../events/seat.entity';

@Entity('booking_seats')
export class BookingSeatEntity {
  @PrimaryColumn('uuid', { name: 'booking_id' })
  bookingId!: string;

  @PrimaryColumn('uuid', { name: 'seat_id' })
  seatId!: string;

  @ManyToOne(() => BookingEntity, (b) => b.seatLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @ManyToOne(() => SeatEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seat_id' })
  seat!: SeatEntity;
}
