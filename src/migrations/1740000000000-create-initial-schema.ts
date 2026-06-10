import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1740000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await queryRunner.query(`
      CREATE TABLE tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        slug varchar(128) NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
        email varchar(320) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        role varchar(32) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_role_check CHECK (role IN ('customer','owner','admin'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        slug varchar(160) NOT NULL UNIQUE,
        title varchar(255) NOT NULL,
        venue varchar(255) NOT NULL,
        city varchar(128) NOT NULL,
        category varchar(128) NOT NULL,
        description text NOT NULL DEFAULT '',
        starts_at timestamptz NOT NULL,
        price_from integer NOT NULL DEFAULT 0,
        currency char(3) NOT NULL DEFAULT 'INR',
        total_seats integer NOT NULL,
        published_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_events_tenant_starts ON events (tenant_id, starts_at)
    `);

    await queryRunner.query(`
      CREATE TABLE seats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        row_label varchar(8) NOT NULL,
        seat_number integer NOT NULL,
        status varchar(32) NOT NULL DEFAULT 'available',
        held_until timestamptz,
        CONSTRAINT seats_status_check CHECK (status IN ('available','held','taken')),
        CONSTRAINT seats_event_row_number_unique UNIQUE (event_id, row_label, seat_number)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_seats_event_status ON seats (event_id, status)
    `);

    await queryRunner.query(`
      CREATE TABLE bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        status varchar(32) NOT NULL,
        idempotency_key varchar(128),
        locked_until timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT bookings_status_check CHECK (status IN ('locked','pending_payment','confirmed','expired','cancelled'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_bookings_user ON bookings (user_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_bookings_event ON bookings (event_id)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX bookings_idempotency_key_unique
      ON bookings (idempotency_key)
      WHERE idempotency_key IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE booking_seats (
        booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        seat_id uuid NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
        PRIMARY KEY (booking_id, seat_id)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE booking_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        from_status varchar(32),
        to_status varchar(32) NOT NULL,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_booking_audit_booking ON booking_audit_logs (booking_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS booking_audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_seats`);
    await queryRunner.query(`DROP TABLE IF EXISTS bookings`);
    await queryRunner.query(`DROP TABLE IF EXISTS seats`);
    await queryRunner.query(`DROP TABLE IF EXISTS events`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
