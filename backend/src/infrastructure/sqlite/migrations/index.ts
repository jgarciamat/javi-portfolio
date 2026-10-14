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
import { categoryRules } from './014-category-rules';
import { assets } from './015-assets';
import { weeklyDigest } from './016-weekly-digest';
import { businessCategories } from './017-business-categories';
import { splitExpenses } from './018-split-expenses';
import { push } from './019-push';
import { debtTerms } from './020-debt-terms';
import { inbox } from './021-inbox';
import { rentaCalculations } from './022-renta-calculations';
import { rentaPass } from './023-renta-pass';
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
  categoryRules,
  assets,
  weeklyDigest,
  businessCategories,
  splitExpenses,
  push,
  debtTerms,
  inbox,
  rentaCalculations,
  rentaPass,
];
