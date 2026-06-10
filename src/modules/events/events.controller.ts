import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { QueryEventsDto } from './dto/query-events.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Query() query: QueryEventsDto) {
    return this.events.findAll({
      q: query.q,
      category: query.category,
      skip: query.skip ?? 0,
      take: query.take ?? 20,
    });
  }

  @Get(':slug/seats')
  seats(@Param('slug') slug: string) {
    return this.events.listSeatsBySlug(slug);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.events.findBySlug(slug);
  }
}
