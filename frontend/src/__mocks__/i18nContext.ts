import esJson from '../locales/es.json';

const translations: Record<string, string> = esJson as Record<string, string>;

const t = (key: string, vars?: Record<string, string>): string => {
    let value = translations[key] ?? key;
    if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
            value = value.replace(`{${k}}`, v);
        });
    }
    return value;
};

const tCategory = (name: string): string => t(`app.categories.${name.replace(/\s+/g, '')}`) || name;

export const useI18n = () => ({
    locale: 'es' as const,
    setLocale: jest.fn(),
    t,
    tCategory,
});

export const I18nProvider = ({ children }: { children: React.ReactNode }) => children;
