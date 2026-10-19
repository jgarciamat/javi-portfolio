import {
  OUT_LINKS,
  answerResidence,
  emptyResidence,
  residenceScope,
  type ResidenceForm,
} from '@modules/tools/domain/rentaResidence';

const r = (patch: Partial<ResidenceForm>): ResidenceForm => ({ ...emptyResidence(), ...patch });

// LIRPF art. 9.1 (BOE-A-2006-20764): more than 183 days, or the centre of interests, or the family
// presumption; arts. 10 and 93; the Basque Country and Navarra with their own Treasuries.
describe('who the common-regime Renta is for', () => {
  it('asks the days first, then the special situations', () => {
    expect(residenceScope('madrid', undefined)).toEqual({ kind: 'pending', missing: 'days' });
    expect(residenceScope('madrid', r({ days: 'more' }))).toEqual({
      kind: 'pending',
      missing: 'special',
    });
    expect(residenceScope('madrid', r({ days: 'more', special: 'none' }))).toEqual({
      kind: 'in',
      notes: [],
    });
  });

  it('with 183 days or fewer, the centre of interests or the family make a resident', () => {
    const less = r({ days: 'less', special: 'none' });
    expect(residenceScope('madrid', less)).toEqual({ kind: 'pending', missing: 'interests' });
    expect(residenceScope('madrid', { ...less, interests: 'yes' })).toEqual({
      kind: 'in',
      notes: [],
    });
    expect(residenceScope('madrid', { ...less, interests: 'no' })).toEqual({
      kind: 'pending',
      missing: 'family',
    });
    expect(residenceScope('madrid', { ...less, interests: 'no', family: 'yes' })).toEqual({
      kind: 'in',
      notes: ['familyPresumption'],
    });
  });

  it('sends a non-resident to the modelo 210 (persona 26: lives in France with a flat in Spain)', () => {
    const scope = residenceScope(
      'madrid',
      r({ days: 'less', interests: 'no', family: 'no', special: 'none' })
    );
    expect(scope).toEqual({ kind: 'out', reason: 'nonResident', links: OUT_LINKS.nonResident });
    expect(OUT_LINKS.nonResident[0]).toMatch(/GF00/);
  });

  it('sends the special regimes elsewhere whatever the days', () => {
    expect(residenceScope('madrid', r({ special: 'displaced' }))).toMatchObject({
      reason: 'displaced',
    });
    expect(OUT_LINKS.displaced[0]).toMatch(/G615/);
    expect(residenceScope('madrid', r({ days: 'more', special: 'abroadOfficial' }))).toMatchObject({
      reason: 'abroadOfficial',
    });
  });

  it('sends Navarra and the Basque territories to their Treasury (personas 27, p2-57 and p2-58)', () => {
    expect(residenceScope('navarra', undefined)).toMatchObject({ kind: 'out', reason: 'navarra' });
    expect(residenceScope('pais-vasco', undefined)).toMatchObject({ reason: 'basque' });
    expect(residenceScope('pais-vasco', r({ territory: 'bizkaia' }))).toMatchObject({
      reason: 'bizkaia',
      links: ['https://www.bizkaia.eus/ogasuna'],
    });
    expect(residenceScope('pais-vasco', r({ territory: 'gipuzkoa' }))).toMatchObject({
      reason: 'gipuzkoa',
    });
  });

  it('notes a move, the Canary Islands and Ceuta and Melilla', () => {
    const moved = r({ days: 'more', special: 'moved' });
    expect(residenceScope('canarias', moved)).toEqual({ kind: 'in', notes: ['moved', 'canarias'] });
    expect(residenceScope('ceuta', r({ days: 'more', special: 'none' }))).toEqual({
      kind: 'in',
      notes: ['ceutaMelilla'],
    });
    expect(residenceScope('melilla', r({ days: 'more', special: 'none' })).kind).toBe('in');
  });

  it('clears what an answer makes no longer asked', () => {
    const full = r({ days: 'less', interests: 'no', family: 'yes' });
    expect(answerResidence(full, { days: 'more' })).toMatchObject({ interests: '', family: '' });
    expect(answerResidence(full, { interests: 'yes' })).toMatchObject({
      interests: 'yes',
      family: '',
    });
    expect(answerResidence(undefined, { days: 'less' })).toEqual(r({ days: 'less' }));
    expect(answerResidence(full, { special: 'none' })).toMatchObject({
      family: 'yes',
      special: 'none',
    });
  });
});
