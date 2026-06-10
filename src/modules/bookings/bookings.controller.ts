import {
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { LockSeatsDto } from './dto/lock-seats.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/jwt-payload.types';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('locks')
  @UseGuards(AuthGuard('jwt'))
  lock(
    @CurrentUser() user: RequestUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() dto: LockSeatsDto,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throw new BadRequestException('Header Idempotency-Key is required.');
    }
    return this.bookings.lockSeats({
      userId: user.userId,
      eventSlug: dto.eventSlug,
      seatIds: dto.seatIds,
      idempotencyKey: key,
    });
  }
}
