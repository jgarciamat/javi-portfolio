import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n, type Locale } from '@core/i18n/I18nContext';
import { useOptionalSettings } from '@core/settings/SettingsContext';
import { storage } from '@shared/utils/storage';
import {
  EURO,
  pickCurrency,
  toBaseAmount,
  toBasePrice,
  toDisplay,
  type Display,
  type DisplayCurrency,
} from '../domain/currency';
import { formatEur, formatPrice } from '../domain/format';

/** Every amount of the console goes through here: euros in, the chosen currency out. */
export interface Money {
  display: Display;
  /** «€» or «$». */
  symbol: string;
  /** An amount in euros, shown in the display currency. */
  amount: (euros: number, signed?: boolean) => string;
  /** A price in euros, shown in the display currency. */
  price: (euros: number) => string;
  /** A price already in the display currency (the chart's candles and layers). */
  shownPrice: (value: number) => string;
  /** An amount already in the display currency (estimates of the order box). */
  shownAmount: (value: number, signed?: boolean) => string;
  /** Euros → display currency (numbers for inputs and checks). */
  toShown: (euros: number) => number;
  /** What the person typed (display currency) → euros for the API. */
  toBaseAmount: (shown: number) => number;
  toBasePrice: (shown: number) => number;
}

export function makeMoney(display: Display, locale: Locale): Money {
  const { currency } = display;
  return {
    display,
    symbol: currency === 'USD' ? '$' : '€',
    amount: (euros, signed = false) =>
      formatEur(toDisplay(euros, display), locale, signed, currency),
    price: (euros) => formatPrice(toDisplay(euros, display), locale, currency),
    shownPrice: (value) => formatPrice(value, locale, currency),
    shownAmount: (value, signed = false) => formatEur(value, locale, signed, currency),
    toShown: (euros) => toDisplay(euros, display),
    toBaseAmount: (shown) => toBaseAmount(shown, display),
    toBasePrice: (shown) => toBasePrice(shown, display),
  };
}

const MoneyContext = createContext<Display>(EURO);

export function MoneyProvider({ display, children }: { display: Display; children: ReactNode }) {
  return <MoneyContext.Provider value={display}>{children}</MoneyContext.Provider>;
}

export function useMoney(): Money {
  const display = useContext(MoneyContext);
  const { locale } = useI18n();
  return useMemo(() => makeMoney(display, locale), [display, locale]);
}

const KEY = 'mm_crypto_currency';

export interface DisplayChoice {
  display: Display;
  /** What the person chose (it may not be shown yet while the rate loads or if it failed). */
  chosen: DisplayCurrency;
  choose: (currency: DisplayCurrency) => void;
  /**
   * Takes the rate the market data was converted with (USDT → euros), so the dollars shown of a
   * coin quoted in USDT are its USDT price again, with no second conversion.
   */
  adopt: (usdPerEur: number) => void;
  /** Dollars were chosen but the rate could not be loaded: euros are shown. */
  unavailable: boolean;
}

/**
 * The currency the console is shown in: remembered on this device, the app's currency the first
 * time. Dollars use the European Central Bank's rate of the day: the one the market data was
 * converted with when there is one, else the one of our rates API.
 */
export function useDisplayCurrency(): DisplayChoice {
  const { ratesApi } = useApi();
  const appCurrency = useOptionalSettings()?.settings?.currency;
  const [chosen, setChosen] = useState<DisplayCurrency>(() =>
    pickCurrency(storage.get(KEY), appCurrency)
  );
  const [rate, setRate] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (chosen !== 'USD' || rate !== null) return;
    let live = true;
    ratesApi
      .get('EUR', 'USD')
      .then(({ rate: value }) => {
        if (live) {
          setRate(value);
          setFailed(false);
        }
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [chosen, rate, ratesApi]);

  const display = useMemo<Display>(
    () => (chosen === 'USD' && rate !== null ? { currency: 'USD', rate } : EURO),
    [chosen, rate]
  );
  const adopt = useCallback((usdPerEur: number) => {
    setRate(usdPerEur);
    setFailed(false);
  }, []);
  return {
    display,
    chosen,
    adopt,
    unavailable: chosen === 'USD' && failed,
    choose: (currency) => {
      setChosen(currency);
      setFailed(false);
      storage.set(KEY, currency);
    },
  };
}
