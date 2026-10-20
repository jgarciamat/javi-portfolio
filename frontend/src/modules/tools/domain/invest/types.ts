/**
 * The operations of any broker, exchange or fund manager in one shape, read on the device from the
 * files people download (see formats.ts). Everything here is data: the tax rules are in ledger.ts.
 */

/**
 * crypto: virtual currencies; shares: listed shares; etf: listed funds (ETF); fund: investment fund
 * units; bill: Spanish Treasury bills (Letras del Tesoro, capital mobiliario of box 0030); bond: bonds,
 * debentures and other fixed income (capital mobiliario of box 0031); derivative: CFDs, options, futures;
 * commodity: gold or silver of an app; fiat: euros, dollars... (never taxed as an asset).
 */
export type AssetClass =
  'crypto' | 'shares' | 'etf' | 'fund' | 'bill' | 'bond' | 'derivative' | 'commodity' | 'fiat';

/**
 * buy/sell: for money; swap: one asset for another (each crypto swap is a transmission, LIRPF art.
 * 37.1.h); reward: staking, lending, airdrops...; transferIn/Out: between own wallets (not taxed);
 * dividend, interest; custody: administration and custody fee (the only expense of art. 26.1.a);
 * switchOut/In: transfer between funds (art. 94); realized: a sale already matched by the platform
 * (closed position) with its own purchase; split: more units without a purchase; fee: coins paid as
 * a fee on their own (a network fee, a fee in a third coin); ignore: deposits of
 * money and lines without tax meaning.
 */
export type OpKind =
  | 'buy'
  | 'sell'
  | 'swap'
  | 'reward'
  | 'transferIn'
  | 'transferOut'
  | 'dividend'
  | 'interest'
  | 'custody'
  | 'switchOut'
  | 'switchIn'
  | 'realized'
  | 'split'
  | 'fee'
  | 'ignore';

/**
 * staking and lending: capital mobiliario (DGT V1766-22, V0648-24, V0612-26); airdrop, cashback,
 * referral, learn: gains that do not come from a transmission (NO CONFIRMADO, see ledger.ts); mining:
 * an economic activity when it is organised; fork: new coins without a cost (NO CONFIRMADO).
 */
export type RewardKind =
  'staking' | 'lending' | 'airdrop' | 'cashback' | 'referral' | 'learn' | 'mining' | 'fork';

/** One operation as read from a file. Amounts are positive; the kind says which way they go. */
export interface InvestOp {
  /** Unique in the import: file and row. */
  id: string;
  /** The format it was read with (formats.ts). */
  format: string;
  /** The platform or account it was read from: also where it is held (models 720 and 721). */
  account: string;
  /** Day (YYYY-MM-DD) and sortable moment (YYYY-MM-DDTHH:MM:SS) of the operation. */
  date: string;
  at: string;
  kind: OpKind;
  /** Ticker, coin or fund: what makes it homogeneous with other units (ISIN when there is one). */
  asset: string;
  assetClass: AssetClass;
  name?: string;
  isin?: string;
  units: number;
  /** What was paid or obtained, before the fee, in `currency`; null when the file does not say. */
  amount: number | null;
  currency: string | null;
  /** The same in euros when the file gives it (or after the exchange rate). */
  eur: number | null;
  fee: number;
  feeCurrency: string | null;
  /** swap and fund transfers: what was received. */
  toAsset?: string;
  toClass?: AssetClass;
  toUnits?: number;
  /** The market value in euros of what was received in a swap, when the file gives it. */
  toEur?: number | null;
  reward?: RewardKind;
  /** Tax withheld on a dividend or interest (in `currency`) and where. */
  withholding?: number;
  withheldIn?: 'origin' | 'spain';
  /** realized and switchIn with fiscal data: date and cost of the purchase (in `currency`). */
  acquired?: string;
  cost?: number;
  /** Words of the file the reading is based on, to show next to the row. */
  note?: string;
  /** The on-chain transaction: transfers of the same one are a swap (DeFi). */
  tx?: string;
  /** What a derivative is on (a CFD on shares or on a crypto pair). */
  underlying?: AssetClass;
  /** Box 1803 when the file says it: paid goods or services (B), got an NFT (O). */
  counterpart?: import('../rentaGains').Counterpart;
  /** The file does not give the fees (Binance's statement): the cost may be a little higher. */
  feesMissing?: boolean;
}

/** Something the person has to look at before taking the figures to the Renta. */
export interface InvestWarning {
  code:
    | 'missingPurchase'
    | 'missingPrice'
    | 'missingRate'
    | 'unmatchedTransfer'
    | 'transferWithoutOrigin'
    | 'stablecoinPrice'
    | 'mining'
    | 'fork'
    | 'derivative'
    | 'split'
    | 'realizedMatching'
    | 'switchWithoutPair'
    | 'switchInCost'
    | 'feeInCoins'
    | 'defi'
    | 'repurchase'
    | 'model721'
    | 'model720'
    | 'earlierYears'
    | 'lostAssets'
    | 'switchEtf'
    | 'inferredPrice'
    | 'noFees'
    | 'lossYears';
  asset?: string;
  opId?: string;
  /** An amount the message talks about (euros). */
  amount?: number;
}
