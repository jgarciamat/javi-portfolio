import { installChunkReload } from '@core/monitoring/chunkReload';

jest.mock('@shared/utils/navigation', () => ({ redirectTo: jest.fn(), reloadPage: jest.fn() }));
const { reloadPage } = jest.requireMock('@shared/utils/navigation') as { reloadPage: jest.Mock };

const fail = () => {
  const event = new Event('vite:preloadError', { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  sessionStorage.clear();
  reloadPage.mockClear();
});

describe('chunk reload after a deploy', () => {
  it('reloads once when a chunk of the old version is gone, and then lets the error show', () => {
    let time = 1_000_000;
    const uninstall = installChunkReload(() => time);
    const first = fail();
    expect(first.defaultPrevented).toBe(true);
    expect(reloadPage).toHaveBeenCalledTimes(1);

    time += 10_000; // still failing right after the reload: a real problem
    const second = fail();
    expect(second.defaultPrevented).toBe(false);
    expect(reloadPage).toHaveBeenCalledTimes(1);

    time += 120_000; // a later deploy may need another reload
    fail();
    expect(reloadPage).toHaveBeenCalledTimes(2);
    uninstall();
  });

  it('still reloads when session storage is not available', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const uninstall = installChunkReload(() => 5_000_000);
    fail();
    expect(reloadPage).toHaveBeenCalledTimes(1);
    uninstall();
    jest.restoreAllMocks();
  });
});
