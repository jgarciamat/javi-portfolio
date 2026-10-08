/** Test double of `virtual:pwa-register/react` (set `state.needRefresh` in tests). */
export const pwaState = {
  needRefresh: false,
  setNeedRefresh: jest.fn(),
  updateServiceWorker: jest.fn(),
};

export const useRegisterSW = () => ({
  needRefresh: [pwaState.needRefresh, pwaState.setNeedRefresh],
  offlineReady: [false, jest.fn()],
  updateServiceWorker: pwaState.updateServiceWorker,
});
