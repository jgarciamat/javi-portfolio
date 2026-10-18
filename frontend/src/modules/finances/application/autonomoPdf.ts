import type {
  AutonomoDraft,
  AutonomoInputs,
  ExpenseLine,
  ManualData,
  TaxBox,
} from '@modules/finances/domain/types';

/** The words the PDF needs, already in the language of the person. */
export interface PdfText {
  title: string;
  subtitle: string;
  generated: string;
  data: string;
  quarter: string;
  income: string;
  withheld: string;
  other: string;
  box: string;
  concept: string;
  amount: string;
  vatAccrued: string;
  vatDeductible: string;
  vatSettlement: string;
  irpf: string;
  irpfNotRequired: string;
  expenses: string;
  paid: string;
  deductibleIrpf: string;
  deductibleVat: string;
  total: string;
  reta: string;
  retaText: string;
  deadlines: string;
  disclaimer: string;
  summary: { model: string; text: string; amount: string }[];
  kinds: Record<string, string>;
  notes: Record<string, string>;
  incomeLabels: { r21: string; r10: string; r4: string; r0: string };
  /** The totals of the modelo 130 already filed, as a sentence (with a placeholder per figure). */
  prior: string;
  flags: { hardToJustify: string; exempt: string; priorNet: string; toOffset: string };
}

const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

const boxRow = (b: TaxBox): string[] => [
  b.box,
  b.label,
  b.label.startsWith('Tipo') ? `${b.amount} %` : eur(b.amount),
];

/** The income and withholdings of each quarter typed by hand (from the previous one when 130s were filed). */
function dataRows(
  draft: AutonomoDraft,
  inputs: AutonomoInputs,
  manual: ManualData,
  text: PdfText
): string[][] {
  const rows: string[][] = [];
  const first = inputs.prior && draft.quarter > 1 ? draft.quarter - 1 : 0;
  manual.quarters.slice(first, draft.quarter).forEach((q, k) => {
    const i = first + k;
    const labels = text.incomeLabels;
    rows.push([
      `${text.quarter} ${i + 1}`,
      `${labels.r21}: ${eur(q.income.r21)} · ${labels.r10}: ${eur(q.income.r10)} · ${
        labels.r4
      }: ${eur(q.income.r4)} · ${labels.r0}: ${eur(q.income.r0)}`,
      eur(inputs.quarters[i].withheld),
    ]);
  });
  return rows;
}

/** The other data the person gave, one short sentence each. */
function flagsOf(draft: AutonomoDraft, inputs: AutonomoInputs, text: PdfText): string[] {
  const flags: string[] = [];
  if (inputs.prior && draft.quarter > 1) {
    const p = inputs.prior;
    flags.push(
      text.prior
        .replace('{income}', eur(p.income))
        .replace('{expenses}', eur(p.expenses))
        .replace('{payments}', eur(p.previousPayments))
        .replace('{withheld}', eur(p.withheld))
    );
  }
  if (inputs.hardToJustify) flags.push(text.flags.hardToJustify);
  if (inputs.exempt130) flags.push(text.flags.exempt);
  if (inputs.priorYearNet !== null) {
    flags.push(`${text.flags.priorNet}: ${eur(inputs.priorYearNet)}`);
  }
  if (inputs.vatToOffset > 0) flags.push(`${text.flags.toOffset}: ${eur(inputs.vatToOffset)}`);
  return flags;
}

/** One row per expense plus the totals. */
function expenseRows(expenses: ExpenseLine[], text: PdfText): string[][] {
  const sum = (pick: (l: ExpenseLine) => number) => expenses.reduce((s, l) => s + pick(l), 0);
  const rows = expenses.map((l) => [
    `${text.kinds[l.kind]}${l.note ? ` (${text.notes[l.note]})` : ''}`,
    eur(l.amount),
    eur(l.deductible),
    eur(l.vatDeductible),
  ]);
  rows.push([
    text.total,
    eur(sum((l) => l.amount)),
    eur(sum((l) => l.deductible)),
    eur(sum((l) => l.vatDeductible)),
  ]);
  return rows;
}

/** The draft as a PDF, organised to send to an adviser. Loaded on demand: the library is large. */
export async function buildAutonomoPdf(
  draft: AutonomoDraft,
  inputs: AutonomoInputs | null,
  text: PdfText,
  dateOf: (iso: string) => string
): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const left = 40;
  let y = 48;
  const heading = (value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(value, left, y);
    y += 8;
  };
  const table = (head: string[], body: string[][], widths?: number[]) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left, right: left },
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: widths
        ? Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }]))
        : undefined,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;
  };
  const paragraph = (value: string, size = 9) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(value, 515) as string[];
    doc.text(lines, left, y);
    y += lines.length * (size + 3) + 10;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(text.title, left, y);
  y += 20;
  paragraph(`${text.subtitle} · ${text.generated}`, 10);

  table(
    [text.concept, text.amount],
    text.summary.map((s) => [`${s.model} · ${s.text}`, s.amount])
  );

  if (inputs?.manual) {
    heading(text.data);
    table(
      [text.quarter, text.income, text.withheld],
      dataRows(draft, inputs, inputs.manual, text),
      [70, 365, 80]
    );
    const flags = flagsOf(draft, inputs, text);
    if (flags.length > 0) paragraph(`${text.other}: ${flags.join(' · ')}`);
  }

  const head = [text.box, text.concept, text.amount];
  heading(text.vatAccrued);
  table(head, draft.vat.accrued.map(boxRow), [45, 380, 90]);
  heading(text.vatDeductible);
  table(head, draft.vat.deductible.map(boxRow), [45, 380, 90]);
  heading(text.vatSettlement);
  table(head, draft.vat.settlement.map(boxRow), [45, 380, 90]);

  heading(text.irpf);
  if (draft.irpf.required) table(head, draft.irpf.boxes.map(boxRow), [45, 380, 90]);
  else paragraph(text.irpfNotRequired);

  if (draft.expenses && draft.expenses.length > 0) {
    heading(text.expenses);
    table(
      [text.concept, text.paid, text.deductibleIrpf, text.deductibleVat],
      expenseRows(draft.expenses, text),
      [255, 80, 100, 80]
    );
  }

  heading(text.reta);
  paragraph(text.retaText, 10);
  heading(text.deadlines);
  table(
    ['Modelo', text.concept, 'Fecha'],
    draft.deadlines.map((d) => [d.model, d.label, dateOf(d.date)]),
    [60, 345, 110]
  );
  paragraph(text.disclaimer, 8);
  return doc.output('blob');
}
