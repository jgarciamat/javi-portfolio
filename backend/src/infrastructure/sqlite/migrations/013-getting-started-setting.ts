import { Migration } from '../migrator';

/** The "first steps" panel stays until the user hides it, on every device. */
export const gettingStartedSetting: Migration = {
  version: 13,
  name: 'show getting started',
  up(db) {
    db.exec(
      'ALTER TABLE user_settings ADD COLUMN show_getting_started INTEGER NOT NULL DEFAULT 1;'
    );
  },
};
