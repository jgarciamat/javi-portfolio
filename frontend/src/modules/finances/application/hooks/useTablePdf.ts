import { useI18n } from '@core/i18n/I18nContext';
import { useFormat } from '@core/settings/SettingsContext';
import { todayDateOnly } from '@shared/utils/format';
import {
  buildTablePdf,
  pdfFileName,
  savePdf,
  type PdfHeader,
  type PdfTable,
  type PdfWords,
} from '../tablePdf';

/** The PDF of a table in the user's language and currency, saved or shared. */
export function useTablePdf() {
  const { t } = useI18n();
  const format = useFormat();
  const words: PdfWords = {
    generated: t('app.pdf.generated'),
    range: t('app.pdf.range'),
    page: t('app.pdf.page'),
    legend: t('app.pdf.legend'),
  };
  const header = (title: string, range?: string): PdfHeader => ({
    title,
    range,
    date: format.date(todayDateOnly()),
  });

  /** The dates of a filter as the PDF says them: «3 mar 2026 – 4 abr 2026», «desde el…», «hasta el…». */
  const dateRange = (from?: string, to?: string): string | undefined => {
    if (from && to) return `${format.date(from)} – ${format.date(to)}`;
    if (from) return t('app.pdf.from', { date: format.date(from) });
    if (to) return t('app.pdf.to', { date: format.date(to) });
    return undefined;
  };

  /** `finanverso_<name>_<today>.pdf` with the table under the title. */
  const downloadTablePdf = async (name: string, table: PdfTable, title: string, range?: string) => {
    const blob = await buildTablePdf(table, {
      header: header(title, range),
      words,
      locale: format.locale,
      currency: format.currency,
    });
    await savePdf(blob, pdfFileName(name), title);
  };

  return { downloadTablePdf, dateRange, words, header };
}
