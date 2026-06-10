import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/user-role.enum';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './jwt-payload.types';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tenants: TenantsService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === UserRole.Admin) {
      throw new ForbiddenException(
        'Admin accounts cannot be registered via this endpoint.',
      );
    }
    if (dto.role === UserRole.Owner && !dto.businessName?.trim()) {
      throw new ConflictException(
        'businessName is required for organizer accounts.',
      );
    }

    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    let tenantId: string | null = null;
    if (dto.role === UserRole.Owner) {
      const base = this.slugify(dto.businessName!.trim());
      let slug = base;
      let attempt = 0;
      while (await this.tenants.findBySlug(slug)) {
        attempt += 1;
        slug = `${base}-${attempt}`;
      }
      const tenant = await this.tenants.create(dto.businessName!.trim(), slug);
      tenantId = tenant.id;
    }

    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      tenantId,
    });

    return {
      accessToken: this.sign(user.id, user.email, user.role, user.tenantId),
    };
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return {
      accessToken: this.sign(user.id, user.email, user.role, user.tenantId),
    };
  }

  private sign(
    userId: string,
    email: string,
    role: UserRole,
    tenantId: string | null,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      tenantId,
    };
    return this.jwt.sign(payload);
  }

  private slugify(value: string): string {
    const s = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    return s.length > 0 ? s : 'tenant';
  }
}
