/** Test double of `virtual:pwa-register/react` (set `state.needRefresh` in tests). */
export const pwaState = {
  needRefresh: false,
  setNeedRefresh: jest.fn(),
  updateServiceWorker: jest.fn(),
  /** Renders of the hook: more than 0 means the service worker was registered. */
  renders: 0,
};

export const useRegisterSW = () => {
  pwaState.renders += 1;
  return {
    needRefresh: [pwaState.needRefresh, pwaState.setNeedRefresh],
    offlineReady: [false, jest.fn()],
    updateServiceWorker: pwaState.updateServiceWorker,
  };
};
