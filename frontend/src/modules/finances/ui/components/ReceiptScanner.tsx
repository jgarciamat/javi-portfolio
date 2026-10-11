import { useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { type ScannedReceipt, parseReceipt } from '@modules/finances/domain/receiptParser';
import { Icon } from '@shared/components/Icon';

/** Where the scanner's files are served from (see scripts/copy-ocr.mjs): our server, not a CDN. */
const OCR_PATH = '/ocr/';

/** Reads the text of a ticket photo on the device; nothing is uploaded. */
export async function readReceipt(image: File): Promise<ScannedReceipt> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('spa', 1, {
    workerPath: `${OCR_PATH}worker.min.js`,
    corePath: OCR_PATH,
    langPath: OCR_PATH,
    gzip: true,
  });
  try {
    const { data } = await worker.recognize(image);
    return parseReceipt(data.text);
  } finally {
    await worker.terminate();
  }
}

/** "Scan a ticket": a photo of the receipt fills in the shop, the date and the amount. */
export function ReceiptScanner({ onScanned }: { onScanned: (receipt: ScannedReceipt) => void }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const receipt = await readReceipt(file);
      if (receipt.total === null && receipt.merchant === null && receipt.date === null) {
        setError('app.receipt.nothing');
      } else {
        onScanned(receipt);
      }
    } catch {
      setError('app.receipt.error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tx-receipt">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label={t('app.receipt.file')}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void scan(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="btn-secondary"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Icon name="camera" /> {busy ? t('app.receipt.reading') : t('app.receipt.scan')}
      </button>
      {error && <p className="form-error">{t(error)}</p>}
    </div>
  );
}
