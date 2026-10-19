import type { ActivitiesResult, ActivityInput } from '@modules/tools/domain/rentaActivity';
import { activityBoxes } from '@modules/tools/domain/rentaActivityBoxes';

/** Invented activities; each result is written by hand as the engine gives it. */
const direct = (method: 'normal' | 'simplified'): ActivityInput =>
  ({ kind: 'direct', name: 'Tienda', data: { method }, withheld: 0, payments: 0 } as never);
const other = (kind: string, name: string, data: object = {}): ActivityInput =>
  ({ kind, name, data, withheld: 0, payments: 0 } as never);

const directResult = {
  income: 30000,
  expenses: 10000,
  depreciation: 1000,
  difference: 20000,
  provisions: 500,
  net: 19500,
};
const modulesResult = {
  previous: 9685.49,
  employment: 0,
  investment: 0,
  reduced: 9685.49,
  modules: 9685.49,
  general: 484.27,
  net: 9201.22,
};
const farmResult = {
  income: 40000,
  previous: 10400,
  depreciation: 400,
  reduced: 10000,
  modules: 10000,
  general: 500,
  young: 0,
  net: 9500,
};

const pairs = (groups: ReturnType<typeof activityBoxes>) =>
  groups.map((g) => [g.name, g.boxes.map((b) => [b.box, b.amount])]);

describe('the boxes of the activities, box by box', () => {
  it('gives the direct estimation by its modality and the totals with the reductions', () => {
    const result: ActivitiesResult = {
      direct: 19500,
      dependentReduction: 2000,
      smallIncomeReduction: 0,
      startReduction: 3500,
      directTotal: 14000,
      modules: 0,
      agrarian: 0,
      total: 14000,
      withheld: 1200,
      payments: 600,
      each: [{ name: 'Tienda', net: 19500, detail: directResult }],
    };
    expect(pairs(activityBoxes([direct('normal')], result))).toEqual([
      [
        'Tienda',
        [
          ['0180', 30000],
          ['0218', 10000],
          ['0219', 500],
          ['0220', 10500],
          ['0224', 19500],
          ['0226', 19500],
        ],
      ],
      [
        null,
        [
          ['0231', 19500],
          ['0232', 2000],
          ['0234', 3500],
          ['0235', 14000],
          ['0599', 1200],
          ['0604', 600],
        ],
      ],
    ]);
    const simplified = activityBoxes([direct('simplified')], result)[0].boxes.map((b) => b.box);
    expect(simplified).toEqual(['0180', '0218', '0221', '0222', '0223', '0224', '0226']);
    expect(activityBoxes([direct('simplified')], result)[0].boxes[0].label).toBe(
      'Total ingresos computables'
    );
  });

  it('gives the módulos and the farming in módulos, with the 32.2.3.º reduction of each', () => {
    const result: ActivitiesResult = {
      direct: 0,
      dependentReduction: 0,
      smallIncomeReduction: 300,
      startReduction: 0,
      directTotal: 0,
      modules: 8901.22,
      agrarian: 9500,
      total: 18401.22,
      withheld: 0,
      payments: 400,
      each: [
        { name: 'Taxi', net: 9201.22, detail: modulesResult },
        { name: 'Huerta', net: 9500, detail: farmResult },
      ],
    };
    const groups = activityBoxes([other('modules', 'Taxi'), other('agrarian', 'Huerta')], result);
    expect(pairs(groups)).toEqual([
      [
        'Taxi',
        [
          ['1465', 9685.49],
          ['1468', 9685.49],
          ['1474', 9685.49],
          ['1475', 484.27],
          ['1479', 9201.22],
          ['1481', 9201.22],
        ],
      ],
      [
        'Huerta',
        [
          ['1536', 40000],
          ['1537', 10400],
          ['1538', 400],
          ['1539', 10000],
          ['1548', 10000],
          ['1549', 500],
          ['1553', 9500],
          ['1555', 9500],
        ],
      ],
      [
        null,
        [
          ['1482', 9201.22],
          ['1483', 300],
          ['1484', 8901.22],
          ['1558', 9500],
          ['1560', 9500],
          ['0604', 400],
        ],
      ],
    ]);
  });

  it('gives the net only of an activity already worked out, by its area', () => {
    const list = [
      other('given', 'A', { area: 'direct', net: 100 }),
      other('given', 'B', { area: 'modules', net: 200 }),
      other('given', 'C', { area: 'agrarian', net: 300 }),
    ];
    const result: ActivitiesResult = {
      direct: 100,
      dependentReduction: 0,
      smallIncomeReduction: 0,
      startReduction: 0,
      directTotal: 100,
      modules: 200,
      agrarian: 300,
      total: 600,
      withheld: 0,
      payments: 0,
      each: [
        { name: 'A', net: 100, detail: { net: 100 } },
        { name: 'B', net: 200, detail: { net: 200 } },
        { name: 'C', net: 300, detail: { net: 300 } },
      ],
    };
    expect(pairs(activityBoxes(list, result)).slice(0, 3)).toEqual([
      [
        'A',
        [
          ['0224', 100],
          ['0226', 100],
        ],
      ],
      [
        'B',
        [
          ['1479', 200],
          ['1481', 200],
        ],
      ],
      [
        'C',
        [
          ['1553', 300],
          ['1555', 300],
        ],
      ],
    ]);
  });
});
