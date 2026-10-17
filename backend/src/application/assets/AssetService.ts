import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '@domain/errors';
import { Asset, AssetKind, AssetRepository, UnitOfWork } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { Cents } from '@domain/shared/money';
import { toDateOnly, todayDateOnly } from '@domain/shared/period';
import { EntitlementService } from '@application/billing/EntitlementService';

export const MAX_ASSETS = 30;

export interface AssetView {
  id: string;
  name: string;
  kind: AssetKind;
  interestRate: number | null;
  minPaymentCents: Cents | null;
  /** Latest value, its date and the one before it (to show the change). */
  valueCents: Cents;
  valueDate: string | null;
  previousCents: Cents | null;
  history: { date: string; valueCents: Cents }[];
}

/** Investments, property and debts valued by hand (the free plan can keep one; part of the net worth). */
export class AssetService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  list(userId: string): AssetView[] {
    const values = this.assets.valuesByUser(userId);
    return this.assets.listByUser(userId).map((a) => {
      const history = values
        .filter((v) => v.assetId === a.id)
        .map((v) => ({ date: v.date, valueCents: v.valueCents }));
      const last = history[history.length - 1];
      return {
        id: a.id,
        name: a.name,
        kind: a.kind,
        interestRate: a.interestRate,
        minPaymentCents: a.minPaymentCents,
        valueCents: last?.valueCents ?? 0,
        valueDate: last?.date ?? null,
        previousCents: history.length > 1 ? history[history.length - 2].valueCents : null,
        history,
      };
    });
  }

  create(
    userId: string,
    input: {
      name: string;
      kind: AssetKind;
      valueCents: Cents;
      date?: string | null;
      interestRate?: number | null;
      minPaymentCents?: Cents | null;
    }
  ): AssetView {
    const name = input.name.trim();
    if (!name || name.length > 60)
      throw new ValidationError('El nombre debe tener entre 1 y 60 caracteres');
    const count = this.assets.listByUser(userId).length;
    this.entitlements.assertCanCreate(userId, 'assets', count);
    if (count >= MAX_ASSETS) {
      throw new ValidationError(`Máximo ${MAX_ASSETS} elementos`, 'TOO_MANY_ASSETS');
    }
    const asset: Asset = {
      id: randomUUID(),
      userId,
      name,
      kind: input.kind,
      interestRate: input.kind === 'debt' ? input.interestRate ?? null : null,
      minPaymentCents: input.kind === 'debt' ? input.minPaymentCents ?? null : null,
      createdAt: this.clock.now().toISOString(),
    };
    this.uow.run(() => {
      this.assets.save(asset);
      this.setValueUnchecked(asset.id, input.valueCents, input.date);
    });
    return this.list(userId).find((a) => a.id === asset.id) as AssetView;
  }

  /** Records what the asset is worth on a date (today by default). */
  setValue(userId: string, id: string, valueCents: Cents, date?: string | null): AssetView {
    if (!this.assets.findById(userId, id)) {
      throw new NotFoundError('Elemento no encontrado', 'ASSET_NOT_FOUND');
    }
    this.setValueUnchecked(id, valueCents, date);
    return this.list(userId).find((a) => a.id === id) as AssetView;
  }

  /** Interest rate and minimum payment of a debt. */
  setTerms(
    userId: string,
    id: string,
    terms: { interestRate: number | null; minPaymentCents: Cents | null }
  ): AssetView {
    const asset = this.assets.findById(userId, id);
    if (!asset) throw new NotFoundError('Elemento no encontrado', 'ASSET_NOT_FOUND');
    if (asset.kind !== 'debt') throw new ValidationError('Solo las deudas tienen condiciones');
    this.assets.save({ ...asset, ...terms });
    return this.list(userId).find((a) => a.id === id) as AssetView;
  }

  delete(userId: string, id: string): void {
    if (!this.assets.delete(userId, id)) {
      throw new NotFoundError('Elemento no encontrado', 'ASSET_NOT_FOUND');
    }
  }

  private setValueUnchecked(assetId: string, valueCents: Cents, date?: string | null): void {
    this.assets.setValue({
      assetId,
      date: date ? toDateOnly(date) : todayDateOnly(this.clock.now()),
      valueCents,
    });
  }
}
