import { applyScale, computeRenta, type RentaInput } from '../rentaCalc';
import { campaignFor } from '../rentaCampaign';
import { addMonths, emptySavingsDetail, type PendingBalance } from '../rentaGains';
import { round2 } from '../round';

/**
 * «¿Puedo recuperar ese dinero?»: for each year with losses, whether they can still be used and how
 * (LIRPF art. 49: offset in the four following years, also up to 25 % of the capital income of the
 * savings base; LGT arts. 66 and 67: four years from the end of the filing period to correct a
 * return; LGT art. 120.3 and 122: corrective return, also out of time). BOE-A-2006-20764 and
 * BOE-A-2003-23186, checked 19-10-2026.
 */
export interface RecoverYear {
  year: number;
  loss: number;
  /** The last Renta where it can be offset (year + 4), and whether this Renta still is in time. */
  offsetUntil: number;
  offsettable: boolean;
  /** The last day to correct the Renta of that year (end of its filing period + 4 years). */
  correctUntil: string;
  correctable: boolean;
  /** How much better this Renta is with that loss among the earlier ones (null: not known). */
  now: number | null;
  /** The most a corrective return of that year could give back (tax of the savings on it). */
  correctUpTo: number;
}

/** The losses of earlier years to look at: from the files and typed, one per year (the larger). */
export function lossesToRecover(
  fromFiles: { year: number; result: number }[],
  typed: PendingBalance[],
  year: number
): PendingBalance[] {
  const by = new Map<number, number>();
  const add = (y: number, amount: number) => by.set(y, Math.max(by.get(y) ?? 0, round2(amount)));
  for (const f of fromFiles) if (f.year < year && f.result < 0) add(f.year, -f.result);
  for (const p of typed) if (p.year < year && p.amount > 0) add(p.year, p.amount);
  return [...by.entries()].sort((a, b) => a[0] - b[0]).map(([y, amount]) => ({ year: y, amount }));
}

/** What a loss of an earlier year can still give, on this Renta and by correcting its own. */
export function recoverOptions(
  losses: PendingBalance[],
  input: RentaInput | null,
  today: string
): RecoverYear[] {
  return losses.map(({ year, amount }) => {
    const current = input?.state.year ?? year + 1;
    const offsetUntil = year + 4;
    const offsettable = current <= offsetUntil;
    const correctUntil = addMonths(campaignFor(year).end, 48);
    let now: number | null = null;
    if (input && offsettable) {
      const detail = input.savingsDetail ?? emptySavingsDetail();
      const others = detail.pending.gains.filter((p) => p.year !== year);
      const run = (gains: PendingBalance[]) =>
        computeRenta({
          ...input,
          savingsDetail: { ...detail, pending: { ...detail.pending, gains } },
        }).result;
      now = round2(Math.max(0, run(others) - run([...others, { year, amount }])));
    }
    const scale = input?.extras.savingsScale;
    const correctUpTo = scale
      ? round2(applyScale(scale.state, amount) + applyScale(scale.regional, amount))
      : 0;
    return {
      year,
      loss: amount,
      offsetUntil,
      offsettable,
      correctUntil,
      correctable: today <= correctUntil,
      now,
      correctUpTo,
    };
  });
}
