import {
  CREATOR_CLAWBACK_DAYS,
  CreatorProgram,
  CreatorProgramConfig,
  classifySales,
  normalizeCreatorCode,
} from '@application/creators/CreatorProgram';
import { CreatorAffiliateRecord, CreatorSaleRecord } from '@domain/ports/repositories';
import { openDatabase, Db } from '@infrastructure/sqlite/database';
import { migrate } from '@infrastructure/sqlite/migrator';
import { migrations } from '@infrastructure/sqlite/migrations';
import { SqliteCreatorRepository } from '@infrastructure/sqlite/repositories/SqliteCreatorRepository';
import { formatCreatorReport, runCreatorsCommand } from '@infrastructure/sqlite/creatorsCli';
import { MutableClock } from '../helpers/testApp';

const DAY = 24 * 60 * 60 * 1000;

const CONFIG: CreatorProgramConfig = {
  enabled: true,
  commissionCents: { monthly: 200, yearly: 700, lifetime: 1000 },
  creatorCapCents: 30000,
  globalCapCents: 150000,
  windowDays: 90,
  holdDays: 45,
};

function setup(config: Partial<CreatorProgramConfig> = {}) {
  const db: Db = openDatabase(':memory:');
  migrate(db, migrations);
  const clock = new MutableClock(new Date('2026-03-01T10:00:00Z'));
  const repo = new SqliteCreatorRepository(db);
  const program = new CreatorProgram(repo, clock, { ...CONFIG, ...config });
  const addUser = (id: string) =>
    db
      .prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)')
      .run(id, `${id}@test.dev`, id, '2026-01-01T00:00:00Z');
  const later = (days: number) =>
    clock.set(new Date(clock.now().getTime() + days * DAY).toISOString());
  return { db, clock, repo, program, addUser, later };
}

const affiliate = (code: string, capCents: number | null = null): CreatorAffiliateRecord => ({
  code,
  name: code.toLowerCase(),
  capCents,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
});

let nextId = 0;
const sale = (extra: Partial<CreatorSaleRecord> = {}): CreatorSaleRecord => ({
  id: ++nextId,
  code: 'ANA',
  plan: 'yearly',
  provider: 'stripe',
  commissionCents: 700,
  soldAt: '2026-01-10T00:00:00Z',
  reversedAt: null,
  paidAt: null,
  paidCents: null,
  clawedAt: null,
  ...extra,
});

describe('creator codes', () => {
  it('accepts 3 to 20 letters or digits, in any case', () => {
    expect(normalizeCreatorCode(' javi24 ')).toBe('JAVI24');
    expect(normalizeCreatorCode('AB')).toBeNull();
    expect(normalizeCreatorCode('A'.repeat(21))).toBeNull();
    expect(normalizeCreatorCode('ANA-1')).toBeNull();
    expect(normalizeCreatorCode('ÑANDÚ')).toBeNull();
  });
});

describe('CreatorProgram', () => {
  it('attributes a new user only with consent, while on, to an active creator', () => {
    const { program, repo, addUser } = setup();
    program.addAffiliate('ana', 'Ana Finanzas', null);
    program.addAffiliate('OLD', 'Old', null);
    program.setActive('old', false);
    for (const id of ['u1', 'u2', 'u3', 'u4', 'u5']) addUser(id);

    program.attach('u1', 'ana', false); // no consent
    program.attach('u2', 'NOPE', true); // unknown
    program.attach('u3', 'OLD', true); // inactive
    program.attach('u4', '<script>', true); // not a code
    expect(repo.signupsByCode()).toEqual({});

    program.attach('u5', ' ana ', true);
    expect(repo.attributionOf('u5')).toEqual({
      code: 'ANA',
      createdAt: '2026-03-01T10:00:00.000Z',
    });
    program.attach('u5', 'ana', true); // once
    expect(repo.signupsByCode()).toEqual({ ANA: 1 });
  });

  it('does nothing new while the program is off, but still records reversals', () => {
    const on = setup();
    on.program.addAffiliate('ANA', 'Ana', null);
    on.addUser('u1');
    on.program.attach('u1', 'ANA', true);
    on.program.recordSale('u1', 'yearly', 'stripe');

    const off = new CreatorProgram(on.repo, on.clock, { ...CONFIG, enabled: false });
    on.addUser('u2');
    off.attach('u2', 'ANA', true);
    expect(on.repo.attributionOf('u2')).toBeNull();
    off.recordSale('u2', 'yearly', 'stripe');
    off.reverseSale('u1');
    expect(on.repo.saleOf('u1')!.reversedAt).not.toBeNull();
  });

  it('counts only the first paid purchase within the attribution window', () => {
    const { program, repo, addUser, later } = setup();
    program.addAffiliate('ANA', 'Ana', null);
    for (const id of ['u1', 'u2', 'u3']) addUser(id);
    program.attach('u1', 'ANA', true);
    program.attach('u2', 'ANA', true);

    program.recordSale('u3', 'yearly', 'stripe'); // not attributed
    later(30);
    program.recordSale('u1', 'monthly', 'google');
    program.recordSale('u1', 'yearly', 'stripe'); // a later change of plan does not count
    expect(repo.saleOf('u1')).toMatchObject({
      code: 'ANA',
      plan: 'monthly',
      provider: 'google',
      commissionCents: 200,
    });
    later(61); // 91 days after the sign-up
    program.recordSale('u2', 'yearly', 'stripe');
    expect(repo.saleOf('u2')).toBeNull();
    expect(repo.saleOf('u3')).toBeNull();
  });

  it('takes the commission back for refunds within the clawback period only', () => {
    const { program, repo, addUser, later } = setup();
    program.addAffiliate('ANA', 'Ana', null);
    for (const id of ['u1', 'u2']) addUser(id);
    program.attach('u1', 'ANA', true);
    program.attach('u2', 'ANA', true);
    program.recordSale('u1', 'yearly', 'stripe');
    program.recordSale('u2', 'yearly', 'stripe');
    program.reverseSale('nobody');

    later(10);
    program.reverseSale('u1');
    const reversed = repo.saleOf('u1')!.reversedAt;
    later(1);
    program.reverseSale('u1'); // the first date stays
    expect(repo.saleOf('u1')!.reversedAt).toBe(reversed);

    later(CREATOR_CLAWBACK_DAYS); // a refund of a later renewal, long after
    program.reverseSale('u2');
    expect(repo.saleOf('u2')!.reversedAt).toBeNull();
  });

  it('forgets the attribution and keeps the sale only as an anonymous record', () => {
    const { program, repo, addUser, db } = setup();
    program.addAffiliate('ANA', 'Ana', null);
    addUser('u1');
    program.attach('u1', 'ANA', true);
    program.recordSale('u1', 'lifetime', 'stripe');
    program.forget('u1');
    expect(repo.attributionOf('u1')).toBeNull();
    expect(repo.saleOf('u1')).toBeNull();
    expect(repo.sales()).toHaveLength(1);
    expect(db.prepare('SELECT user_id FROM creator_sales').pluck().get()).toBeNull();
  });

  it('keeps a sale when the account is deleted, without the user', () => {
    const { program, repo, addUser, db } = setup();
    program.addAffiliate('ANA', 'Ana', null);
    addUser('u1');
    program.attach('u1', 'ANA', true);
    program.recordSale('u1', 'yearly', 'google');
    db.prepare('DELETE FROM users WHERE id = ?').run('u1');
    expect(repo.signupsByCode()).toEqual({});
    expect(repo.sales()).toHaveLength(1);
  });

  it('validates new creators and codes', () => {
    const { program } = setup();
    expect(() => program.addAffiliate('a', 'Ana', null)).toThrow('3 a 20');
    expect(() => program.addAffiliate('ANA', '  ', null)).toThrow('Falta el nombre');
    program.addAffiliate('ANA', 'Ana', 5000);
    expect(() => program.addAffiliate('ana', 'Otra', null)).toThrow('ya existe');
    expect(() => program.setActive('BOB', false)).toThrow('Código desconocido');
    expect(() => program.setActive('?', false)).toThrow('Código desconocido');
    expect(() => program.markPaid('BOB')).toThrow('Código desconocido');
  });

  it('stores creators switched off', () => {
    const { repo } = setup();
    expect(repo.addAffiliate({ ...affiliate('ZED'), active: false })).toBe(true);
    expect(repo.affiliate('ZED')).toMatchObject({ active: false, capCents: null });
  });

  it('reports what is owed and records a manual payment, with clawbacks', () => {
    const { program, addUser, later } = setup();
    program.addAffiliate('ANA', 'Ana', null);
    program.addAffiliate('BOB', 'Bob', null);
    for (const id of ['u1', 'u2', 'u3']) addUser(id);
    for (const id of ['u1', 'u2']) program.attach(id, 'ANA', true);
    program.attach('u3', 'BOB', true);
    program.recordSale('u1', 'yearly', 'stripe');
    program.recordSale('u2', 'monthly', 'google');

    let ana = program.report().creators[0];
    expect(ana).toMatchObject({ signups: 2, sales: 2, pending: 2, pendingCents: 900, netCents: 0 });
    expect(program.markPaid('ANA')).toBe(0); // still waiting

    later(46);
    ana = program.report().creators[0];
    expect(ana).toMatchObject({ payable: 2, payableCents: 900, netCents: 900 });
    expect(program.markPaid('ana')).toBe(900);
    ana = program.report().creators[0];
    expect(ana).toMatchObject({ paid: 2, paidCents: 900, payableCents: 0, netCents: 0 });

    program.reverseSale('u1'); // refunded after being paid: 7 € to deduct
    ana = program.report().creators[0];
    expect(ana).toMatchObject({ reversed: 1, clawbackCents: 700, netCents: 0, paidCents: 200 });
    expect(program.markPaid('ANA')).toBe(0); // the deduction waits for the next payment

    expect(program.report().creators[1]).toMatchObject({ signups: 1, sales: 0, netCents: 0 });
  });

  it('settles a clawback with the next payment', () => {
    const { program, addUser, later, repo } = setup();
    program.addAffiliate('ANA', 'Ana', null);
    for (const id of ['u1', 'u2']) addUser(id);
    for (const id of ['u1', 'u2']) program.attach(id, 'ANA', true);
    program.recordSale('u1', 'monthly', 'stripe');
    later(46);
    program.markPaid('ANA');
    program.reverseSale('u1');
    program.recordSale('u2', 'yearly', 'stripe');
    later(46);
    expect(program.report().creators[0]).toMatchObject({
      payableCents: 700,
      clawbackCents: 200,
      netCents: 500,
    });
    expect(program.markPaid('ANA')).toBe(500);
    const [first, second] = repo.sales();
    expect(first.clawedAt).not.toBeNull();
    expect(second).toMatchObject({ paidCents: 700 });
    expect(program.report().creators[0]).toMatchObject({ netCents: 0, clawbackCents: 0 });
  });
});

describe('classifySales (caps per calendar year)', () => {
  const now = new Date('2026-06-01T00:00:00Z');

  it('stops at the creator cap, with a partial last commission, and starts again next year', () => {
    const lines = classifySales(
      [
        sale({ soldAt: '2026-01-01T00:00:00Z' }),
        sale({ soldAt: '2026-01-02T00:00:00Z' }),
        sale({ soldAt: '2026-01-03T00:00:00Z' }),
        sale({ soldAt: '2027-01-01T00:00:00Z' }),
      ],
      [affiliate('ANA', 1000)],
      CONFIG,
      new Date('2027-01-20T00:00:00Z')
    ).lines;
    expect(lines.map((l) => [l.status, l.cents])).toEqual([
      ['payable', 700],
      ['payable', 300],
      ['over_cap', 0],
      ['pending', 700],
    ]);
  });

  it('applies the global cap across creators, and the default cap without one', () => {
    const { lines, globalUsedCents } = classifySales(
      [
        sale({ code: 'ANA' }),
        sale({ code: 'BOB', soldAt: '2026-01-11T00:00:00Z' }),
        sale({ code: 'GONE', soldAt: '2026-01-12T00:00:00Z' }),
      ],
      [affiliate('ANA'), affiliate('BOB')],
      { ...CONFIG, globalCapCents: 1000, creatorCapCents: 600 },
      now
    );
    expect(lines.map((l) => [l.sale.code, l.status, l.cents])).toEqual([
      ['ANA', 'payable', 600],
      ['BOB', 'payable', 400],
      ['GONE', 'over_cap', 0],
    ]);
    expect(globalUsedCents).toEqual({ '2026': 1000 });
  });

  it('counts paid sales first, ignores reversed ones and keeps unsettled clawbacks', () => {
    const lines = classifySales(
      [
        sale({ soldAt: '2026-01-01T00:00:00Z' }),
        sale({ soldAt: '2026-01-02T00:00:00Z', reversedAt: '2026-01-05T00:00:00Z' }),
        sale({
          soldAt: '2026-01-03T00:00:00Z',
          paidAt: '2026-03-01T00:00:00Z',
          paidCents: 700,
          reversedAt: '2026-03-02T00:00:00Z',
        }),
        sale({
          soldAt: '2026-01-04T00:00:00Z',
          paidAt: '2026-03-01T00:00:00Z',
          paidCents: null,
          reversedAt: '2026-03-02T00:00:00Z',
          clawedAt: '2026-04-01T00:00:00Z',
        }),
        sale({ soldAt: '2026-01-05T00:00:00Z', paidAt: '2026-03-01T00:00:00Z', paidCents: 700 }),
        sale({ soldAt: '2026-01-06T00:00:00Z', paidAt: '2026-03-01T00:00:00Z' }),
      ],
      [affiliate('ANA', 1000)],
      CONFIG,
      now
    ).lines;
    expect(lines.map((l) => [l.status, l.cents])).toEqual([
      ['payable', 300],
      ['reversed', 0],
      ['clawback', 700],
      ['reversed', 0],
      ['paid', 700],
      ['paid', 0],
    ]);
    const unpaidClawback = classifySales(
      [sale({ paidAt: '2026-03-01T00:00:00Z', reversedAt: '2026-03-02T00:00:00Z' })],
      [affiliate('ANA')],
      CONFIG,
      now
    ).lines;
    expect(unpaidClawback[0]).toMatchObject({ status: 'clawback', cents: 0 });
  });
});

describe('creators command line', () => {
  const cli = () => {
    const ctx = setup();
    const users = new Map([['ana@test.dev', 'u1']]);
    const run = (...args: string[]) =>
      runCreatorsCommand(
        { program: ctx.program, userIdByEmail: (email) => users.get(email) ?? null },
        args
      );
    return { ...ctx, run };
  };

  it('adds creators, switches them off and on, and reports them', () => {
    const { run, addUser, program, later } = cli();
    expect(run()).toContain('(sin creadores');
    expect(run('add', 'ana', 'Ana Finanzas')).toBe(
      'Alta: ANA (Ana Finanzas). Enlace: https://finanverso.app/?aff=ANA'
    );
    expect(run('add', 'BOB', 'Bob', '12,5')).toContain('Alta: BOB');
    expect(() => run('add', 'CAT', 'Cat', 'mucho')).toThrow('número de euros');
    expect(() => run('add', 'CAT')).toThrow('Uso:');
    expect(run('off', 'bob')).toBe('BOB: desactivado');
    expect(run('on', 'bob')).toBe('BOB: activado');
    run('off', 'bob');
    expect(() => run('off')).toThrow('Uso:');

    addUser('u1');
    program.attach('u1', 'ANA', true);
    program.recordSale('u1', 'yearly', 'google');
    const report = run('report');
    expect(report).toContain('Programa de creadores: ACTIVADO');
    expect(report).toContain('anual 7,00 €');
    expect(report).toContain('2026: 7,00 € del tope global comprometidos');
    expect(report).toContain('BOB (off)');
    expect(report).not.toContain('u1');
    expect(run('report', 'zzz')).toContain('Código desconocido: zzz');
    expect(run('report', 'bob')).toContain('(ninguna)');
    const detail = run('report', 'ana');
    expect(detail).toContain('Ventas de ANA (Ana Finanzas):');
    expect(detail).toMatch(/2026-03-01 +anual +Play +7,00 € +en espera/);

    expect(run('paid', 'ana')).toBe('Nada que pagar ahora a ANA.');
    later(46);
    expect(run('paid', 'ana')).toBe(
      'Apuntado como pagado: 7,00 € a ANA. Guarda su factura o recibo.'
    );
    expect(run('report', 'ANA')).toContain('pagada');
    expect(() => run('paid')).toThrow('Uso:');
    expect(() => run('nope')).toThrow('Uso:');
  });

  it('forgets a user by e-mail', () => {
    const { run, addUser, program, repo } = cli();
    run('add', 'ANA', 'Ana');
    addUser('u1');
    program.attach('u1', 'ANA', true);
    expect(run('forget', 'nadie@test.dev')).toBe('No hay ninguna cuenta con ese email.');
    expect(run('forget', ' ANA@test.dev ')).toContain('Atribución retirada');
    expect(repo.attributionOf('u1')).toBeNull();
    expect(() => run('forget')).toThrow('Uso:');
  });

  it('labels every status and the program switched off', () => {
    const text = formatCreatorReport(
      {
        enabled: false,
        config: CONFIG,
        globalUsedCents: {},
        creators: [
          {
            affiliate: affiliate('ANA'),
            signups: 0,
            sales: 0,
            pending: 0,
            payable: 0,
            paid: 0,
            reversed: 0,
            overCap: 0,
            pendingCents: 0,
            payableCents: 0,
            paidCents: 0,
            clawbackCents: 0,
            netCents: 0,
            lines: (['payable', 'reversed', 'clawback', 'over_cap'] as const).map((status) => ({
              sale: sale({ plan: 'lifetime' }),
              status,
              cents: 0,
            })),
          },
        ],
      },
      'ANA'
    );
    expect(text).toContain('APAGADO');
    for (const label of ['a pagar', 'devuelta', 'a descontar', 'sobre el tope', 'vitalicio']) {
      expect(text).toContain(label);
    }
    expect(text).toContain('Stripe');
  });
});
