import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import type { AutonomoDraft, TaxBox } from '@modules/finances/domain/types';

type Translate = ReturnType<typeof useI18n>['t'];
type Money = ReturnType<typeof useFormat>['money'];

const box = (boxes: TaxBox[], id: string): number => boxes.find((b) => b.box === id)?.amount ?? 0;

/** "a", "a y b", "a, b y c" in the language of the app. */
function list(t: Translate, parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')}${t('app.autonomo.explain.and')}${
    parts[parts.length - 1]
  }`;
}

/** The modelo 303 in one sentence: what was charged, what can be deducted, what is left. */
function vatSentence(t: Translate, money: Money, vat: AutonomoDraft['vat']): string {
  const key = (k: string) => `app.autonomo.explain.vat.${k}`;
  const accrued = money(box(vat.accrued, '27'));
  const deductible = money(box(vat.deductible, '45'));
  const applied = box(vat.settlement, '78');
  const before = money(box(vat.settlement, '46'));
  const due = money(Math.abs(vat.amountDue));
  switch (vat.result) {
    case 'noActivity':
      return t(key('noActivity'));
    case 'offset':
      return t(key('offset'), { due, accrued, deductible });
    case 'refund':
      return t(key('refund'), { due, accrued, deductible });
    case 'zero':
      return applied > 0
        ? t(key('zeroApplied'), { before, applied: money(applied) })
        : t(key('zero'), { accrued, deductible });
    default: {
      const pay = t(key('pay'), { due, accrued, deductible });
      return applied > 0 ? `${pay} ${t(key('applied'), { before, applied: money(applied) })}` : pay;
    }
  }
}

/** The modelo 130 in one sentence: 20 % of the profit so far, less what has already been paid. */
function irpfSentence(t: Translate, money: Money, irpf: AutonomoDraft['irpf']): string {
  const key = (k: string) => `app.autonomo.explain.irpf.${k}`;
  if (!irpf.required) return t(key('notRequired'));
  const b = (id: string) => box(irpf.boxes, id);
  if (b('01') === 0 && b('02') === 0) return t(key('noActivity'));
  const parts = (
    [
      ['paid', b('05')],
      ['withheld', b('06')],
      ['reduction', b('13')],
      ['negatives', b('15')],
    ] as const
  )
    .filter(([, amount]) => amount > 0)
    .map(([part, amount]) => t(`app.autonomo.explain.part.${part}`, { amount: money(amount) }));
  const net = money(b('03'));
  const due = money(Math.abs(irpf.amountDue));
  switch (irpf.result) {
    case 'negative':
      return t(key('negative'), { due, reduction: money(b('13')) });
    case 'zero':
      return b('03') <= 0 || parts.length === 0
        ? t(key('noProfit'), { income: money(b('01')), expenses: money(b('02')) })
        : t(key('zeroCovered'), { net, fourth: money(b('04')), parts: list(t, parts) });
    default:
      return t(key('pay'), {
        due,
        net,
        minus: parts.length > 0 ? t(key('minus'), { parts: list(t, parts) }) : '',
      });
  }
}

/** Both forms explained in plain words, with the figures of the draft. */
export function explainDraft(
  t: Translate,
  money: Money,
  draft: Pick<AutonomoDraft, 'vat' | 'irpf'>
) {
  return { vat: vatSentence(t, money, draft.vat), irpf: irpfSentence(t, money, draft.irpf) };
}

export function AutonomoExplain({ draft }: { draft: AutonomoDraft }) {
  const { t } = useI18n();
  const { money } = useFormat();
  const { vat, irpf } = explainDraft(t, money, draft);
  return (
    <div className="autonomo-explain">
      <h4>{t('app.autonomo.explain.title')}</h4>
      <p>{vat}</p>
      <p>{irpf}</p>
    </div>
  );
}
