import { buildAutonomoPdf, type PdfText } from '@modules/finances/application/autonomoPdf';
import type { AutonomoInputs } from '@modules/finances/domain/types';
import * as f from '@test-utils/fixtures';

const text: PdfText = {
  title: 'Borrador',
  subtitle: '2026 T1',
  generated: 'hoy',
  data: 'Datos',
  quarter: 'Trimestre',
  income: 'Ingresos',
  withheld: 'Retenciones',
  other: 'Otros',
  box: 'Casilla',
  concept: 'Concepto',
  amount: 'Importe',
  vatAccrued: 'IVA devengado',
  vatDeductible: 'IVA deducible',
  vatSettlement: 'Resultado',
  irpf: 'IRPF',
  irpfNotRequired: 'No obligado',
  expenses: 'Gastos',
  paid: 'Pagado',
  deductibleIrpf: 'Deducible',
  deductibleVat: 'IVA',
  total: 'Total',
  reta: 'Cuota',
  retaText: 'Tramo R1',
  deadlines: 'Fechas',
  disclaimer: 'Orientativo',
  summary: [{ model: 'Modelo 303', text: 'a ingresar', amount: '178 €' }],
  kinds: { supplies: 'Suministros', training: 'Formación' },
  notes: { supplies: 'Solo el 30 %' },
  incomeLabels: { r21: '21 %', r10: '10 %', r4: '4 %', r0: '0 %' },
  prior: 'Ya presentado: {income} {expenses} {payments} {withheld}',
  flags: {
    hardToJustify: '5 %',
    exempt: 'Sin 130',
    priorNet: 'Neto anterior',
    toOffset: 'A compensar',
  },
};

const extras = { withheld: 10, socialSecurity: 0, vatNotDeductible: 0 };
const manualQuarter = { income: { r21: 1000, r10: 0, r4: 0, r0: 0 }, expenses: [] };
const inputs = (over: Partial<AutonomoInputs> = {}): AutonomoInputs => ({
  quarters: [extras, extras, extras, extras],
  hardToJustify: true,
  priorYearNet: 9000,
  exempt130: true,
  vatToOffset: 5,
  manual: {
    quarters: [manualQuarter, manualQuarter, manualQuarter, manualQuarter],
    profile: {
      workArea: 0,
      homeArea: 0,
      vehicleExclusive: false,
      healthPeople: 0,
      healthDisability: false,
    },
  },
  ...over,
});
const date = (iso: string) => iso;

describe('the PDF of the self-employed draft', () => {
  it('builds a PDF with the data, the boxes, the expenses and the deadlines', async () => {
    const draft = f.autonomoDraft({
      expenses: [
        {
          quarter: 1,
          kind: 'supplies',
          amount: 121,
          deductible: 6,
          vatDeductible: 1.26,
          note: 'supplies',
        },
        { quarter: 1, kind: 'training', amount: 121, deductible: 100, vatDeductible: 21, note: '' },
      ],
    });
    const blob = await buildAutonomoPdf(draft, inputs(), text, date);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(1000);
    // A complete PDF file: header, pages with the tables, and the end marker.
    const content = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsBinaryString(blob);
    });
    expect(content.startsWith('%PDF-1.')).toBe(true);
    expect(content.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(content).toMatch(/\/Type \/Page\b/);
  });

  it('works without the data, without expenses and with no modelo 130', async () => {
    const draft = f.autonomoDraft({
      irpf: { required: false, result: 'notRequired', amountDue: 0, boxes: [] },
    });
    const blob = await buildAutonomoPdf(draft, null, text, date);
    expect(blob.size).toBeGreaterThan(1000);
    const bare = await buildAutonomoPdf(
      f.autonomoDraft(),
      inputs({ hardToJustify: false, exempt130: false, priorYearNet: null, vatToOffset: 0 }),
      text,
      date
    );
    expect(bare.size).toBeGreaterThan(1000);
    const filed = await buildAutonomoPdf(
      f.autonomoDraft({ quarter: 4 }),
      inputs({ prior: { income: 3000, expenses: 600, previousPayments: 360, withheld: 100 } }),
      text,
      date
    );
    expect(filed.size).toBeGreaterThan(1000);
    const noManual = await buildAutonomoPdf(
      f.autonomoDraft(),
      inputs({ manual: null }),
      text,
      date
    );
    expect(noManual.size).toBeGreaterThan(1000);
  });
});
