import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from '../events/event.entity';
import { SeatEntity } from '../events/seat.entity';
import { BookingAuditLogEntity } from './booking-audit-log.entity';
import { BookingSeatEntity } from './booking-seat.entity';
import { BookingEntity } from './booking.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingSeatEntity,
      BookingAuditLogEntity,
      SeatEntity,
      EventEntity,
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
