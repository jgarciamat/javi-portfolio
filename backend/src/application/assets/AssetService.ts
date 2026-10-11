import { randomUUID } from 'crypto';
import { NotFoundError, ValidationError } from '@domain/errors';
import { Asset, AssetKind, AssetRepository, UnitOfWork } from '@domain/ports/repositories';
import { Clock } from '@domain/ports/services';
import { Cents } from '@domain/shared/money';
import { toDateOnly, todayDateOnly } from '@domain/shared/period';
import { EntitlementService } from '@application/billing/EntitlementService';

export const MAX_ASSETS = 30;
export const ASSET_KINDS: AssetKind[] = ['investment', 'property', 'vehicle', 'other', 'debt'];

export interface AssetView {
  id: string;
  name: string;
  kind: AssetKind;
  /** Latest value, its date and the one before it (to show the change). */
  valueCents: Cents;
  valueDate: string | null;
  previousCents: Cents | null;
  history: { date: string; valueCents: Cents }[];
}

/** Investments, property and debts valued by hand (Premium, part of the net worth). */
export class AssetService {
  constructor(
    private readonly assets: AssetRepository,
    private readonly entitlements: EntitlementService,
    private readonly uow: UnitOfWork,
    private readonly clock: Clock
  ) {}

  list(userId: string): AssetView[] {
    this.entitlements.assertFeature(userId, 'insights');
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
        valueCents: last?.valueCents ?? 0,
        valueDate: last?.date ?? null,
        previousCents: history.length > 1 ? history[history.length - 2].valueCents : null,
        history,
      };
    });
  }

  create(
    userId: string,
    input: { name: string; kind: AssetKind; valueCents: Cents; date?: string | null }
  ): AssetView {
    this.entitlements.assertFeature(userId, 'insights');
    const name = input.name.trim();
    if (!name || name.length > 60)
      throw new ValidationError('El nombre debe tener entre 1 y 60 caracteres');
    if (this.assets.listByUser(userId).length >= MAX_ASSETS) {
      throw new ValidationError(`Máximo ${MAX_ASSETS} elementos`, 'TOO_MANY_ASSETS');
    }
    const asset: Asset = {
      id: randomUUID(),
      userId,
      name,
      kind: input.kind,
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
    this.entitlements.assertFeature(userId, 'insights');
    if (!this.assets.findById(userId, id)) {
      throw new NotFoundError('Elemento no encontrado', 'ASSET_NOT_FOUND');
    }
    this.setValueUnchecked(id, valueCents, date);
    return this.list(userId).find((a) => a.id === id) as AssetView;
  }

  delete(userId: string, id: string): void {
    this.entitlements.assertFeature(userId, 'insights');
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
