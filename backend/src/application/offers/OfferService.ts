import { NotFoundError } from '@domain/errors';
import { AffiliateClickRepository, SettingsRepository } from '@domain/ports/repositories';
import { AffiliateOffer, Clock, OfferCatalog } from '@domain/ports/services';

/**
 * Curated partner offers (affiliate links). They live in their own section, are
 * always labelled as sponsored and the user can hide them in the settings.
 */
export class OfferService {
  constructor(
    private readonly catalog: OfferCatalog,
    private readonly clicks: AffiliateClickRepository,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  list(userId: string): { enabled: boolean; offers: AffiliateOffer[] } {
    const enabled = this.settings.get(userId).showOffers;
    return { enabled, offers: enabled ? this.catalog.list().filter((o) => o.active) : [] };
  }

  /** Records the click and returns where to send the user. */
  click(userId: string, offerId: string): { url: string } {
    const offer = this.catalog.list().find((o) => o.id === offerId && o.active);
    if (!offer) throw new NotFoundError('Oferta no encontrada', 'OFFER_NOT_FOUND');
    this.clicks.record(userId, offer.id, this.clock.now());
    return { url: offer.url };
  }
}
