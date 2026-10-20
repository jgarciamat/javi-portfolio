import { removeLegacyAcquisition } from '@core/acquisition';

describe('removeLegacyAcquisition', () => {
  it('deletes the key that earlier versions stored and leaves the rest', () => {
    localStorage.setItem('mm_acq', 'reddit');
    localStorage.setItem('mm_theme', 'dark');
    removeLegacyAcquisition();
    expect(localStorage.getItem('mm_acq')).toBeNull();
    expect(localStorage.getItem('mm_theme')).toBe('dark');
    removeLegacyAcquisition();
    expect(localStorage.getItem('mm_acq')).toBeNull();
  });
});
