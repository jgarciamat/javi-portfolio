import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { isNativeApp } from '@shared/utils/platform';
import { shareImage } from '@shared/utils/shareImage';
import type { PreviewText } from '../application/formPdf';
import { canvasPng, openFormView, type FormView } from '../application/formView';
import { loadLayout } from '../domain/layout';
import { formatBox, kindOf, type FilledForm } from '../domain/values';
import './TaxForms.css';

type Translate = ReturnType<typeof useI18n>['t'];

/** Width of the PNG of a page: about 150 dots per inch on A4, sharp enough to read every box. */
const PNG_WIDTH = 1240;

/** The words printed on the preview, in the language of the app. */
export function previewText(t: Translate, form: FilledForm): PreviewText {
  const period = form.period ? ` ${form.period}` : '';
  return {
    banner: t('taxforms.mark.banner'),
    notice: t('taxforms.mark.notice'),
    legend: t(form.model === '100' ? 'taxforms.mark.legend100' : 'taxforms.mark.legend'),
    pending: t('taxforms.mark.pending'),
    page: t('taxforms.mark.page', { n: '{n}', total: '{total}' }),
    title: t('taxforms.preview.docTitle', { model: form.model, period: `${form.year}${period}` }),
  };
}

/** The name of the files: «modelo-303-2026-3T-vista-previa.pdf». */
export const fileName = (form: FilledForm, ext: 'pdf' | 'png', page = 1): string =>
  `modelo-${form.model}-${form.year}${form.period ? `-${form.period}` : ''}-vista-previa${
    ext === 'png' ? `-pag${page}` : ''
  }.${ext}`;

/** Phones and the app offer the share sheet; a computer just downloads the file. */
const shareMode = (): 'share' | 'download' =>
  isNativeApp() || window.matchMedia?.('(pointer: coarse)')?.matches ? 'share' : 'download';

/** The figures typed in the preview, as a table that a screen reader can go through. */
function FilledBoxes({ form }: { form: FilledForm }) {
  const { t } = useI18n();
  const ids = Object.keys(form.values);
  return (
    <details className="taxform-boxes">
      <summary>{t('taxforms.preview.boxes', { n: ids.length })}</summary>
      <table>
        <thead>
          <tr>
            <th scope="col">{t('taxforms.preview.box')}</th>
            <th scope="col">{t('taxforms.preview.value')}</th>
          </tr>
        </thead>
        <tbody>
          {ids.map((id) => (
            <tr key={id}>
              <td>{id}</td>
              <td>{formatBox(form.values[id], kindOf(form.model, id))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {form.pending.length > 0 && (
        <p className="section-hint">
          {t('taxforms.preview.pending', { boxes: form.pending.join(', ') })}
        </p>
      )}
    </details>
  );
}

/** The PDF of the preview, built once per set of figures. */
function usePreviewPdf(form: FilledForm) {
  const { t } = useI18n();
  const key = JSON.stringify(form);
  const cache = useRef<{ key: string; bytes: Uint8Array } | null>(null);
  return async (): Promise<Uint8Array> => {
    if (cache.current?.key === key) return cache.current.bytes;
    // pdf-lib is large: it is loaded with the first preview, not with the screen.
    const { buildFormPdf } = await import('../application/formPdf');
    const bytes = await buildFormPdf(await loadLayout(form.model), form, previewText(t, form));
    cache.current = { key, bytes };
    return bytes;
  };
}

/**
 * A form as the official one (same pages, sections and numbered boxes) with the app's figures
 * typed in: shown on the screen page by page, and downloaded as an editable PDF or as a picture.
 * Everything is built on the device.
 */
export function FormPreview({ form, label }: { form: FilledForm; label: string }) {
  const { t } = useI18n();
  const pdf = usePreviewPdf(form);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<FormView | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const id = `taxform-${form.model}`;

  // A new set of figures makes a new PDF: the open view is closed and built again when asked.
  const key = JSON.stringify(form);
  useEffect(() => {
    setView(null);
    setOpen(false);
    setPage(1);
  }, [key]);

  useEffect(() => {
    if (!open || !view || !canvas.current) return;
    const width = canvas.current.parentElement?.clientWidth || 600;
    view.draw(page, canvas.current, width).catch(() => setFailed(true));
  }, [open, view, page]);

  useEffect(() => () => void view?.close(), [view]);

  /** Runs a step with the busy state and the error message. */
  const step = async (work: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await work();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const ensureView = async (): Promise<FormView> => {
    if (view) return view;
    const opened = await openFormView(await pdf());
    setView(opened);
    return opened;
  };

  const toggle = () =>
    open
      ? setOpen(false)
      : step(async () => {
          await ensureView();
          setOpen(true);
        });

  const downloadPdf = () =>
    step(async () => {
      const bytes = await pdf();
      await shareImage(
        new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
        fileName(form, 'pdf'),
        label,
        shareMode()
      );
    });

  const downloadPng = () =>
    step(async () => {
      const opened = await ensureView();
      const sheet = document.createElement('canvas');
      await opened.draw(page, sheet, PNG_WIDTH);
      await shareImage(await canvasPng(sheet), fileName(form, 'png', page), label, shareMode());
    });

  const pages = view?.pages ?? 0;
  return (
    <section className="taxform" aria-labelledby={`${id}-title`}>
      <h4 id={`${id}-title`}>{label}</h4>
      <div className="taxform-actions">
        <button
          type="button"
          className="taxform-btn"
          aria-expanded={open}
          aria-controls={`${id}-view`}
          disabled={busy}
          onClick={() => void toggle()}
        >
          {t(open ? 'taxforms.preview.close' : 'taxforms.preview.open')}
        </button>
        <button
          type="button"
          className="taxform-btn"
          disabled={busy}
          onClick={() => void downloadPdf()}
        >
          {t('taxforms.preview.pdf')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => void downloadPng()}
        >
          {t('taxforms.preview.png')}
        </button>
      </div>
      {busy && (
        <p className="section-hint" role="status">
          {t('taxforms.preview.preparing')}
        </p>
      )}
      {failed && (
        <p className="form-error" role="alert">
          {t('taxforms.preview.error')}
        </p>
      )}
      <div id={`${id}-view`} className="taxform-view" hidden={!open}>
        {pages > 1 && (
          <nav className="taxform-pager" aria-label={t('taxforms.preview.pages')}>
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((n) => n - 1)}
            >
              {t('taxforms.preview.prev')}
            </button>
            <span aria-live="polite">{t('taxforms.mark.page', { n: page, total: pages })}</span>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= pages}
              onClick={() => setPage((n) => n + 1)}
            >
              {t('taxforms.preview.next')}
            </button>
          </nav>
        )}
        <div className="taxform-sheet">
          <canvas
            ref={canvas}
            role="img"
            aria-label={t('taxforms.preview.alt', {
              model: form.model,
              n: page,
              total: pages,
            })}
          />
        </div>
        <p className="section-hint">{t('taxforms.preview.hint')}</p>
        <FilledBoxes form={form} />
      </div>
    </section>
  );
}
