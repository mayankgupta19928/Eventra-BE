import { ArrayMinSize, IsArray, IsString, IsUUID } from 'class-validator';

export class LockSeatsDto {
  @IsString()
  eventSlug!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  seatIds!: string[];
}
