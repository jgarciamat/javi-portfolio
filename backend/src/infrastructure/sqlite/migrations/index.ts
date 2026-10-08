import { Migration } from '../migrator';
import { baseline } from './001-baseline';
import { coreV2 } from './002-core-v2';
import { disableDefaultAdmin } from './003-disable-default-admin';
import { recurringSkips } from './004-recurring-skips';
import { monetization } from './005-monetization';

/** Ordered list of schema migrations. Never edit an applied one: add a new file. */
export const migrations: Migration[] = [
  baseline,
  coreV2,
  disableDefaultAdmin,
  recurringSkips,
  monetization,
];
