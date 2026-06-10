import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USER', 'eventra'),
        password: config.get<string>('DB_PASSWORD', 'eventra'),
        database: config.get<string>('DB_NAME', 'eventra'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>('TYPEORM_LOGGING', 'false') === 'true',
      }),
    }),
    TenantsModule,
    UsersModule,
    AuthModule,
    EventsModule,
    BookingsModule,
    HealthModule,
  ],
})
export class AppModule {}
