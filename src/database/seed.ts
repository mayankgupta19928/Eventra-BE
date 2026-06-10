/**
 * Idempotent demo seed: run after migrations. Requires empty events table (or skips if events already exist).
 * Usage: npm run seed
 */
import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import { UserRole } from '../common/enums/user-role.enum';
import { SeatStatus } from '../common/enums/seat-status.enum';
import { TenantEntity } from '../modules/tenants/tenant.entity';
import { UserEntity } from '../modules/users/user.entity';
import { EventEntity } from '../modules/events/event.entity';
import { SeatEntity } from '../modules/events/seat.entity';

const DEMO_PASSWORD = 'password123';

const EVENTS: Array<{
  slug: string;
  title: string;
  venue: string;
  city: string;
  startsAt: string;
  category: string;
  description: string;
  priceFrom: number;
  currency: string;
  totalSeats: number;
}> = [
  {
    slug: 'indie-night-live',
    title: 'Indie Night Live',
    venue: 'Grand Arena',
    city: 'Bengaluru',
    startsAt: '2026-07-12T18:30:00+05:30',
    category: 'Music',
    description:
      'An intimate evening with rising indie artists. All seating is general admission with optional reserved rows.',
    priceFrom: 499,
    currency: 'INR',
    totalSeats: 120,
  },
  {
    slug: 'tech-conference-2026',
    title: 'Tech Conference 2026',
    venue: 'Convention Centre',
    city: 'Bengaluru',
    startsAt: '2026-08-02T09:00:00+05:30',
    category: 'Conference',
    description:
      'Two days of keynotes and workshops. Pick a day pass or full conference pass with assigned seating.',
    priceFrom: 2499,
    currency: 'INR',
    totalSeats: 1000,
  },
  {
    slug: 'classical-evening',
    title: 'Classical Evening with City Orchestra',
    venue: 'Symphony Hall',
    city: 'Mumbai',
    startsAt: '2026-07-20T19:00:00+05:30',
    category: 'Classical',
    description:
      'Reserved seating with clear sightlines to the stage. Family-friendly runtime under 2 hours.',
    priceFrom: 799,
    currency: 'INR',
    totalSeats: 350,
  },
  {
    slug: 'comedy-special',
    title: 'Stand-up Comedy Special',
    venue: 'The Loft',
    city: 'Delhi',
    startsAt: '2026-06-28T20:00:00+05:30',
    category: 'Comedy',
    description:
      'Limited cabaret-style tables. Arrive 30 minutes early for seating.',
    priceFrom: 999,
    currency: 'INR',
    totalSeats: 80,
  },
  {
    slug: 'marathon-screening',
    title: "Marathon Screening: Director's Cut",
    venue: 'Cineplex IMAX',
    city: 'Hyderabad',
    startsAt: '2026-07-05T15:00:00+05:30',
    category: 'Film',
    description: 'Choose recliner or standard seats. Intermissions as marked.',
    priceFrom: 349,
    currency: 'INR',
    totalSeats: 280,
  },
  {
    slug: 'startup-pitch-night',
    title: 'Startup Pitch Night',
    venue: 'Innovation Hub',
    city: 'Bengaluru',
    startsAt: '2026-06-30T17:00:00+05:30',
    category: 'Networking',
    description:
      'Open seating plus a few reserved front rows for judges and sponsors.',
    priceFrom: 0,
    currency: 'INR',
    totalSeats: 60,
  },
];

function buildSeatsForEvent(eventId: string): Partial<SeatEntity>[] {
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seats: Partial<SeatEntity>[] = [];
  let n = 0;
  for (const row of rows) {
    for (let num = 1; num <= 8; num++) {
      n += 1;
      const taken = (n + eventId.length) % 7 === 0;
      seats.push({
        eventId,
        rowLabel: row,
        seatNumber: num,
        status: taken ? SeatStatus.Taken : SeatStatus.Available,
        heldUntil: null,
      });
    }
  }
  return seats;
}

async function run() {
  await dataSource.initialize();
  const eventRepo = dataSource.getRepository(EventEntity);
  const existing = await eventRepo.count();
  if (existing > 0) {
    console.log('Seed skipped: events table is not empty.');
    await dataSource.destroy();
    return;
  }

  const tenantRepo = dataSource.getRepository(TenantEntity);
  const userRepo = dataSource.getRepository(UserEntity);
  const seatRepo = dataSource.getRepository(SeatEntity);

  const tenant = await tenantRepo.save(
    tenantRepo.create({ name: 'Demo Events Org', slug: 'demo-events' }),
  );

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await userRepo.save(
    userRepo.create({
      email: 'admin@demo.local',
      passwordHash: hash,
      role: UserRole.Admin,
      tenantId: null,
    }),
  );

  await userRepo.save(
    userRepo.create({
      email: 'owner@demo.local',
      passwordHash: hash,
      role: UserRole.Owner,
      tenantId: tenant.id,
    }),
  );

  await userRepo.save(
    userRepo.create({
      email: 'customer@demo.local',
      passwordHash: hash,
      role: UserRole.Customer,
      tenantId: null,
    }),
  );

  for (const ev of EVENTS) {
    const event = await eventRepo.save(
      eventRepo.create({
        tenantId: tenant.id,
        slug: ev.slug,
        title: ev.title,
        venue: ev.venue,
        city: ev.city,
        category: ev.category,
        description: ev.description,
        startsAt: new Date(ev.startsAt),
        priceFrom: ev.priceFrom,
        currency: ev.currency,
        totalSeats: ev.totalSeats,
        publishedAt: new Date(),
        coverImageUrl: null,
      }),
    );

    const seatRows = buildSeatsForEvent(event.id).map((partial) =>
      seatRepo.create({
        eventId: partial.eventId!,
        rowLabel: partial.rowLabel!,
        seatNumber: partial.seatNumber!,
        status: partial.status!,
        heldUntil: partial.heldUntil ?? null,
      }),
    );
    await seatRepo.save(seatRows);
  }

  console.log(
    'Seed complete. Demo users (password: %s): admin@demo.local, owner@demo.local, customer@demo.local',
    DEMO_PASSWORD,
  );

  await dataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
