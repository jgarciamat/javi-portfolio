import { AppConfig } from '@config/env';
import {
  CategorySuggester,
  Clock,
  EmailSender,
  FinancialAdvisor,
  GoogleIdentityVerifier,
  OfferCatalog,
  PasswordHasher,
  PaymentGateway,
  systemClock,
} from '@domain/ports/services';
import { AiAllowance } from '@application/ai/AiAllowance';
import { AiCategorizer } from '@application/ai/AiCategorizer';
import { BillingService } from '@application/billing/BillingService';
import { EntitlementService } from '@application/billing/EntitlementService';
import { OfferService } from '@application/offers/OfferService';
import { AccountService } from '@application/accounts/AccountService';
import { AuthService } from '@application/auth/AuthService';
import { CategoryService } from '@application/categories/CategoryService';
import { ExportService, ImportService } from '@application/data/DataServices';
import { AdviceService, StatsService } from '@application/insights/InsightsServices';
import {
  BudgetService,
  CustomAlertService,
  GoalService,
} from '@application/planning/PlanningServices';
import { HouseholdService } from '@application/household/HouseholdService';
import { ProfileService } from '@application/profile/ProfileService';
import { ReferralService } from '@application/referrals/ReferralService';
import { RecurringMaterializer } from '@application/recurring/RecurringMaterializer';
import { RecurringService } from '@application/recurring/RecurringService';
import { SettingsService } from '@application/settings/SettingsService';
import { AccountResolver, CategoryResolver } from '@application/shared/resolvers';
import { TransactionService } from '@application/transactions/TransactionService';
import { CloudflareAi } from './ai/CloudflareAi';
import { GeminiAdvisor } from './ai/GeminiAdvisor';
import { DisabledPaymentGateway, StripeGateway } from './billing/StripeGateway';
import { JsonOfferCatalog } from './offers/JsonOfferCatalog';
import { BcryptPasswordHasher, JwtTokenService } from './auth/JwtTokenService';
import { GoogleOAuthIdentityVerifier } from './auth/GoogleIdentityVerifier';
import { ConsoleEmailSender, ResendEmailSender } from './mail/EmailSenders';
import { Db, SqliteUnitOfWork } from './sqlite/database';
import {
  SqliteAccountRepository,
  SqliteTransferRepository,
} from './sqlite/repositories/SqliteAccountRepository';
import { SqliteCategoryRepository } from './sqlite/repositories/SqliteCategoryRepository';
import {
  SqliteCategoryBudgetRepository,
  SqliteCustomAlertRepository,
  SqliteGoalRepository,
  SqliteRecurringRuleRepository,
  SqliteSettingsRepository,
} from './sqlite/repositories/SqlitePlanningRepositories';
import {
  SqliteAffiliateClickRepository,
  SqliteAiUsageRepository,
  SqliteBillingEventRepository,
  SqliteSubscriptionRepository,
} from './sqlite/repositories/SqliteMonetizationRepositories';
import { SqliteHouseholdRepository } from './sqlite/repositories/SqliteHouseholdRepository';
import { SqliteMetricsRepository } from './sqlite/repositories/SqliteMetricsRepository';
import { SqliteReferralRepository } from './sqlite/repositories/SqliteReferralRepository';
import { SqliteTransactionRepository } from './sqlite/repositories/SqliteTransactionRepository';
import {
  SqliteRefreshTokenRepository,
  SqliteUserRepository,
} from './sqlite/repositories/SqliteUserRepository';

/** Adapters that tests (or other deployments) may replace. */
export interface ContainerOverrides {
  clock?: Clock;
  email?: EmailSender;
  google?: GoogleIdentityVerifier;
  advisor?: FinancialAdvisor | null;
  categorySuggester?: CategorySuggester | null;
  payments?: PaymentGateway;
  offers?: OfferCatalog;
  hasher?: PasswordHasher;
}

function buildAi(config: AppConfig): {
  advisor: FinancialAdvisor | null;
  suggester: CategorySuggester | null;
} {
  const { provider, cloudflare, gemini } = config.ai;
  if (provider === 'cloudflare' && cloudflare) {
    const ai = new CloudflareAi(cloudflare);
    return { advisor: ai, suggester: ai };
  }
  if (provider === 'gemini' && gemini) {
    return { advisor: new GeminiAdvisor(gemini.apiKey, gemini.model), suggester: null };
  }
  return { advisor: null, suggester: null };
}

export type Container = ReturnType<typeof buildContainer>;

/** Composition root: the only place that knows every concrete class. */
export function buildContainer(db: Db, config: AppConfig, overrides: ContainerOverrides = {}) {
  const clock = overrides.clock ?? systemClock;
  const uow = new SqliteUnitOfWork(db);

  const repos = {
    users: new SqliteUserRepository(db),
    refreshTokens: new SqliteRefreshTokenRepository(db),
    categories: new SqliteCategoryRepository(db),
    accounts: new SqliteAccountRepository(db),
    transfers: new SqliteTransferRepository(db),
    transactions: new SqliteTransactionRepository(db),
    rules: new SqliteRecurringRuleRepository(db),
    alerts: new SqliteCustomAlertRepository(db),
    budgets: new SqliteCategoryBudgetRepository(db),
    goals: new SqliteGoalRepository(db),
    settings: new SqliteSettingsRepository(db),
    subscriptions: new SqliteSubscriptionRepository(db),
    billingEvents: new SqliteBillingEventRepository(db),
    aiUsage: new SqliteAiUsageRepository(db),
    affiliateClicks: new SqliteAffiliateClickRepository(db),
    metrics: new SqliteMetricsRepository(db, clock),
    referrals: new SqliteReferralRepository(db),
    household: new SqliteHouseholdRepository(db),
  };

  const tokens = new JwtTokenService(
    config.jwt.accessSecret,
    config.jwt.accessTtl,
    config.jwt.refreshTtlMs,
    () => clock.now()
  );
  const hasher = overrides.hasher ?? new BcryptPasswordHasher(config.env === 'test' ? 4 : 12);
  const from = `${config.email.fromName} <${config.email.fromEmail}>`;
  const email =
    overrides.email ??
    (config.email.resendApiKey
      ? new ResendEmailSender(config.email.resendApiKey, from, config.appUrl)
      : new ConsoleEmailSender(config.appUrl, config.env === 'test'));
  const google = overrides.google ?? new GoogleOAuthIdentityVerifier(config.google.clientId);
  const ai = buildAi(config);
  const advisor = overrides.advisor !== undefined ? overrides.advisor : ai.advisor;
  const suggester =
    overrides.categorySuggester !== undefined ? overrides.categorySuggester : ai.suggester;
  const payments =
    overrides.payments ??
    (config.billing.stripe
      ? new StripeGateway(config.billing.stripe)
      : new DisabledPaymentGateway());
  const offerCatalog = overrides.offers ?? new JsonOfferCatalog(config.affiliatesFile);

  const entitlements = new EntitlementService(repos.subscriptions, clock);
  const allowance = new AiAllowance(
    repos.aiUsage,
    entitlements,
    uow,
    clock,
    config.ai.dailyNeuronBudget
  );

  const categoryResolver = new CategoryResolver(repos.categories);
  const accountResolver = new AccountResolver(repos.accounts, repos.settings);
  const materializer = new RecurringMaterializer(
    repos.rules,
    repos.transactions,
    repos.settings,
    accountResolver,
    uow,
    clock
  );

  const auth = new AuthService(
    repos.users,
    repos.refreshTokens,
    repos.categories,
    repos.accounts,
    repos.settings,
    hasher,
    tokens,
    email,
    google,
    entitlements,
    uow,
    clock,
    config.jwt.refreshTtlMs
  );
  const transactions = new TransactionService(
    repos.transactions,
    repos.accounts,
    repos.budgets,
    repos.rules,
    repos.settings,
    categoryResolver,
    accountResolver,
    materializer,
    uow,
    clock
  );

  return {
    db,
    config,
    clock,
    repos,
    email,
    auth,
    transactions,
    materializer,
    entitlements,
    referrals: new ReferralService(
      repos.referrals,
      entitlements,
      repos.metrics,
      clock,
      // First steps: 3 movements, a budget, a goal and an automation.
      (userId) =>
        repos.transactions.count(userId) >= 3 &&
        repos.budgets.listByUser(userId).length > 0 &&
        repos.goals.listByUser(userId).length > 0 &&
        repos.rules.listByUser(userId).length > 0
    ),
    household: new HouseholdService(repos.household, repos.users, entitlements, clock),
    allowance,
    payments,
    profile: new ProfileService(repos.users, repos.refreshTokens, hasher, auth, uow),
    settings: new SettingsService(
      repos.settings,
      repos.transactions,
      accountResolver,
      materializer,
      uow,
      clock
    ),
    categories: new CategoryService(repos.categories, categoryResolver, materializer, uow),
    accounts: new AccountService(
      repos.accounts,
      repos.transfers,
      repos.settings,
      accountResolver,
      entitlements,
      clock
    ),
    recurring: new RecurringService(
      repos.rules,
      repos.transactions,
      repos.settings,
      categoryResolver,
      accountResolver,
      materializer,
      entitlements,
      uow,
      clock
    ),
    alerts: new CustomAlertService(repos.alerts, categoryResolver, entitlements, clock),
    budgets: new BudgetService(repos.budgets, categoryResolver, entitlements, uow, clock),
    goals: new GoalService(
      repos.goals,
      repos.transactions,
      categoryResolver,
      entitlements,
      uow,
      clock
    ),
    stats: new StatsService(
      repos.transactions,
      repos.accounts,
      repos.settings,
      transactions,
      entitlements,
      repos.rules,
      clock
    ),
    advice: new AdviceService(
      transactions,
      repos.transactions,
      repos.budgets,
      repos.settings,
      repos.aiUsage,
      allowance,
      advisor,
      clock
    ),
    billing: new BillingService(
      repos.subscriptions,
      repos.billingEvents,
      repos.users,
      entitlements,
      allowance,
      payments,
      email,
      (userId) => ({
        accounts: repos.accounts.listByUser(userId).filter((a) => !a.archived).length,
        budgets: repos.budgets.listByUser(userId).length,
        goals: repos.goals.listByUser(userId).length,
        recurringRules: repos.rules.listByUser(userId).length,
        customAlerts: repos.alerts.listByUser(userId).length,
        movements: repos.transactions.count(userId),
      }),
      (userId) => repos.settings.get(userId).locale,
      uow,
      clock,
      {
        appUrl: config.appUrl,
        displayPrices: config.billing.displayPrices,
        founderLimit: config.billing.founderLimit,
        // Without Stripe config the gateway is either disabled or a test double.
        lifetimeConfigured: config.billing.stripe ? !!config.billing.stripe.prices.lifetime : true,
        metrics: repos.metrics,
      }
    ),
    offers: new OfferService(offerCatalog, repos.affiliateClicks, repos.settings, clock),
    importer: new ImportService(
      repos.transactions,
      repos.categories,
      categoryResolver,
      accountResolver,
      repos.settings,
      entitlements,
      new AiCategorizer(suggester, allowance),
      uow,
      clock
    ),
    exporter: new ExportService(
      repos.users,
      repos.settings,
      repos.accounts,
      repos.transfers,
      repos.categories,
      repos.transactions,
      repos.rules,
      repos.alerts,
      repos.budgets,
      repos.goals,
      clock
    ),
  };
}
