import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { TransactionType } from '@modules/finances/domain/types';
import {
  TYPE_BADGE_CLASS,
  TYPE_COLORS,
  TYPE_LABEL_KEYS,
  amountSign,
} from '@modules/finances/domain/transactionTypes';

export function TypeBadge({ type }: { type: TransactionType }) {
  const { t } = useI18n();
  return <span className={TYPE_BADGE_CLASS[type]}>{t(TYPE_LABEL_KEYS[type])}</span>;
}

/** "−12,00 €" in red, "+12,00 €" in green or purple. */
export function SignedAmount({
  type,
  amount,
  className,
}: {
  type: TransactionType;
  amount: number;
  className?: string;
}) {
  const { money } = useFormat();
  return (
    <span className={className} style={{ color: TYPE_COLORS[type] }}>
      {amountSign(type)}
      {money(Math.abs(amount))}
    </span>
  );
}
