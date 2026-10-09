import { captureReferral, clearReferral, inviteLink, pendingReferral } from '@core/referral';

beforeEach(() => localStorage.clear());

describe('referral', () => {
  it('keeps the code of an invitation link until it is cleared', () => {
    expect(pendingReferral()).toBeUndefined();
    captureReferral('?ref=ABCD2345');
    expect(pendingReferral()).toBe('ABCD2345');
    captureReferral('?other=1'); // another visit without a code keeps the first one
    expect(pendingReferral()).toBe('ABCD2345');
    clearReferral();
    expect(pendingReferral()).toBeUndefined();
  });

  it('trims and caps what comes in the URL, and reads the real address by default', () => {
    captureReferral(`?ref=${'X'.repeat(80)}`);
    expect(pendingReferral()).toHaveLength(32);
    clearReferral();
    window.history.replaceState(null, '', '/?ref=FROMURL');
    captureReferral();
    expect(pendingReferral()).toBe('FROMURL');
    window.history.replaceState(null, '', '/');
  });

  it('builds the public link', () => {
    expect(inviteLink('A B')).toBe('https://www.winjgm.com/?ref=A%20B');
  });
});
