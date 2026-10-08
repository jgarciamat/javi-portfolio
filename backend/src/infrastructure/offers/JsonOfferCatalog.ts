import fs from 'fs';
import { z } from 'zod';
import { AffiliateOffer, OfferCatalog } from '@domain/ports/services';

const text = z.object({ es: z.string().min(1).max(300), en: z.string().min(1).max(300) });

const offerSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, 'id: lowercase letters, digits and dashes'),
  category: z.enum(['savings', 'investing', 'banking', 'insurance', 'other']),
  name: z.string().min(1).max(60),
  icon: z.string().max(8).default('🏷️'),
  title: text,
  description: text,
  highlight: text.nullable().default(null),
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'url must use https'),
  active: z.boolean().default(true),
});

/**
 * Offers read once from a JSON file (AFFILIATES_FILE), so the partner list can be
 * changed without a new build. A missing or invalid file means "no offers".
 */
export class JsonOfferCatalog implements OfferCatalog {
  private readonly offers: AffiliateOffer[];

  constructor(file: string | null, logger: Pick<Console, 'warn'> = console) {
    this.offers = JsonOfferCatalog.load(file, logger);
  }

  static load(file: string | null, logger: Pick<Console, 'warn'>): AffiliateOffer[] {
    if (!file) return [];
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
      const offers = z.array(offerSchema).parse(raw);
      const ids = new Set<string>();
      return offers.filter((o) => {
        if (ids.has(o.id)) {
          logger.warn(`[offers] duplicated id "${o.id}" ignored`);
          return false;
        }
        ids.add(o.id);
        return true;
      });
    } catch (e) {
      logger.warn(`[offers] could not load ${file}: ${(e as Error).message}`);
      return [];
    }
  }

  list(): AffiliateOffer[] {
    return this.offers;
  }
}

export class StaticOfferCatalog implements OfferCatalog {
  constructor(private readonly offers: AffiliateOffer[] = []) {}
  list(): AffiliateOffer[] {
    return this.offers;
  }
}
