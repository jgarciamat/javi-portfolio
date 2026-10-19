import {
  brokerClass,
  cleanAsset,
  FIAT,
  fromTo,
  splitPair,
  type FormatSpec,
  type TypeRule,
} from './read';
import { norm, parseMoney } from './text';
import type { InvestOp } from './types';

/**
 * The exports we recognise, by their header row. Columns come from each platform's public help pages
 * (URL in `docs`). `confirmed: null` means NO CONFIRMADO: the columns were not checked against a
 * current real export, so the import shows every row for the person to check. Any other CSV goes
 * through the guided column mapping (mapping.ts).
 */

const base = {
  locale: 'en' as const,
  order: 'dmy' as const,
  confirmed: null,
  shape: 'rows' as const,
  types: [] as TypeRule[],
};

/** Words of English and Spanish exports that mean the same everywhere. */
const COMMON: TypeRule[] = [
  [/staking|stake reward|rewards? income|inflation reward|delegat.*reward/, 'reward', 'staking'],
  [/learn|coinbase earn/, 'reward', 'learn'],
  [/airdrop|distribution|hard ?fork/, 'reward', 'airdrop'],
  [/cashback|cash back|reimbursement/, 'reward', 'cashback'],
  [/referral|affiliate|bonus|rebate/, 'reward', 'referral'],
  [/interest|interes|earn/, 'reward', 'lending'],
  [/mining/, 'reward', 'mining'],
  [/convert|exchange|swap|trade|intercambio|permuta/, 'swap'],
  [/\bbuy\b|bought|purchase|compra|suscripcion/, 'buy'],
  [/\bsell\b|\bsold\b|venta|reembolso/, 'sell'],
  [/receive|deposit|recibid|ingreso|incoming|\bin\b/, 'transferIn'],
  [/send|withdraw|envio|retirada|outgoing|\bout\b/, 'transferOut'],
];

const one = (op: InvestOp): InvestOp[] => [op];

/** What the row says, or nothing. */
const amt = (op: InvestOp) => op.amount ?? 0;

/** A row of tax withheld on a dividend: its amount is the withholding, not income. */
const taxRow = (op: InvestOp): InvestOp[] =>
  one({ ...op, kind: 'dividend', units: 0, withholding: amt(op), amount: 0 });

// ─── Crypto ───────────────────────────────────────────────────────────────────

const binanceHistory: FormatSpec = {
  ...base,
  id: 'binance-history',
  platform: 'Binance',
  file: 'Historial de transacciones (Wallet → Transaction History)',
  category: 'crypto',
  docs: 'https://www.binance.com/en/support/faq/how-to-generate-transaction-history-statement-e4ff64f2533f4d23a0b3f8f17f510eab',
  signature: ['utc_time', 'operation', 'coin', 'change'],
  shape: 'legs',
  defaultClass: 'crypto',
  columns: {
    date: ['utc_time'],
    type: ['operation'],
    asset: ['coin'],
    units: ['change'],
    group: ['__none__'],
  },
  types: [
    [
      /subscription|redemption|transfer between|funding|main and|to pool|from pool|staking purchase/,
      'ignore',
    ],
    [/fee/, 'fee'],
    [/^deposit|^withdraw|fiat deposit|fiat withdraw/, 'transferIn'],
    [/small assets exchange|convert|transaction|^buy|^sell|otc|p2p/, 'swap'],
    ...COMMON,
  ],
};

const binanceTrades: FormatSpec = {
  ...base,
  id: 'binance-trades',
  platform: 'Binance',
  file: 'Historial de operaciones spot (Trade History)',
  category: 'crypto',
  docs: 'https://www.binance.com/en/support/faq/how-to-download-spot-trading-transaction-history-statement-e4ff64f2533f4d23a0b3f8f17f510eab',
  signature: ['date(utc)', 'pair', 'side', 'executed'],
  defaultClass: 'crypto',
  columns: {
    date: ['date(utc)'],
    side: ['side'],
    pair: ['pair'],
    units: ['executed'],
    amount: ['amount'],
    fee: ['fee'],
  },
  types: [
    [/buy/, 'buy'],
    [/sell/, 'sell'],
  ],
  // "0.5BTC", "15000USDT", "0.001BNB": the asset is written next to each number.
  row: (r, op) => {
    const units = parseMoney(r.cell('units'), 'en');
    const amount = parseMoney(r.cell('amount'), 'en');
    const pair = splitPair(r.text('pair')) as [string, string];
    const buy = /buy/i.test(r.text('side'));
    const asset = units.currency ?? pair[0];
    const quote = amount.currency ?? pair[1];
    return one(
      fromTo({
        ...op,
        kind: 'swap',
        asset: buy ? quote : asset,
        units: buy ? amount.value : units.value,
        toAsset: buy ? asset : quote,
        toUnits: buy ? units.value : amount.value,
        amount: null,
        currency: null,
        assetClass: FIAT.has(buy ? quote : asset) ? 'fiat' : 'crypto',
      })
    );
  },
};

const coinbase: FormatSpec = {
  ...base,
  id: 'coinbase',
  platform: 'Coinbase',
  file: 'Historial de transacciones (Informes → Generar informe)',
  category: 'crypto',
  docs: 'https://help.coinbase.com/en/coinbase/taxes-reports-and-financial-services/taxes/generate-reports',
  signature: ['timestamp', 'transaction type', 'asset', 'quantity transacted'],
  defaultClass: 'crypto',
  columns: {
    date: ['timestamp'],
    type: ['transaction type'],
    asset: ['asset'],
    units: ['quantity transacted'],
    currency: ['price currency', 'spot price currency'],
    amount: ['subtotal'],
    fee: ['fees and/or spread', 'fees'],
    note: ['notes'],
  },
  types: [
    [
      /retail (staking|unstaking)|eth2|pro (deposit|withdrawal)|exchange (deposit|withdrawal)/,
      'ignore',
    ],
    [/^deposit$|^withdrawal$/, 'ignore'],
    ...COMMON,
  ],
  // "Converted 0.01 BTC to 0.15 ETH": the coin received is only in the notes.
  row: (r, op) => {
    const typed = coinbase.types.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed) return null;
    const next: InvestOp = { ...op, kind: typed[1], reward: typed[2] };
    const m = /converted ([\d.,]+) (\w+) to ([\d.,]+) (\w+)/i.exec(r.text('note'));
    if (next.kind === 'swap' && m) {
      next.toAsset = m[4].toUpperCase();
      next.toUnits = Number(m[3].replace(/,/g, ''));
      next.toClass = 'crypto';
    }
    return one(next);
  },
};

const coinbasePro: FormatSpec = {
  ...base,
  id: 'coinbase-pro',
  platform: 'Coinbase Pro / Advanced',
  file: 'Fills (órdenes ejecutadas)',
  category: 'crypto',
  docs: 'https://help.coinbase.com/en/exchange/managing-my-account/how-to-generate-reports',
  signature: ['trade id', 'product', 'side', 'created at', 'size'],
  defaultClass: 'crypto',
  columns: {
    date: ['created at'],
    side: ['side'],
    pair: ['product'],
    units: ['size'],
    price: ['price'],
    fee: ['fee'],
    feeCurrency: ['price/fee/total unit'],
  },
  types: [
    [/buy/, 'buy'],
    [/sell/, 'sell'],
  ],
};

const KRAKEN_TYPES: TypeRule[] = [
  [/^(staking|earn)/, 'reward', 'staking'],
  [/^(deposit|withdrawal)/, 'transferIn'],
  [/^(transfer|margin|rollover|settled|adjustment|credit)/, 'ignore'],
  [/^(trade|spend|receive|sale)/, 'swap'],
];

const krakenLedgers: FormatSpec = {
  ...base,
  id: 'kraken-ledgers',
  platform: 'Kraken',
  file: 'Ledgers (Historial → Exportar → Ledgers)',
  category: 'crypto',
  docs: 'https://support.kraken.com/hc/en-us/articles/360001169383-How-to-interpret-Ledger-history-fields',
  signature: ['refid', 'time', 'type', 'asset', 'amount', 'fee'],
  shape: 'legs',
  defaultClass: 'crypto',
  columns: {
    date: ['time'],
    type: ['type'],
    asset: ['asset'],
    units: ['amount'],
    fee: ['fee'],
    group: ['refid'],
  },
  types: KRAKEN_TYPES,
  // Kraken writes each leg's fee in the same row: it is paid in that asset.
  row: (r) => {
    const subtype = norm(r.byHeader('subtype'));
    if (/allocation|migration|spottostaking|stakingfromspot|spotfromstaking/.test(subtype))
      return [];
    return undefined;
  },
};

const krakenTrades: FormatSpec = {
  ...base,
  id: 'kraken-trades',
  platform: 'Kraken',
  file: 'Trades (Historial → Exportar → Trades)',
  category: 'crypto',
  docs: 'https://support.kraken.com/hc/en-us/articles/360001184886-How-to-interpret-Trades-history-fields',
  signature: ['txid', 'ordertxid', 'pair', 'time', 'type', 'vol'],
  defaultClass: 'crypto',
  columns: {
    date: ['time'],
    side: ['type'],
    pair: ['pair'],
    units: ['vol'],
    amount: ['cost'],
    fee: ['fee'],
  },
  types: [
    [/buy/, 'buy'],
    [/sell/, 'sell'],
  ],
  row: (r, op) => {
    const [asset, quote] = splitPair(r.text('pair')) as [string, string];
    const quoteAsset = cleanAsset(quote);
    const kind = /buy/i.test(r.text('side')) ? 'buy' : 'sell';
    const next = { ...op, asset: cleanAsset(asset), currency: quoteAsset, feeCurrency: quoteAsset };
    if (FIAT.has(quoteAsset)) return one({ ...next, kind, assetClass: 'crypto' });
    // Quoted in another coin (ETH/BTC): a swap.
    return one({
      ...next,
      kind: 'swap',
      asset: kind === 'buy' ? quoteAsset : next.asset,
      units: kind === 'buy' ? amt(op) : op.units,
      toAsset: kind === 'buy' ? next.asset : quoteAsset,
      toUnits: kind === 'buy' ? op.units : amt(op),
      amount: null,
      currency: null,
      assetClass: 'crypto',
      toClass: 'crypto',
    });
  },
};

const bitpanda: FormatSpec = {
  ...base,
  id: 'bitpanda',
  platform: 'Bitpanda',
  file: 'Historial de transacciones (CSV)',
  category: 'crypto',
  docs: 'https://support.bitpanda.com/hc/en-us/articles/360000727459-Where-can-I-find-my-transaction-history',
  signature: ['transaction id', 'timestamp', 'transaction type', 'in/out', 'amount fiat'],
  defaultClass: 'crypto',
  columns: {
    date: ['timestamp'],
    type: ['transaction type'],
    asset: ['asset'],
    units: ['amount asset'],
    amount: ['amount fiat'],
    currency: ['fiat'],
    fee: ['fee'],
    feeCurrency: ['fee asset'],
    class: ['asset class'],
  },
  types: [
    [/^deposit|^withdrawal/, 'transferIn'],
    [/reward|staking/, 'reward', 'staking'],
    ...COMMON,
  ],
  row: (r, op) => {
    const type = norm(r.text('type'));
    const incoming = /incoming/i.test(String(r.byHeader('in/out')));
    const cls = norm(r.text('class'));
    const assetClass = /fiat/.test(cls)
      ? 'fiat'
      : /crypto/.test(cls)
      ? 'crypto'
      : /metal|commodit/.test(cls)
      ? 'commodity'
      : /deriv/.test(cls)
      ? 'derivative'
      : /etf/.test(cls)
      ? 'etf'
      : 'shares';
    const next = { ...op, assetClass } as InvestOp;
    if (assetClass === 'fiat') return [];
    if (/buy/.test(type)) return one({ ...next, kind: 'buy' });
    if (/sell/.test(type)) return one({ ...next, kind: 'sell' });
    if (/reward|staking/.test(type)) return one({ ...next, kind: 'reward', reward: 'staking' });
    return one({ ...next, kind: incoming ? 'transferIn' : 'transferOut' });
  },
};

/** From/to rows (Bit2Me, Nexo, Crypto.com): what was given and what was received in one row. */
const fromToRow =
  (rules: TypeRule[]) =>
  (r: import('./read').RowReader, op: InvestOp): InvestOp[] | null => {
    const found = rules.find(([re]) => re.test(norm(r.text('type'))));
    if (!found || found[1] === 'ignore') return found ? [] : null;
    const [kind, reward] = [found[1], found[2]];
    const units = Math.abs(r.num('units'));
    const toUnits = Math.abs(r.num('toUnits'));
    const toAsset = r.text('toAsset') ? cleanAsset(r.text('toAsset')) : '';
    const money = r.money('amount');
    const eurish = {
      amount: Number.isFinite(money.value) ? Math.abs(money.value) : null,
      currency: op.currency ?? money.currency,
    };
    if (kind === 'reward' || kind === 'transferIn' || kind === 'transferOut') {
      // Rewards and transfers name the asset received (or sent) in the "to" columns when there are.
      const asset = toAsset || op.asset;
      const dir = kind === 'reward' ? kind : r.num('units') < 0 ? 'transferOut' : kind;
      return one({ ...op, ...eurish, kind: dir, reward, asset, units: toUnits || units });
    }
    if (!toAsset) return one({ ...op, ...eurish, kind, units, reward });
    return one(fromTo({ ...op, ...eurish, kind: 'swap', units, toAsset, toUnits }));
  };

const CRYPTOCOM_TYPES: TypeRule[] = [
  [/lockup|crypto_earn_program|to_exchange_transfer|exchange_to_crypto|dust_conversion/, 'ignore'],
  [/cashback|reimbursement/, 'reward', 'cashback'],
  [/referral/, 'reward', 'referral'],
  [/earn_interest|interest/, 'reward', 'lending'],
  [/stake|staking|supercharger/, 'reward', 'staking'],
  [/withdrawal/, 'transferOut'],
  [/deposit/, 'transferIn'],
  [/crypto_purchase|viban_purchase|recurring_buy/, 'buy'],
  [/exchange|viban/, 'swap'],
];

const cryptocom: FormatSpec = {
  ...base,
  id: 'cryptocom',
  platform: 'Crypto.com App',
  file: 'Historial de transacciones de la App (Crypto Wallet)',
  category: 'crypto',
  docs: 'https://help.crypto.com/en/articles/3511424-how-to-export-transaction-history',
  signature: ['timestamp (utc)', 'transaction description', 'currency', 'native amount'],
  defaultClass: 'crypto',
  columns: {
    date: ['timestamp (utc)'],
    type: ['transaction kind'],
    asset: ['currency'],
    units: ['amount'],
    toAsset: ['to currency'],
    toUnits: ['to amount'],
    amount: ['native amount'],
    currency: ['native currency'],
    note: ['transaction description'],
  },
  types: CRYPTOCOM_TYPES,
  row: (r, op) => {
    const ops = fromToRow(CRYPTOCOM_TYPES)(r, op);
    // A card purchase or a reward with a negative amount (reverted) takes it back: a sale at 0.
    return (
      ops?.map((o) =>
        o.kind === 'reward' && r.num('units') < 0 ? { ...o, kind: 'fee' as const } : o
      ) ?? null
    );
  },
};

const NEXO_TYPES: TypeRule[] = [
  [
    /locking|unlocking|transfer (in|out)|exchange deposited|deposit to exchange|repayment|loan/,
    'ignore',
  ],
  [/cashback/, 'reward', 'cashback'],
  [/referral|bonus/, 'reward', 'referral'],
  [/interest/, 'reward', 'lending'],
  [/top up crypto|purchase/, 'buy'],
  [/exchange|sell order|liquidation/, 'swap'],
  [/withdrawal/, 'transferOut'],
  [/deposit/, 'transferIn'],
];

const nexo: FormatSpec = {
  ...base,
  id: 'nexo',
  platform: 'Nexo',
  file: 'Transacciones (Account → Transactions → Export)',
  category: 'crypto',
  docs: 'https://support.nexo.com/article/how-to-export-transaction-history',
  signature: ['transaction', 'type', 'input currency', 'output currency', 'usd equivalent'],
  defaultClass: 'crypto',
  columns: {
    date: ['date / time'],
    type: ['type'],
    asset: ['input currency'],
    units: ['input amount'],
    toAsset: ['output currency'],
    toUnits: ['output amount'],
    amount: ['usd equivalent'],
    note: ['details'],
  },
  types: NEXO_TYPES,
  row: (r, op) => fromToRow(NEXO_TYPES)(r, { ...op, currency: 'USD' }),
};

const BIT2ME_TYPES: TypeRule[] = [
  [/staking|earn|recompensa/, 'reward', 'staking'],
  [/cashback/, 'reward', 'cashback'],
  [/deposito|ingreso|recibid/, 'transferIn'],
  [/retirada|envio|enviad/, 'transferOut'],
  [/compra|venta|intercambio|conversion|swap|exchange/, 'swap'],
];

const bit2me: FormatSpec = {
  ...base,
  id: 'bit2me',
  platform: 'Bit2Me',
  file: 'Movimientos (Monedero → Descargar)',
  category: 'crypto',
  docs: 'https://ayuda.bit2me.com/',
  locale: 'es',
  signature: ['fecha', 'tipo', 'moneda origen', 'moneda destino'],
  defaultClass: 'crypto',
  columns: {
    date: ['fecha'],
    type: ['tipo'],
    asset: ['moneda origen'],
    units: ['cantidad origen', 'importe origen'],
    toAsset: ['moneda destino'],
    toUnits: ['cantidad destino', 'importe destino'],
    fee: ['comision'],
    feeCurrency: ['moneda comision'],
  },
  types: BIT2ME_TYPES,
  row: fromToRow(BIT2ME_TYPES),
};

const pairTrade =
  (feeInBaseOnBuy: boolean) =>
  (r: import('./read').RowReader, op: InvestOp): InvestOp[] | null => {
    const pair = splitPair(r.text('pair'));
    if (!pair) return null;
    const [asset, quote] = pair.map(cleanAsset);
    const buy = /buy|compra/i.test(`${r.text('side')} ${r.text('type')}`);
    const amount = op.amount ?? op.units * Math.abs(r.num('price'));
    const feeCurrency = op.feeCurrency ?? (buy && feeInBaseOnBuy ? asset : quote);
    if (FIAT.has(quote))
      return one({
        ...op,
        kind: buy ? 'buy' : 'sell',
        asset,
        amount,
        currency: quote,
        feeCurrency,
      });
    return one({
      ...op,
      kind: 'swap',
      asset: buy ? quote : asset,
      units: buy ? amount : op.units,
      toAsset: buy ? asset : quote,
      toUnits: buy ? op.units : amount,
      amount: null,
      currency: null,
      feeCurrency,
      assetClass: 'crypto',
      toClass: 'crypto',
    });
  };

const kucoin: FormatSpec = {
  ...base,
  id: 'kucoin',
  platform: 'KuCoin',
  file: 'Historial de órdenes spot (Order History → Export)',
  category: 'crypto',
  docs: 'https://www.kucoin.com/support/900005389563',
  signature: ['symbol', 'side', 'filled amount', 'filled volume'],
  defaultClass: 'crypto',
  columns: {
    date: ['filled time(utc)', 'order time(utc)', 'filled time'],
    side: ['side'],
    pair: ['symbol'],
    units: ['filled amount'],
    amount: ['filled volume'],
    fee: ['fee'],
    feeCurrency: ['fee currency'],
  },
  row: pairTrade(false),
};

const kucoinOld: FormatSpec = {
  ...kucoin,
  id: 'kucoin-old',
  file: 'Historial de operaciones (formato anterior)',
  signature: ['tradecreatedat', 'symbol', 'side', 'size', 'funds'],
  columns: {
    date: ['tradecreatedat'],
    side: ['side'],
    pair: ['symbol'],
    units: ['size'],
    amount: ['funds'],
    fee: ['fee'],
    feeCurrency: ['feecurrency'],
  },
};

const bybit: FormatSpec = {
  ...base,
  id: 'bybit',
  platform: 'Bybit',
  file: 'Historial de operaciones spot',
  category: 'crypto',
  docs: 'https://www.bybit.com/en/help-center/article/How-to-export-your-trade-history',
  signature: ['spot pairs', 'direction', 'filled value', 'filled quantity'],
  defaultClass: 'crypto',
  columns: {
    date: ['timestamp (utc)', 'timestamp'],
    side: ['direction'],
    pair: ['spot pairs'],
    units: ['filled quantity'],
    amount: ['filled value'],
    price: ['filled price'],
    fee: ['fees', 'trading fee'],
    feeCurrency: ['fee currency'],
  },
  row: pairTrade(true),
};

const okx: FormatSpec = {
  ...base,
  id: 'okx',
  platform: 'OKX',
  file: 'Historial de operaciones (Trading history → Download)',
  category: 'crypto',
  docs: 'https://www.okx.com/help/how-do-i-export-my-transaction-history',
  signature: ['order id', 'trade type', 'symbol', 'action', 'filled price'],
  defaultClass: 'crypto',
  columns: {
    date: ['time'],
    side: ['action'],
    pair: ['symbol'],
    units: ['amount'],
    price: ['filled price'],
    fee: ['fee'],
    feeCurrency: ['fee unit'],
  },
  row: (r, op) => pairTrade(true)(r, { ...op, amount: null }),
};

const bitvavo: FormatSpec = {
  ...base,
  id: 'bitvavo',
  platform: 'Bitvavo',
  file: 'Historial de transacciones (Cuenta → Historial → Exportar)',
  category: 'crypto',
  docs: 'https://support.bitvavo.com/hc/en-us/articles/4405059841809',
  signature: ['timezone', 'date', 'type', 'currency', 'quote currency', 'received / paid amount'],
  defaultClass: 'crypto',
  columns: {
    date: ['date'],
    time: ['time'],
    type: ['type'],
    asset: ['currency'],
    units: ['amount'],
    amount: ['received / paid amount'],
    currency: ['received / paid currency', 'quote currency'],
    fee: ['fee amount'],
    feeCurrency: ['fee currency'],
  },
  types: [
    [/^deposit|^withdrawal/, 'transferIn'],
    [/staking/, 'reward', 'staking'],
    [/rebate|affiliate|manually/, 'reward', 'referral'],
    ...COMMON,
  ],
  row: (r, op) => {
    const typed = bitvavo.types.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed) return null;
    if (op.assetClass === 'fiat') return [];
    const kind =
      typed[1] === 'transferIn' && /withdraw/i.test(r.text('type')) ? 'transferOut' : typed[1];
    return one({ ...op, kind, reward: typed[2] });
  },
};

const BITSTAMP_TYPES: TypeRule[] = [
  [/staking|reward/, 'reward', 'staking'],
  [/deposit/, 'transferIn'],
  [/withdrawal/, 'transferOut'],
  [/market|trade/, 'swap'],
];

const bitstampRow = (r: import('./read').RowReader, op: InvestOp): InvestOp[] | null => {
  const typed = BITSTAMP_TYPES.find(([re]) => re.test(norm(r.text('type'))));
  if (!typed) return null;
  if (op.assetClass === 'fiat') return [];
  if (typed[1] !== 'swap') return one({ ...op, kind: typed[1], reward: typed[2] });
  const kind = /sell/i.test(r.text('side')) ? 'sell' : 'buy';
  const units = parseMoney(r.cell('units'), 'en');
  return one({ ...op, kind, asset: units.currency ?? op.asset });
};

const bitstamp: FormatSpec = {
  ...base,
  id: 'bitstamp',
  platform: 'Bitstamp',
  file: 'Transacciones (Transactions → Export, formato RFC 4180)',
  category: 'crypto',
  docs: 'https://www.bitstamp.net/faq/how-do-i-export-my-transaction-history/',
  signature: ['account', 'type', 'subtype', 'datetime', 'amount currency', 'value currency'],
  defaultClass: 'crypto',
  columns: {
    date: ['datetime'],
    type: ['type'],
    side: ['subtype'],
    asset: ['amount currency'],
    units: ['amount'],
    amount: ['value'],
    currency: ['value currency'],
    fee: ['fee'],
    feeCurrency: ['fee currency'],
  },
  row: bitstampRow,
};

const bitstampOld: FormatSpec = {
  ...bitstamp,
  id: 'bitstamp-old',
  file: 'Transacciones (formato anterior: "0.5 BTC")',
  signature: ['type', 'datetime', 'account', 'amount', 'value', 'rate', 'fee', 'sub type'],
  columns: {
    date: ['datetime'],
    type: ['type'],
    side: ['sub type'],
    units: ['amount'],
    amount: ['value'],
    fee: ['fee'],
  },
};

const gemini: FormatSpec = {
  ...base,
  id: 'gemini',
  platform: 'Gemini',
  file: 'Historial de transacciones (Statements → Transaction history)',
  category: 'crypto',
  docs: 'https://support.gemini.com/hc/en-us/articles/211202706',
  signature: ['date', 'time (utc)', 'type', 'symbol', 'specification'],
  defaultClass: 'crypto',
  columns: { date: ['date'], time: ['time (utc)'], type: ['type'], pair: ['symbol'] },
  // One column per asset ("BTC Amount BTC", "USD Amount USD"): the pair says which two to read.
  row: (r, op) => {
    const type = norm(r.text('type'));
    const pair = splitPair(r.text('pair'));
    if (!pair || !/buy|sell|credit|debit/.test(type)) return null;
    const [asset, quote] = pair;
    const amountOf = (code: string) =>
      Math.abs(parseMoney(r.byHeader(`${norm(code)} amount ${norm(code)}`), 'en').value || 0);
    const fee = Math.abs(
      parseMoney(r.byHeader(`trading fee (${norm(quote)}) ${norm(quote)}`), 'en').value || 0
    );
    if (/credit|debit/.test(type))
      return one({
        ...op,
        kind: /credit/.test(type) ? 'transferIn' : 'transferOut',
        asset,
        units: amountOf(asset),
      });
    return one(
      fromTo({
        ...op,
        kind: 'swap',
        asset: type === 'buy' ? quote : asset,
        units: type === 'buy' ? amountOf(quote) : amountOf(asset),
        toAsset: type === 'buy' ? asset : quote,
        toUnits: type === 'buy' ? amountOf(asset) : amountOf(quote),
        amount: null,
        currency: null,
        fee,
        feeCurrency: quote,
        assetClass: FIAT.has(type === 'buy' ? quote : asset) ? 'fiat' : 'crypto',
      })
    );
  },
};

const ledgerLive: FormatSpec = {
  ...base,
  id: 'ledger-live',
  platform: 'Ledger Live',
  file: 'Operaciones (Ajustes → Cuentas → Exportar operaciones)',
  category: 'crypto',
  docs: 'https://support.ledger.com/article/360019793919-zd',
  signature: ['operation date', 'currency ticker', 'operation type', 'operation amount'],
  defaultClass: 'crypto',
  columns: {
    date: ['operation date'],
    type: ['operation type'],
    asset: ['currency ticker'],
    units: ['operation amount'],
    fee: ['operation fees'],
    amount: ['countervalue at operation date'],
    currency: ['countervalue ticker'],
    status: ['status'],
  },
  row: (r, op) => {
    const type = norm(r.text('type'));
    const feeCurrency = op.asset;
    if (/fail/i.test(String(r.byHeader('status')))) return [];
    if (type === 'in') return one({ ...op, kind: 'transferIn', fee: 0 });
    if (type === 'out') return one({ ...op, kind: 'transferOut', feeCurrency });
    if (type === 'fees') return one({ ...op, kind: 'fee', units: op.fee, fee: 0 });
    if (type === 'reward' || type === 'reward_payout')
      return one({ ...op, kind: 'reward', reward: 'staking', fee: 0 });
    // DELEGATE, UNDELEGATE, OPT_IN, NFT_IN...: only the network fee leaves.
    return op.fee > 0 ? one({ ...op, kind: 'fee', units: op.fee, fee: 0 }) : [];
  },
};

/** The address the export is of: the one in most rows (From or To). */
const ownAddress = (rows: import('./read').RowReader[]) => {
  const count = new Map<string, number>();
  for (const r of rows)
    for (const h of ['from', 'to']) {
      const a = norm(r.byHeader(h));
      count.set(a, (count.get(a) ?? 0) + 1);
    }
  const [address] = [...count.entries()].sort((a, b) => b[1] - a[1])[0] ?? [''];
  return { address };
};

const DEFI = /liquidity|lp\b|uni-v|pool|wrap|deposit|withdraw|stake/i;

const etherscan: FormatSpec = {
  ...base,
  id: 'etherscan',
  platform: 'Etherscan (MetaMask y otras carteras)',
  file: 'Transacciones de una dirección (Download CSV Export)',
  category: 'crypto',
  docs: 'https://info.etherscan.com/exporting-data/',
  signature: ['transaction hash', 'unixtimestamp', 'value_in(eth)', 'value_out(eth)'],
  defaultClass: 'crypto',
  columns: { date: ['unixtimestamp'], note: ['method'] },
  row: (r, op) => {
    if (r.byHeader('errcode') || /error/i.test(String(r.byHeader('status')))) return [];
    const valueIn = Math.abs(parseMoney(r.byHeader('value_in(eth)'), 'en').value || 0);
    const valueOut = Math.abs(parseMoney(r.byHeader('value_out(eth)'), 'en').value || 0);
    const fee = Math.abs(parseMoney(r.byHeader('txnfee(eth)'), 'en').value || 0);
    const price = Math.abs(parseMoney(r.byHeader('historical $price/eth'), 'en').value || 0);
    const defi = DEFI.test(op.note ?? '');
    const eth = {
      ...op,
      asset: 'ETH',
      currency: 'USD',
      tx: String(r.byHeader('transaction hash')),
      note: defi ? `DeFi: ${op.note}` : op.note,
    };
    const ops: InvestOp[] = [];
    const with$ = (units: number) => (price ? Math.round(units * price * 100) / 100 : null);
    if (valueIn) ops.push({ ...eth, kind: 'transferIn', units: valueIn, amount: with$(valueIn) });
    if (valueOut)
      ops.push({ ...eth, kind: 'transferOut', units: valueOut, amount: with$(valueOut) });
    if (fee) ops.push({ ...eth, kind: 'fee', units: fee, amount: with$(fee) });
    return ops;
  },
};

const etherscanTokens: FormatSpec = {
  ...base,
  id: 'etherscan-tokens',
  platform: 'Etherscan (MetaMask y otras carteras)',
  file: 'Transferencias de tokens ERC-20 de una dirección',
  category: 'crypto',
  docs: 'https://info.etherscan.com/exporting-data/',
  signature: ['transaction hash', 'unixtimestamp', 'tokenvalue', 'tokensymbol'],
  defaultClass: 'crypto',
  columns: {
    date: ['unixtimestamp'],
    asset: ['tokensymbol'],
    units: ['tokenvalue'],
    amount: ['usdvaluedayoftx'],
    name: ['tokenname'],
  },
  prepare: ownAddress,
  row: (r, op, ctx) => {
    const incoming = norm(r.byHeader('to')) === ctx.address;
    const defi = DEFI.test(`${op.asset} ${op.name ?? ''}`);
    return one({
      ...op,
      kind: incoming ? 'transferIn' : 'transferOut',
      currency: 'USD',
      tx: String(r.byHeader('transaction hash')),
      note: defi ? `DeFi: ${op.asset}` : op.note,
    });
  },
};

const REVOLUT_CRYPTO: TypeRule[] = [
  [/staking reward|stake reward/, 'reward', 'staking'],
  [/learn/, 'reward', 'learn'],
  [/cashback|reward/, 'reward', 'cashback'],
  [/^stake|unstake/, 'ignore'],
  [/receive/, 'transferIn'],
  [/send/, 'transferOut'],
  [/buy/, 'buy'],
  [/sell/, 'sell'],
  [/exchange/, 'swap'],
];

const revolutCrypto: FormatSpec = {
  ...base,
  id: 'revolut-crypto',
  platform: 'Revolut',
  file: 'Extracto de cripto (Cripto → … → Extracto)',
  category: 'crypto',
  docs: 'https://help.revolut.com/help/wealth/cryptocurrencies/',
  signature: ['symbol', 'type', 'quantity', 'price', 'value', 'fees', 'date'],
  defaultClass: 'crypto',
  columns: {
    date: ['date'],
    type: ['type'],
    asset: ['symbol'],
    units: ['quantity'],
    amount: ['value'],
    fee: ['fees'],
  },
  types: REVOLUT_CRYPTO,
};

const REVOLUT_STOCKS: TypeRule[] = [
  [/cash top|cash withdrawal|transfer from|transfer to/, 'ignore'],
  [/custody|fee/, 'custody'],
  [/dividend tax|withholding/, 'dividend'],
  [/dividend/, 'dividend'],
  [/split/, 'split'],
  [/buy/, 'buy'],
  [/sell/, 'sell'],
];

const revolutStocks: FormatSpec = {
  ...base,
  id: 'revolut-stocks',
  platform: 'Revolut',
  file: 'Extracto de acciones (Inversiones → Documentos → Extracto de cuenta)',
  category: 'broker',
  docs: 'https://help.revolut.com/help/wealth/stocks/',
  signature: ['date', 'ticker', 'type', 'quantity', 'price per share', 'total amount'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['date'],
    type: ['type'],
    asset: ['ticker'],
    units: ['quantity'],
    amount: ['total amount'],
    currency: ['currency'],
  },
  types: REVOLUT_STOCKS,
  row: (r, op) => {
    const typed = REVOLUT_STOCKS.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed) return null;
    if (typed[1] === 'dividend' && /tax|withholding/i.test(r.text('type'))) return taxRow(op);
    return one({ ...op, kind: typed[1] });
  },
};

/** Revolut's older statement (also crypto and commodities): Product, Completed Date, Amount. */
const revolutLegacy: FormatSpec = {
  ...base,
  id: 'revolut-legacy',
  platform: 'Revolut',
  file: 'Extracto de cripto o materias primas (formato anterior, con «Product»)',
  category: 'crypto',
  docs: 'https://help.revolut.com/help/wealth/cryptocurrencies/',
  signature: [
    'type',
    'product',
    'started date',
    'completed date',
    'description',
    'amount',
    'state',
  ],
  shape: 'legs',
  defaultClass: 'crypto',
  columns: {
    date: ['completed date'],
    type: ['type'],
    asset: ['currency'],
    units: ['amount'],
    note: ['description'],
  },
  types: [
    [/reward|cashback/, 'reward', 'cashback'],
    [/exchange/, 'swap'],
    [/transfer|topup|top-up|card/, 'ignore'],
  ],
  row: (r, op) => {
    if (!/completed|completad/i.test(String(r.byHeader('state')))) return [];
    if (/commodit/i.test(String(r.byHeader('product')))) op.assetClass = 'commodity';
    return undefined;
  },
};

// ─── Realized gains, closed positions and income reports ─────────────────────

/** A closed position: its purchase and its sale, as the platform matched them. */
const realized = (op: InvestOp): InvestOp[] => [{ ...op, kind: 'realized' }];

const revolutPnl: FormatSpec = {
  ...base,
  id: 'revolut-pnl',
  platform: 'Revolut',
  file: 'Informe de ganancias y pérdidas (Profit and Loss statement): ventas',
  category: 'broker',
  docs: 'https://help.revolut.com/help/wealth/stocks/trading-stocks/managing-my-investments/how-do-i-get-my-profit-and-loss-statement/',
  signature: ['date acquired', 'date sold', 'quantity', 'cost basis', 'gross proceeds'],
  order: 'dmy',
  defaultClass: 'shares',
  columns: {
    date: ['date sold'],
    acquired: ['date acquired'],
    asset: ['symbol', 'token name', 'token'],
    name: ['security name'],
    isin: ['isin'],
    units: ['quantity', 'qty'],
    cost: ['cost basis'],
    amount: ['gross proceeds'],
    currency: ['currency'],
  },
  row: (r, op) => realized({ ...op, assetClass: r.text('isin') ? op.assetClass : 'crypto' }),
};

const revolutIncome: FormatSpec = {
  ...base,
  id: 'revolut-income',
  platform: 'Revolut',
  file: 'Informe de ganancias y pérdidas: otros ingresos y comisiones (dividendos)',
  category: 'broker',
  docs: revolutPnl.docs,
  signature: ['date', 'symbol', 'gross amount', 'withholding tax', 'net amount'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['date'],
    asset: ['symbol'],
    name: ['security name'],
    isin: ['isin'],
    amount: ['gross amount'],
    withholding: ['withholding tax'],
    currency: ['currency'],
  },
  row: (_r, op) => one({ ...op, kind: 'dividend' }),
};

const revolutSavings: FormatSpec = {
  ...base,
  id: 'revolut-savings',
  platform: 'Revolut',
  file: 'Extracto de Ahorro / fondos monetarios (Savings, Flexible Cash Funds)',
  category: 'fund',
  docs: 'https://help.revolut.com/help/savings/',
  signature: ['date', 'description', 'value', 'price per share', 'quantity of shares'],
  defaultClass: 'fund',
  columns: {
    date: ['date'],
    note: ['description'],
    amount: ['value'],
    units: ['quantity of shares'],
  },
  row: (r, op) => {
    const text = norm(r.text('note'));
    const fund = /(class \w+.*)$/i.exec(r.text('note'))?.[1] ?? 'Revolut Savings';
    const asset = fund.toUpperCase();
    // The interest of a money market fund is a distribution of the fund (NO CONFIRMADO, box 0029).
    if (/interest/.test(text)) return one({ ...op, kind: 'dividend', asset, units: 0 });
    if (/fee/.test(text)) return [];
    if (/buy/.test(text)) return one({ ...op, kind: 'buy', asset, currency: 'EUR' });
    if (/sell/.test(text)) return one({ ...op, kind: 'sell', asset, currency: 'EUR' });
    return [];
  },
};

const etoroClosed: FormatSpec = {
  ...base,
  id: 'etoro-closed',
  platform: 'eToro',
  file: 'Extracto de cuenta (hoja «Closed Positions»)',
  category: 'broker',
  docs: 'https://www.etoro.com/customer-service/help/1484383312/how-can-i-download-my-account-statement/',
  signature: ['position id', 'action', 'open date', 'close date', 'leverage'],
  defaultClass: 'shares',
  columns: {
    date: ['close date'],
    acquired: ['open date'],
    name: ['action'],
    units: ['units / contracts', 'units'],
    cost: ['amount'],
    isin: ['isin'],
    class: ['type'],
  },
  row: (r, op) => {
    const profit = parseMoney(r.byHeader('profit(usd)') ?? r.byHeader('profit'), 'en').value || 0;
    const cost = Math.abs(r.num('cost'));
    const type = norm(r.text('class'));
    const leverage = Number(r.byHeader('leverage')) || 1;
    const short = /short/i.test(String(r.byHeader('long / short')));
    const assetClass =
      /cfd/.test(type) || leverage > 1 || short
        ? 'derivative'
        : /crypto/.test(type)
        ? 'crypto'
        : /etf/.test(type)
        ? 'etf'
        : 'shares';
    const asset = (r.text('name').replace(/^(buy|sell)\s+/i, '') || op.asset).toUpperCase();
    return realized({
      ...op,
      asset: op.isin ?? asset,
      name: asset,
      assetClass,
      cost,
      amount: cost + profit,
      currency: 'USD',
    });
  },
};

const etoroDividends: FormatSpec = {
  ...base,
  id: 'etoro-dividends',
  platform: 'eToro',
  file: 'Extracto de cuenta (hoja «Dividends»)',
  category: 'broker',
  docs: etoroClosed.docs,
  signature: ['date of payment', 'instrument name', 'net dividend received'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['date of payment'],
    name: ['instrument name'],
    isin: ['isin'],
    amount: ['net dividend received (usd)', 'net dividend received'],
    withholding: ['withholding tax amount (usd)', 'withholding tax amount'],
  },
  row: (r, op) => {
    const tax = Math.abs(r.num('withholding'));
    return one({
      ...op,
      kind: 'dividend',
      asset: op.asset,
      amount: amt(op) + tax,
      withholding: tax,
      currency: 'USD',
    });
  },
};

// ─── Brokers ──────────────────────────────────────────────────────────────────

const degiro = (lang: 'es' | 'en'): FormatSpec => ({
  ...base,
  id: `degiro-transactions-${lang}`,
  platform: 'Degiro',
  file: 'Transacciones (Actividad → Transacciones → Exportar)',
  category: 'broker',
  docs: 'https://www.degiro.es/ayuda/',
  locale: lang === 'es' ? 'es' : 'en',
  signature:
    lang === 'es'
      ? ['fecha', 'hora', 'producto', 'isin', 'numero', 'precio', 'valor']
      : ['date', 'time', 'product', 'isin', 'quantity', 'price', 'value'],
  defaultClass: 'shares',
  columns:
    lang === 'es'
      ? {
          date: ['fecha'],
          time: ['hora'],
          name: ['producto'],
          isin: ['isin'],
          units: ['numero'],
          amount: ['valor'],
          currency: ['>valor'],
          fee: ['costes de transaccion', 'comision'],
          feeCurrency: ['>costes de transaccion'],
        }
      : {
          date: ['date'],
          time: ['time'],
          name: ['product'],
          isin: ['isin'],
          units: ['quantity'],
          amount: ['value'],
          currency: ['>value'],
          fee: ['transaction and/or third', 'transaction costs'],
          feeCurrency: ['>transaction and/or third'],
        },
  // Units are negative in a sale: the sign says which way it went.
  row: (r, op) => {
    const units = r.num('units');
    if (!units) return null;
    return one({ ...op, kind: units < 0 ? 'sell' : 'buy' });
  },
});

const DEGIRO_ACCOUNT: TypeRule[] = [
  [/retencion del dividendo|dividend tax|impuesto sobre dividendo/, 'dividend'],
  [/dividendo|dividend/, 'dividend'],
  [/interes|interest/, 'interest'],
];

const degiroAccount = (lang: 'es' | 'en'): FormatSpec => ({
  ...base,
  id: `degiro-account-${lang}`,
  platform: 'Degiro',
  file: 'Estado de cuenta (dividendos, retenciones e intereses)',
  category: 'broker',
  docs: 'https://www.degiro.es/ayuda/',
  locale: lang === 'es' ? 'es' : 'en',
  withheldIn: 'origin',
  signature:
    lang === 'es'
      ? ['fecha', 'hora', 'fecha valor', 'producto', 'isin', 'descripcion', 'variacion']
      : ['date', 'time', 'value date', 'product', 'isin', 'description', 'change'],
  defaultClass: 'shares',
  columns:
    lang === 'es'
      ? {
          date: ['fecha'],
          name: ['producto'],
          isin: ['isin'],
          type: ['descripcion'],
          currency: ['variacion'],
          amount: ['>variacion'],
        }
      : {
          date: ['date'],
          name: ['product'],
          isin: ['isin'],
          type: ['description'],
          currency: ['change'],
          amount: ['>change'],
        },
  row: (r, op) => {
    const typed = DEGIRO_ACCOUNT.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed) return [];
    if (typed === DEGIRO_ACCOUNT[0]) return taxRow(op);
    return one({ ...op, kind: typed[1], units: 0 });
  },
});

const IBKR_CLASS: Record<string, InvestOp['assetClass']> = {
  stocks: 'shares',
  stk: 'shares',
  crypto: 'crypto',
  bonds: 'bond',
  bond: 'bond',
  bill: 'bond',
  'equity and index options': 'derivative',
  opt: 'derivative',
  futures: 'derivative',
  fut: 'derivative',
  cfds: 'derivative',
  cfd: 'derivative',
};

const ibkrTrades: FormatSpec = {
  ...base,
  id: 'ibkr-trades',
  platform: 'Interactive Brokers',
  file: 'Activity Statement (CSV): sección «Trades»',
  category: 'broker',
  docs: 'https://www.ibkrguides.com/reportingreference/reportguide/trades_default.htm',
  signature: ['datadiscriminator', 'asset category', 'currency', 'symbol', 'date/time', 'quantity'],
  defaultClass: 'shares',
  columns: {
    date: ['date/time'],
    type: ['datadiscriminator'],
    class: ['asset category'],
    currency: ['currency'],
    asset: ['symbol'],
    units: ['quantity'],
    amount: ['proceeds'],
    fee: ['comm/fee', 'comm in'],
  },
  row: (r, op) => {
    if (!/^(order|trade)$/i.test(r.text('type'))) return [];
    const assetClass = IBKR_CLASS[norm(r.text('class'))];
    if (!assetClass) return [];
    const units = r.num('units');
    return one({
      ...op,
      kind: units < 0 ? 'sell' : 'buy',
      assetClass: brokerClass(op.asset, assetClass),
      feeCurrency: op.currency,
    });
  },
};

const ibkrIncome = (section: 'dividends' | 'withholding' | 'interest'): FormatSpec => ({
  ...base,
  id: `ibkr-${section}`,
  platform: 'Interactive Brokers',
  file: `Activity Statement (CSV): sección «${
    section === 'dividends' ? 'Dividends' : section === 'interest' ? 'Interest' : 'Withholding Tax'
  }»`,
  category: 'broker',
  docs: 'https://www.ibkrguides.com/reportingreference/reportguide/dividends_default.htm',
  signature: [`__ibkr_${section}`, 'currency', 'date', 'description', 'amount'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: { date: ['date'], currency: ['currency'], note: ['description'], amount: ['amount'] },
  row: (r, op) => {
    const m = /^([^\s(]+)\s*\(([A-Z]{2}[A-Z0-9]{9}\d)\)/.exec(r.text('note'));
    const asset = m ? m[2] : r.text('note');
    if (section === 'interest') return one({ ...op, kind: 'interest', asset: 'INTERÉS', units: 0 });
    if (section === 'withholding') return taxRow({ ...op, asset, isin: m?.[2] });
    return one({ ...op, kind: 'dividend', asset, isin: m?.[2], name: m?.[1], units: 0 });
  },
});

const ibkrFlex: FormatSpec = {
  ...base,
  id: 'ibkr-flex',
  platform: 'Interactive Brokers',
  file: 'Flex Query de operaciones (Trades)',
  category: 'broker',
  docs: 'https://www.ibkrguides.com/reportingreference/reportguide/tradesfq.htm',
  signature: ['buy/sell', 'tradeprice', 'quantity'],
  defaultClass: 'shares',
  columns: {
    date: ['tradedate', 'datetime', 'date/time'],
    class: ['assetclass'],
    currency: ['currencyprimary', 'currency'],
    asset: ['symbol'],
    isin: ['isin'],
    name: ['description'],
    units: ['quantity'],
    amount: ['proceeds', 'trademoney'],
    fee: ['ibcommission', 'commission'],
    side: ['buy/sell'],
  },
  row: (r, op) => {
    const assetClass = IBKR_CLASS[norm(r.text('class'))];
    if (!assetClass) return [];
    return one({
      ...op,
      kind: /sell/i.test(r.text('side')) ? 'sell' : 'buy',
      assetClass: brokerClass([op.name, op.asset].join(' '), assetClass),
      feeCurrency: op.currency,
    });
  },
};

const trading212: FormatSpec = {
  ...base,
  id: 'trading212',
  platform: 'Trading 212',
  file: 'Historial (Historial → Exportar CSV)',
  category: 'broker',
  docs: 'https://helpcentre.trading212.com/hc/en-us/articles/360016830197',
  signature: ['action', 'time', 'isin', 'ticker', 'no. of shares', 'price / share'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['time'],
    type: ['action'],
    isin: ['isin'],
    asset: ['ticker'],
    name: ['name'],
    units: ['no. of shares'],
    amount: ['total'],
    currency: ['currency (total)'],
    withholding: ['withholding tax'],
    fee: ['currency conversion fee', 'french transaction tax', 'stamp duty'],
  },
  types: [
    [/dividend/, 'dividend'],
    [/interest/, 'interest'],
    [/buy/, 'buy'],
    [/sell/, 'sell'],
    [/deposit|withdrawal|transfer|currency conversion/, 'ignore'],
  ],
};

const scalable: FormatSpec = {
  ...base,
  id: 'scalable',
  platform: 'Scalable Capital',
  file: 'Transacciones (Perfil → Transacciones → Exportar CSV)',
  category: 'broker',
  docs: 'https://help.scalable.capital/',
  locale: 'es',
  signature: ['date', 'time', 'status', 'reference', 'description', 'assettype', 'type', 'isin'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['date'],
    time: ['time'],
    type: ['type'],
    name: ['description'],
    isin: ['isin'],
    units: ['shares'],
    amount: ['amount'],
    fee: ['fee'],
    withholding: ['tax'],
    currency: ['currency'],
    class: ['assettype'],
    status: ['status'],
  },
  types: [
    [/distribution|dividend/, 'dividend'],
    [/interest/, 'interest'],
    [/savings plan|buy/, 'buy'],
    [/sell/, 'sell'],
    [/deposit|withdrawal|fee|tax|transfer/, 'ignore'],
  ],
  row: (r, op) => {
    if (!/executed|ejecut/i.test(String(r.byHeader('status')))) return [];
    const typed = scalable.types.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed || typed[1] === 'ignore') return [];
    const cash = norm(r.text('class')) === 'cash';
    if (cash && typed[1] !== 'interest') return [];
    return one({ ...op, kind: typed[1] });
  },
};

const lightyear: FormatSpec = {
  ...base,
  id: 'lightyear',
  platform: 'Lightyear',
  file: 'Extracto de cuenta (Account statement → CSV)',
  category: 'broker',
  docs: 'https://lightyear.com/help',
  signature: ['date', 'reference', 'ticker', 'isin', 'type', 'quantity', 'ccy'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['date'],
    asset: ['ticker'],
    isin: ['isin'],
    type: ['type'],
    units: ['quantity'],
    currency: ['ccy'],
    amount: ['gross amount', 'net amt'],
    fee: ['fee'],
    withholding: ['tax amt'],
  },
  types: [
    [/dividend|distribution/, 'dividend'],
    [/interest/, 'interest'],
    [/buy/, 'buy'],
    [/sell/, 'sell'],
    [/deposit|withdrawal|conversion/, 'ignore'],
  ],
};

const xtbCash: FormatSpec = {
  ...base,
  id: 'xtb-cash',
  platform: 'XTB',
  file: 'Historial de cuenta (hoja «Cash Operations» / «Operaciones de caja»)',
  category: 'broker',
  docs: 'https://www.xtb.com/es/centro-de-ayuda',
  signature: ['id', 'type', 'time', 'comment', 'symbol', 'amount'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['time'],
    type: ['type'],
    note: ['comment'],
    asset: ['symbol'],
    amount: ['amount'],
  },
  // "OPEN BUY 10 @ 150.25" / "CLOSE BUY 10 @ 160.00": units from the comment.
  row: (r, op) => {
    const type = norm(r.text('type'));
    const m = /(\d+(?:[.,]\d+)?)(?:\/\d+(?:[.,]\d+)?)?\s*@\s*([\d.,]+)/.exec(r.text('note'));
    const units = m ? Number(m[1].replace(',', '.')) : 0;
    if (/withholding|tax/.test(type)) return taxRow(op);
    if (/divident|dividend/.test(type)) return one({ ...op, kind: 'dividend', units: 0 });
    if (/interest/.test(type)) return one({ ...op, kind: 'interest', asset: 'INTERÉS', units: 0 });
    if (/purchase|compra/.test(type)) return one({ ...op, kind: 'buy', units, currency: 'EUR' });
    if (/sale|venta/.test(type)) return one({ ...op, kind: 'sell', units, currency: 'EUR' });
    return [];
  },
};

const freedom24: FormatSpec = {
  ...base,
  id: 'freedom24',
  platform: 'Freedom24',
  file: 'Informe de operaciones (Trades)',
  category: 'broker',
  docs: 'https://freedom24.com/faq',
  signature: ['trade date', 'ticker', 'operation', 'quantity', 'price', 'amount'],
  defaultClass: 'shares',
  columns: {
    date: ['trade date'],
    asset: ['ticker'],
    isin: ['isin'],
    type: ['operation'],
    units: ['quantity'],
    amount: ['amount'],
    currency: ['currency'],
    fee: ['commission'],
  },
  types: [
    [/buy|compra/, 'buy'],
    [/sell|venta/, 'sell'],
  ],
};

const schwab: FormatSpec = {
  ...base,
  id: 'schwab',
  platform: 'Charles Schwab',
  file: 'Historial de transacciones (History → Export)',
  category: 'broker',
  docs: 'https://www.schwab.com/',
  order: 'mdy',
  signature: [
    'date',
    'action',
    'symbol',
    'description',
    'quantity',
    'price',
    'fees & comm',
    'amount',
  ],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['date'],
    type: ['action'],
    asset: ['symbol'],
    name: ['description'],
    units: ['quantity'],
    amount: ['amount'],
    fee: ['fees & comm'],
  },
  types: [
    [/nra tax|foreign tax|withholding/, 'dividend'],
    [/dividend|reinvest dividend/, 'dividend'],
    [/interest/, 'interest'],
    [/reinvest shares|buy/, 'buy'],
    [/sell/, 'sell'],
  ],
  row: (r, op) => {
    const typed = schwab.types.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed) return [];
    const usd = { ...op, currency: 'USD' };
    if (typed === schwab.types[0]) return taxRow(usd);
    return one({
      ...usd,
      kind: typed[1],
      units: typed[1] === 'buy' || typed[1] === 'sell' ? op.units : 0,
    });
  },
};

const fidelity: FormatSpec = {
  ...base,
  id: 'fidelity',
  platform: 'Fidelity',
  file: 'Historial de la cuenta (Activity & Orders → Download)',
  category: 'broker',
  docs: 'https://www.fidelity.com/',
  order: 'mdy',
  signature: ['run date', 'action', 'symbol', 'quantity', 'amount ($)'],
  defaultClass: 'shares',
  withheldIn: 'origin',
  columns: {
    date: ['run date'],
    type: ['action'],
    asset: ['symbol'],
    name: ['security description', 'description'],
    units: ['quantity'],
    amount: ['amount ($)'],
    fee: ['commission ($)'],
  },
  types: [
    [/foreign tax|withholding/, 'dividend'],
    [/dividend/, 'dividend'],
    [/interest/, 'interest'],
    [/you bought|reinvestment/, 'buy'],
    [/you sold/, 'sell'],
  ],
  row: (r, op) => {
    const typed = fidelity.types.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed) return [];
    const usd = { ...op, currency: 'USD' };
    if (typed === fidelity.types[0]) return taxRow(usd);
    return one({ ...usd, kind: typed[1] });
  },
};

// ─── Spanish funds and banks (MyInvestor, Indexa, Finizens, Renta 4, Openbank, BBVA…) ──

const FUND_TYPES: TypeRule[] = [
  [/traspaso.*(entrada|recibid|alta|destino)|entrada.*traspaso/, 'switchIn'],
  [/traspaso.*(salida|emitid|baja|origen)|salida.*traspaso/, 'switchOut'],
  [/dividendo|reparto|distribucion/, 'dividend'],
  [/cupon|interes/, 'interest'],
  [/custodia/, 'custody'],
  [/suscripcion|compra|aportacion|alta|plan de inversion|saveback/, 'buy'],
  [/reembolso|venta|rescate/, 'sell'],
];

/**
 * The movements of funds and securities as Spanish entities export them. Each entity names the
 * columns a little differently; this one reads the usual names (NO CONFIRMADO for each entity:
 * the guided mapping is there for the rest).
 */
const spanishFunds = (id: string, platform: string): FormatSpec => ({
  ...base,
  id,
  platform,
  file: 'Movimientos de fondos o valores (Excel/CSV de la web)',
  category: 'fund',
  docs: 'https://www.cnmv.es/',
  locale: 'es',
  withheldIn: 'spain',
  signature: ['fecha', 'isin', 'participaciones'],
  defaultClass: 'fund',
  columns: {
    date: ['fecha de operacion', 'fecha operacion', 'fecha valor', 'fecha'],
    type: ['tipo de operacion', 'operacion', 'tipo', 'concepto', 'movimiento'],
    name: ['fondo', 'producto', 'nombre', 'instrumento', 'valor'],
    isin: ['isin'],
    units: ['participaciones', 'n. participaciones', 'titulos'],
    amount: ['importe neto', 'importe', 'efectivo', 'importe bruto'],
    price: ['valor liquidativo', 'precio'],
    fee: ['comision', 'gastos'],
    withholding: ['retencion'],
    cost: ['coste fiscal', 'valor de adquisicion', 'coste de adquisicion'],
    acquired: ['fecha de adquisicion', 'fecha origen', 'fecha adquisicion'],
    currency: ['divisa', 'moneda'],
  },
  types: FUND_TYPES,
  row: (r, op) => {
    const typed = FUND_TYPES.find(([re]) => re.test(norm(r.text('type'))));
    if (!typed) return null;
    const assetClass = brokerClass(op.name ?? '', /etf/i.test(op.name ?? '') ? 'shares' : 'fund');
    return one({
      ...op,
      kind: typed[1],
      assetClass,
      currency: op.currency ?? 'EUR',
    });
  },
});

export const SPANISH_ENTITIES = [
  'MyInvestor',
  'Indexa Capital',
  'Finizens',
  'Renta 4',
  'Openbank',
  'BBVA',
  'Santander',
  'CaixaBank',
  'ING',
  'Inversis',
];

export const FORMATS: FormatSpec[] = [
  binanceHistory,
  binanceTrades,
  coinbase,
  coinbasePro,
  krakenLedgers,
  krakenTrades,
  bitpanda,
  cryptocom,
  nexo,
  bit2me,
  kucoin,
  kucoinOld,
  bybit,
  okx,
  bitvavo,
  bitstamp,
  bitstampOld,
  gemini,
  ledgerLive,
  etherscan,
  etherscanTokens,
  revolutPnl,
  revolutIncome,
  revolutSavings,
  revolutCrypto,
  revolutStocks,
  revolutLegacy,
  etoroClosed,
  etoroDividends,
  degiro('es'),
  degiro('en'),
  degiroAccount('es'),
  degiroAccount('en'),
  ibkrTrades,
  ibkrIncome('dividends'),
  ibkrIncome('withholding'),
  ibkrIncome('interest'),
  ibkrFlex,
  trading212,
  scalable,
  lightyear,
  xtbCash,
  freedom24,
  schwab,
  fidelity,
  spanishFunds('es-funds', 'Fondos y valores (entidad española)'),
];
