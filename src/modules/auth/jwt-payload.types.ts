import { UserRole } from '../../common/enums/user-role.enum';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
};

export type RequestUser = {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
};
