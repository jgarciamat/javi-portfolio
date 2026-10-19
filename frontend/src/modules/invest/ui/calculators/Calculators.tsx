import type { ReactElement } from 'react';
import type { CalcId } from '../../domain/types';
import { BondCalc } from './BondCalc';
import { CompoundCalc } from './CompoundCalc';
import { CryptoCalc } from './CryptoCalc';
import { LetraCalc } from './LetraCalc';
import { StockCalc } from './StockCalc';
import { TaxCalc } from './TaxCalc';

const CALCS: Record<CalcId, () => ReactElement> = {
  compound: () => <CompoundCalc />,
  crypto: () => <CryptoCalc />,
  bond: () => <BondCalc />,
  tax: () => <TaxCalc />,
  stock: () => <StockCalc />,
  letra: () => <LetraCalc />,
};

export const CALC_IDS = Object.keys(CALCS) as CalcId[];

export function InvestCalc({ id }: { id: CalcId }) {
  return CALCS[id]();
}
