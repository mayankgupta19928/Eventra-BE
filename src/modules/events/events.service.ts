import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SeatStatus } from '../../common/enums/seat-status.enum';
import { EventEntity } from './event.entity';
import { SeatEntity } from './seat.entity';

export type EventListingView = {
  id: string;
  slug: string;
  title: string;
  venue: string;
  city: string;
  startsAt: string;
  category: string;
  description: string;
  priceFrom: number;
  currency: string;
  seatsAvailable: number;
  totalSeats: number;
  coverImageUrl: string | null;
};

export type SeatView = {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
};

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly events: Repository<EventEntity>,
    @InjectRepository(SeatEntity)
    private readonly seats: Repository<SeatEntity>,
  ) {}

  async findAll(params: {
    q?: string;
    category?: string;
    skip: number;
    take: number;
  }): Promise<EventListingView[]> {
    const qb = this.events
      .createQueryBuilder('e')
      .orderBy('e.starts_at', 'ASC')
      .skip(params.skip)
      .take(params.take);

    if (params.category) {
      qb.andWhere('e.category = :category', { category: params.category });
    }
    if (params.q?.trim()) {
      const term = `%${params.q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((b) => {
          b.where('LOWER(e.title) LIKE :term', { term })
            .orWhere('LOWER(e.venue) LIKE :term', { term })
            .orWhere('LOWER(e.city) LIKE :term', { term })
            .orWhere('LOWER(e.category) LIKE :term', { term });
        }),
      );
    }

    const list = await qb.getMany();
    return this.attachAvailability(list);
  }

  async findBySlug(slug: string): Promise<EventListingView> {
    const event = await this.events.findOne({ where: { slug } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    const [mapped] = await this.attachAvailability([event]);
    return mapped;
  }

  async listSeatsBySlug(slug: string): Promise<SeatView[]> {
    const event = await this.events.findOne({ where: { slug } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    const rows = await this.seats.find({
      where: { eventId: event.id },
      order: { rowLabel: 'ASC', seatNumber: 'ASC' },
    });
    return rows.map((s) => ({
      id: s.id,
      row: s.rowLabel,
      number: s.seatNumber,
      status: s.status,
    }));
  }

  private async attachAvailability(
    events: EventEntity[],
  ): Promise<EventListingView[]> {
    if (events.length === 0) return [];
    const ids = events.map((e) => e.id);
    const raw = await this.seats
      .createQueryBuilder('s')
      .select('s.event_id', 'eventId')
      .addSelect(
        'SUM(CASE WHEN s.status = :avail THEN 1 ELSE 0 END)::int',
        'available',
      )
      .where('s.event_id IN (:...ids)', { ids })
      .setParameter('avail', SeatStatus.Available)
      .groupBy('s.event_id')
      .getRawMany<{ eventId: string; available: string }>();

    const map = new Map<string, number>();
    for (const row of raw) {
      map.set(row.eventId, parseInt(row.available, 10));
    }

    return events.map((e) => ({
      id: e.id,
      slug: e.slug,
      title: e.title,
      venue: e.venue,
      city: e.city,
      startsAt: e.startsAt.toISOString(),
      category: e.category,
      description: e.description,
      priceFrom: e.priceFrom,
      currency: e.currency,
      totalSeats: e.totalSeats,
      seatsAvailable: map.get(e.id) ?? 0,
      coverImageUrl: e.coverImageUrl,
    }));
  }
}
