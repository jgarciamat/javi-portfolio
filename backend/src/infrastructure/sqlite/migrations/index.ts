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
import { autonomoDrafts } from './024-autonomo-drafts';
import { autonomoPdfs } from './025-autonomo-pdfs';
import { foreignKeyIndexes } from './026-foreign-key-indexes';
import { refreshRotation } from './027-refresh-rotation';
import { importUses } from './028-import-uses';
import { rentaCampaignUses } from './029-renta-campaign-uses';
import { autonomoQuarterDrafts } from './030-autonomo-quarter-drafts';
import { twoFactor } from './031-two-factor';
import { autonomoData } from './032-autonomo-data';
import { dropUploadedPictures } from './033-drop-uploaded-pictures';
import { funnelDaily } from './034-funnel-daily';
import { trialNotices } from './035-trial-notices';
import { creatorAffiliates } from './036-creator-affiliates';
import { cryptoSimulator } from './037-crypto-simulator';
import { cryptoShorts } from './038-crypto-shorts';
import { cryptoSeasons } from './039-crypto-seasons';
import { cryptoSlots } from './040-crypto-slots';
import { moneyLeakDecisions } from './041-money-leak-decisions';
import { autonomoTerritoryExtra } from './042-autonomo-territory-extra';
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
  autonomoDrafts,
  autonomoPdfs,
  foreignKeyIndexes,
  refreshRotation,
  importUses,
  rentaCampaignUses,
  autonomoQuarterDrafts,
  twoFactor,
  autonomoData,
  dropUploadedPictures,
  funnelDaily,
  trialNotices,
  creatorAffiliates,
  cryptoSimulator,
  cryptoShorts,
  cryptoSeasons,
  cryptoSlots,
  moneyLeakDecisions,
  autonomoTerritoryExtra,
];
