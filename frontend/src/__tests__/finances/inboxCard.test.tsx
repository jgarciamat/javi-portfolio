import { fireEvent, screen, waitFor } from '@testing-library/react';
import { InboxCard } from '@modules/finances/ui/components/InboxCard';
import { createFakeApi } from '@test-utils/fakeApi';
import { renderWithProviders, tr } from '@test-utils/render';

const ADDRESS = 'mm-0123456789abcdef0123@facturas.winjgm.com';

afterEach(() => jest.restoreAllMocks());

describe('Receipts by e-mail card', () => {
  it('shows the private address and copies it', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderWithProviders(<InboxCard />);
    expect(await screen.findByText(ADDRESS)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('app.inbox.copy') }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
    expect(await screen.findByRole('button', { name: tr('app.inbox.copied') })).toBeInTheDocument();
  });

  it('lists what happened to the latest e-mails', async () => {
    const api = createFakeApi();
    api.inboxApi.get.mockResolvedValue({
      address: ADDRESS,
      recent: [
        {
          id: '1',
          receivedAt: '2026-03-02T10:00:00Z',
          status: 'imported',
          description: 'Mercadona',
          amount: 23.4,
        },
        {
          id: '2',
          receivedAt: '2026-03-03T10:00:00Z',
          status: 'unreadable',
          description: null,
          amount: null,
        },
      ],
    });
    renderWithProviders(<InboxCard />, { api });
    expect(await screen.findByText('Mercadona')).toBeInTheDocument();
    expect(screen.getByText(/23,40/)).toBeInTheDocument();
    expect(screen.getByText(tr('app.inbox.status.imported'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.inbox.unknown'))).toBeInTheDocument();
    expect(screen.getByText(tr('app.inbox.status.unreadable'))).toBeInTheDocument();
  });

  it('asks before changing the address, then shows the new one', async () => {
    const api = createFakeApi();
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    renderWithProviders(<InboxCard />, { api });
    await screen.findByText(ADDRESS);
    const change = screen.getByRole('button', { name: tr('app.inbox.rotate') });
    fireEvent.click(change);
    expect(api.inboxApi.rotate).not.toHaveBeenCalled();
    fireEvent.click(change);
    expect(
      await screen.findByText('mm-fedcba98765432100123@facturas.winjgm.com')
    ).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('shows why the address could not be changed', async () => {
    const api = createFakeApi();
    api.inboxApi.rotate.mockRejectedValue(new Error('Sin conexión'));
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderWithProviders(<InboxCard />, { api });
    fireEvent.click(await screen.findByRole('button', { name: tr('app.inbox.rotate') }));
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  });

  it('stays hidden until the feature is set up on the server', async () => {
    const api = createFakeApi();
    api.inboxApi.get.mockResolvedValue({ address: null, recent: [] });
    renderWithProviders(<InboxCard />, { api });
    await waitFor(() => expect(api.inboxApi.get).toHaveBeenCalled());
    expect(screen.queryByText(tr('app.inbox.title'))).toBeNull();
  });
});
