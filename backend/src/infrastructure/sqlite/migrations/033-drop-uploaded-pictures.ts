import { Migration } from '../migrator';

/**
 * Profile pictures are gone: the avatar is one emoji now. Pictures uploaded before (data URLs,
 * or any image link) stayed in `users.avatar_url` without being served; this erases them.
 * An emoji is at most 16 characters and never looks like a URL, so chosen emoji stay.
 *
 * Idempotent (a second run matches nothing). With `secure_delete` on, the old bytes are
 * overwritten, so no VACUUM is needed. The pre-migration copy (kept 14 days, like the daily
 * backups) is the only way back during that window.
 */
export const dropUploadedPictures: Migration = {
  version: 33,
  name: 'drop uploaded profile pictures',
  up(db) {
    db.exec(`
      UPDATE users SET avatar_url = NULL
       WHERE avatar_url IS NOT NULL
         AND (avatar_url LIKE 'data:%'
           OR avatar_url LIKE 'blob:%'
           OR avatar_url LIKE 'http://%'
           OR avatar_url LIKE 'https://%'
           OR avatar_url LIKE '/%'
           OR length(avatar_url) > 16);
    `);
  },
};
