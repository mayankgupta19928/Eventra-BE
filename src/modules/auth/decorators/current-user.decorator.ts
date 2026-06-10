import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser } from '../jwt-payload.types';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return req.user;
  },
);
