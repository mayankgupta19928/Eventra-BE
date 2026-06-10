import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema modification: optional marketing image per event (CDN / S3 URL).
 * Kept separate from the initial migration to mirror real-world incremental DB changes.
 */
export class AddEventCoverImageUrl1740000000001 implements MigrationInterface {
  name = 'AddEventCoverImageUrl1740000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      ADD COLUMN cover_image_url varchar(512)
    `);
    await queryRunner.query(`
      COMMENT ON COLUMN events.cover_image_url IS 'Optional hero image URL (e.g. CDN or signed S3 URL)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE events
      DROP COLUMN IF EXISTS cover_image_url
    `);
  }
}
