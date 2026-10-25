import { Migration } from '../migrator';

/**
 * The territory of the last draft of each quarter and whether its one extra free draft (to redo it
 * after changing «¿Dónde realizas la actividad?») has been used. Additive: older rows keep a null
 * territory, read as the general one (no app sent a territory before this column existed).
 */
export const autonomoTerritoryExtra: Migration = {
  version: 42,
  name: 'self-employed draft territory extra',
  up(db) {
    db.exec(`
      ALTER TABLE autonomo_quarter_drafts ADD COLUMN territory TEXT;
      ALTER TABLE autonomo_quarter_drafts ADD COLUMN territory_extra INTEGER NOT NULL DEFAULT 0;
    `);
  },
};
