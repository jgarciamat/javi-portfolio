import { fireEvent, screen, waitFor } from '@testing-library/react';
import { BusinessView } from '@modules/finances/ui/views/BusinessView';
import * as reader from '@modules/finances/application/taxModelPdf';
import { createFakeApi } from '@test-utils/fakeApi';
import * as f from '@test-utils/fixtures';
import { renderWithProviders, tr } from '@test-utils/render';
import { freezeTime, restoreTime } from '@test-utils/time';

jest.mock('@modules/finances/application/taxModelPdf');
const read = reader.readImportPdf as jest.MockedFunction<typeof reader.readImportPdf>;

const open = () => {
  const api = createFakeApi();
  api.billingApi.get.mockResolvedValue(f.billing({ plan: 'premium' }));
  renderWithProviders(<BusinessView />, { api, plan: true });
};

const income = () =>
  screen.getByLabelText(`${tr('app.autonomo.income.r21')} 4`) as HTMLInputElement;
const wipeButton = () => screen.queryByRole('button', { name: tr('app.autonomo.wipe') });

beforeEach(() => {
  localStorage.clear();
  // Everything together (the assistant has its own suite).
  localStorage.setItem('mm_autonomo_assistant', 'expert');
  freezeTime('2026-10-18T12:00:00');
  read.mockReset();
});
afterEach(restoreTime);

describe('Deleting the data of the self-employed draft', () => {
  it('shows the button only once there is something to delete, and keeps the data if the user changes their mind', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    open();
    await screen.findByLabelText(tr('app.autonomo.workArea'));
    expect(wipeButton()).toBeNull();
    fireEvent.change(income(), { target: { value: '1234' } });
    fireEvent.click(wipeButton() as HTMLElement);
    expect(confirm).toHaveBeenCalledWith(tr('app.autonomo.wipeConfirm'));
    expect(income().value).toBe('1234');
    fireEvent.click(wipeButton() as HTMLElement);
    expect(income().value).toBe('');
    expect(wipeButton()).toBeNull();
    // What was kept on the device is gone too.
    expect(
      JSON.parse(localStorage.getItem('mm_autonomo_manual2') as string).quarters[3].income.r21
    ).toBe('');
  });

  it('also appears for the options outside the quarters, and clears them', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    open();
    const checkbox = (await screen.findByLabelText(
      tr('app.autonomo.hardToJustify')
    )) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(wipeButton()).toBeInTheDocument();
    fireEvent.click(wipeButton() as HTMLElement);
    // The steps are drawn again after a wipe: look the box up again.
    expect(
      (screen.getByLabelText(tr('app.autonomo.hardToJustify')) as HTMLInputElement).checked
    ).toBe(false);
    expect(wipeButton()).toBeNull();
  });

  it('shows up when a modelo 130 is imported, moves the draft to the next quarter, and wipes the message with the rest', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    read.mockResolvedValue({
      kind: 'model',
      parsed: {
        ok: true,
        data: {
          model: '130',
          year: 2026,
          quarter: 2,
          boxes: { '01': 11300, '05': 86.6, '07': 158.75 },
        },
      },
    });
    open();
    fireEvent.change(await screen.findByLabelText(tr('app.autonomo.import.files')), {
      target: { files: [new File(['%PDF'], 'modelo-130.pdf')] },
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      tr('app.autonomo.model.done.130', { year: 2026, quarter: 2, next: 3 })
    );
    // The draft is now for the third quarter of 2026: its panels are shown and the fourth's is not.
    expect(
      screen.getByRole('heading', { name: tr('app.autonomo.quarterN', { n: 3 }) })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: tr('app.autonomo.quarterN', { n: 4 }) })
    ).toBeNull();
    fireEvent.click(wipeButton() as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(wipeButton()).toBeNull();
  });
});
