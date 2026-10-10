import { Migration } from '../migrator';
import { baseline } from './001-baseline';
import { coreV2 } from './002-core-v2';
import { disableDefaultAdmin } from './003-disable-default-admin';
import { recurringSkips } from './004-recurring-skips';
import { monetization } from './005-monetization';
import { withdrawalAndTour } from './006-withdrawal-and-tour';
import { immediateStart } from './007-immediate-start';
import { metrics } from './008-metrics';
import { referrals } from './009-referrals';
import { household } from './010-household';
import { referralTiers } from './011-referral-tiers';
import { googlePlaySource } from './012-google-play-source';
import { gettingStartedSetting } from './013-getting-started-setting';

/** Ordered list of schema migrations. Never edit an applied one: add a new file. */
export const migrations: Migration[] = [
  baseline,
  coreV2,
  disableDefaultAdmin,
  recurringSkips,
  monetization,
  withdrawalAndTour,
  immediateStart,
  metrics,
  referrals,
  household,
  referralTiers,
  googlePlaySource,
  gettingStartedSetting,
];
