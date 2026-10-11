// The Android app does not carry the receipt scanner's files (14 MB): it loads them from our
// server the first time a receipt is scanned (see OCR_PATH in ReceiptScanner).
import { rmSync } from 'node:fs';
import { join } from 'node:path';

rmSync(join('dist', 'ocr'), { recursive: true, force: true });
