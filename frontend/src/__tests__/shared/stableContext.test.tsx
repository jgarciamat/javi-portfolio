import * as React from 'react';
import { screen } from '@testing-library/react';
import * as stable from '@shared/utils/stableContext';
import { stableContext } from '@shared/utils/stableContext';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';

describe('stableContext', () => {
  it('gives back the same context for the same name, and a different one for another', () => {
    const first = stableContext<number | null>('TestContext', null);
    expect(stableContext<number | null>('TestContext', null)).toBe(first);
    expect(first.displayName).toBe('TestContext');
    expect(stableContext<number | null>('OtherTestContext', null)).not.toBe(first);
  });
});

describe('hot reload of a provider module', () => {
  /**
   * The crash seen in the local demo: hot reload ran PlanContext.tsx again, and «Tu plan»
   * (loaded lazily afterwards) used the new module's `usePlan` under the provider that was
   * already mounted, so it threw "usePlan must be used inside PlanProvider".
   */
  it('lets a section loaded after the reload use the provider already mounted', async () => {
    type PlanModule = typeof import('@modules/billing/application/PlanContext');
    let reloaded!: PlanModule;
    jest.isolateModules(() => {
      // Same React and same registry, everything else runs again (as hot reload does).
      jest.doMock('react', () => React);
      jest.doMock('@shared/utils/stableContext', () => stable);
      reloaded = jest.requireActual('@modules/billing/application/PlanContext');
    });

    function LateSection() {
      const { overview } = reloaded.usePlan();
      return <p>{overview ? overview.plan : tr('app.common.loading')}</p>;
    }
    const api = createFakeApi();
    api.billingApi.get.mockResolvedValue(f.billing());
    renderWithProviders(<LateSection />, { api, plan: true, finances: false });
    expect(await screen.findByText(f.billing().plan)).toBeInTheDocument();
  });
});
