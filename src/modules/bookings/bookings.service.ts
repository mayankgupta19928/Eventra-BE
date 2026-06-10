import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SeatStatus } from '../../common/enums/seat-status.enum';
import { BookingStatus } from '../../common/enums/booking-status.enum';
import { BookingAuditLogEntity } from './booking-audit-log.entity';
import { BookingSeatEntity } from './booking-seat.entity';
import { BookingEntity } from './booking.entity';
import { EventEntity } from '../events/event.entity';
import { SeatEntity } from '../events/seat.entity';

const HOLD_MINUTES = 10;

@Injectable()
export class BookingsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookingEntity)
    private readonly bookings: Repository<BookingEntity>,
    @InjectRepository(SeatEntity)
    private readonly seats: Repository<SeatEntity>,
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(BookingSeatEntity)
    private readonly bookingSeats: Repository<BookingSeatEntity>,
    @InjectRepository(BookingAuditLogEntity)
    private readonly audit: Repository<BookingAuditLogEntity>,
  ) {}

  async lockSeats(input: {
    userId: string;
    eventSlug: string;
    seatIds: string[];
    idempotencyKey: string;
  }) {
    const event = await this.events.findOne({
      where: { slug: input.eventSlug },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const existing = await this.bookings.findOne({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      if (
        existing.status === BookingStatus.Locked &&
        existing.lockedUntil &&
        existing.lockedUntil > new Date()
      ) {
        return this.toLockResponse(existing);
      }
      throw new ConflictException(
        'Idempotency key already used for a completed or expired booking.',
      );
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const seatRows = await runner.manager
        .getRepository(SeatEntity)
        .createQueryBuilder('s')
        .setLock('pessimistic_write')
        .where('s.id IN (:...ids)', { ids: input.seatIds })
        .andWhere('s.event_id = :eventId', { eventId: event.id })
        .getMany();

      if (seatRows.length !== input.seatIds.length) {
        throw new BadRequestException(
          'One or more seats are not part of this event.',
        );
      }

      const now = new Date();
      for (const seat of seatRows) {
        if (seat.status !== SeatStatus.Available) {
          throw new ConflictException(
            `Seat ${seat.rowLabel}${seat.seatNumber} is not available.`,
          );
        }
        if (seat.heldUntil && seat.heldUntil > now) {
          throw new ConflictException(
            `Seat ${seat.rowLabel}${seat.seatNumber} is temporarily held.`,
          );
        }
      }

      const lockedUntil = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);

      const booking = runner.manager.getRepository(BookingEntity).create({
        userId: input.userId,
        eventId: event.id,
        status: BookingStatus.Locked,
        idempotencyKey: input.idempotencyKey,
        lockedUntil,
      });
      await runner.manager.save(booking);

      for (const seat of seatRows) {
        seat.status = SeatStatus.Held;
        seat.heldUntil = lockedUntil;
        await runner.manager.save(seat);
        const link = runner.manager.getRepository(BookingSeatEntity).create({
          bookingId: booking.id,
          seatId: seat.id,
        });
        await runner.manager.save(link);
      }

      const log = runner.manager.getRepository(BookingAuditLogEntity).create({
        bookingId: booking.id,
        fromStatus: null,
        toStatus: BookingStatus.Locked,
        metadata: { seatIds: input.seatIds, eventSlug: input.eventSlug },
      });
      await runner.manager.save(log);

      await runner.commitTransaction();
      return this.toLockResponse(booking);
    } catch (e) {
      await runner.rollbackTransaction();
      throw e;
    } finally {
      await runner.release();
    }
  }

  private toLockResponse(booking: BookingEntity) {
    return {
      bookingId: booking.id,
      status: booking.status,
      lockedUntil: booking.lockedUntil?.toISOString() ?? null,
    };
  }
}
