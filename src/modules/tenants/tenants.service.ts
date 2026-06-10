import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from './tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenants: Repository<TenantEntity>,
  ) {}

  async create(name: string, slug: string): Promise<TenantEntity> {
    const tenant = this.tenants.create({ name, slug });
    return this.tenants.save(tenant);
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    return this.tenants.findOne({ where: { slug } });
  }
}
