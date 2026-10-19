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
      // Every box comes back, the page of the prorrata of the 303 (500-524, 700-735) included; its
      // page 4 says «exonerados de la Declaración-resumen anual» and it is still read as a 303.
      expect(Object.keys(read.data.boxes).length).toBe(Object.keys(form.values).length);
    });
  }
);
