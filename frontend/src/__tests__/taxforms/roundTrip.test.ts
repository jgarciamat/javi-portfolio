import { parseTaxModelTokens, type PdfToken } from '@modules/finances/domain/taxModelPdf';
import { loadLayout, type FormModel } from '@modules/taxforms/domain/layout';
import { sampleForm } from '@modules/taxforms/domain/samples';
import fixtures from './fixtures/formTokens.json';

/**
 * The PDFs of the previews, read with the real pdf.js by `npm run taxforms:verify` (FIXTURES=1):
 * the app's own reader of filed forms must find the model, the period and every box it knows with
 * the figure the preview typed in.
 */
const tokens = fixtures as Record<string, PdfToken[][]>;

describe.each(['130', '111', '115', '303'] as FormModel[])(
  'The preview of the %s, read back',
  (model) => {
    it('gives the same boxes, the year and the quarter', async () => {
      const form = sampleForm(model, await loadLayout(model));
      const read = parseTaxModelTokens(tokens[model]);
      if (!read.ok) throw new Error(read.reason);
      expect(read.data.model).toBe(model);
      expect(read.data.year).toBe(2026);
      expect(read.data.quarter).toBe(3);
      // Every box read has the figure typed in, and none is read that was not typed.
      for (const [id, value] of Object.entries(read.data.boxes))
        expect(form.values[id]).toBe(value);
      const read303 = Object.keys(read.data.boxes).length;
      if (model === '303') {
        // The reader knows the boxes of the main pages; the simplified regime, the yearly page and
        // the prorrata are not in its list yet.
        expect(read303).toBe(94);
        expect(read.data.boxes['71']).toBe(form.values['71']);
      } else expect(read303).toBe(Object.keys(form.values).length);
    });
  }
);
