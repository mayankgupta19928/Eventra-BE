import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './event.entity';
import { SeatEntity } from './seat.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity, SeatEntity])],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
