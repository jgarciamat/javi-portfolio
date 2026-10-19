/** The dates of a Renta campaign: the return of a tax year is filed in spring of the next one. */
export interface RentaCampaign {
  /** The tax year (ejercicio) the return is for. */
  exercise: number;
  /** Filing online (Renta WEB, the app) and the draft: from this day. */
  start: string;
  /** Appointments for help by phone ("Le Llamamos"), and the first day of that help. */
  phoneAppointments: string;
  phoneStart: string;
  /** Appointments for help at an office, and the first day of that help. */
  officeAppointments: string;
  officeStart: string;
  /** Last day to file a return to pay with direct debit of the payment. */
  directDebitEnd: string;
  /** Last day to file, to pay or to be refunded. */
  end: string;
  /** Published by the Tax Agency; false: the usual dates, still to be confirmed. */
  confirmed: boolean;
  source: string;
  /** When the dates were last checked against the source. */
  checkedOn: string;
}

/**
 * Renta 2025, filed in 2026: Agencia Tributaria, "Fechas de campaña de Renta y Patrimonio"
 * (calendario del contribuyente 2026) and the news "Inicio Campaña Renta y Patrimonio 2025"
 * of 8 April 2026, which gives the end of the direct debit on 25 June.
 */
const CAMPAIGNS: RentaCampaign[] = [
  {
    exercise: 2025,
    start: '2026-04-08',
    phoneAppointments: '2026-04-29',
    phoneStart: '2026-05-06',
    officeAppointments: '2026-05-29',
    officeStart: '2026-06-01',
    directDebitEnd: '2026-06-25',
    end: '2026-06-30',
    confirmed: true,
    source:
      'https://sede.agenciatributaria.gob.es/Sede/ayuda/contenidos-lectura-facil/calendario-contribuyente-2026-simplificado-personas-fisicas/fechas-campana-renta-patrimonio.html',
    checkedOn: '2026-10-19',
  },
];

const RENTA = 'https://sede.agenciatributaria.gob.es/Sede/Renta.html';

/** A known campaign, or the usual dates of the last one a year later, marked as expected. */
export function campaignFor(exercise: number): RentaCampaign {
  const known = CAMPAIGNS.find((c) => c.exercise === exercise);
  if (known) return known;
  const last = CAMPAIGNS[CAMPAIGNS.length - 1];
  const shift = exercise - last.exercise;
  const moved = (iso: string) => `${Number(iso.slice(0, 4)) + shift}${iso.slice(4)}`;
  return {
    exercise,
    start: moved(last.start),
    phoneAppointments: moved(last.phoneAppointments),
    phoneStart: moved(last.phoneStart),
    officeAppointments: moved(last.officeAppointments),
    officeStart: moved(last.officeStart),
    directDebitEnd: moved(last.directDebitEnd),
    end: moved(last.end),
    confirmed: false,
    source: RENTA,
    checkedOn: last.checkedOn,
  };
}

const DAY = 24 * 60 * 60 * 1000;

/** Whole days from today to a date (negative when it has passed), by the calendar of the device. */
export function daysUntil(iso: string, today: Date): number {
  const [y, m, d] = iso.split('-').map(Number);
  const from = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((Date.UTC(y, m - 1, d) - from) / DAY);
}

export type CampaignPhase = 'before' | 'open' | 'closed';

export function campaignPhase(c: RentaCampaign, today: Date): CampaignPhase {
  if (daysUntil(c.start, today) > 0) return 'before';
  return daysUntil(c.end, today) >= 0 ? 'open' : 'closed';
}
