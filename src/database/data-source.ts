import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { BookingAuditLogEntity } from '../modules/bookings/booking-audit-log.entity';
import { BookingSeatEntity } from '../modules/bookings/booking-seat.entity';
import { BookingEntity } from '../modules/bookings/booking.entity';
import { EventEntity } from '../modules/events/event.entity';
import { SeatEntity } from '../modules/events/seat.entity';
import { TenantEntity } from '../modules/tenants/tenant.entity';
import { UserEntity } from '../modules/users/user.entity';

config({ path: '.env' });

console.log(process.env.DB_HOST);
console.log(process.env.DB_PORT);
console.log(process.env.DB_USER);
console.log(process.env.DB_PASSWORD);
console.log(process.env.DB_NAME);
console.log(process.env.TYPEORM_LOGGING);

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'eventra',
  password: process.env.DB_PASSWORD ?? 'eventra',
  database: process.env.DB_NAME ?? 'eventra',
  entities: [
    TenantEntity,
    UserEntity,
    EventEntity,
    SeatEntity,
    BookingEntity,
    BookingSeatEntity,
    BookingAuditLogEntity,
  ],
  migrations: [`${__dirname}/../migrations/*{.ts,.js}`],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
});
