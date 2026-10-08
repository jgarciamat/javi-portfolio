import { act, fireEvent, screen } from '@testing-library/react';
import { Modal } from '@shared/components/Modal';
import { EmptyState } from '@shared/components/EmptyState';
import { DateField } from '@shared/components/DateField';
import { OptionsDropdown } from '@shared/components/OptionsDropdown';
import { LanguageSwitcher } from '@shared/components/LanguageSwitcher';
import { CollapsiblePanel } from '@shared/components/CollapsiblePanel';
import { ConfirmDeleteModal } from '@shared/components/ConfirmDeleteModal';
import { UpdatePrompt } from '@shared/components/UpdatePrompt';
import { PublicHeader } from '@shared/components/PublicHeader';
import { pwaState } from '../../__mocks__/pwaRegister';
import { renderWithI18n, renderWithProviders, tr } from '@test-utils/render';

beforeEach(() => localStorage.clear());

describe('Modal', () => {
  it('closes with Escape and a backdrop mouse down, not inside', () => {
    const onClose = jest.fn();
    const { container } = renderWithI18n(
      <Modal label="Diálogo" onClose={onClose}>
        <p>contenido</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Diálogo' })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('contenido'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(container.querySelector('.modal-overlay')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ignores both while not dismissible', () => {
    const onClose = jest.fn();
    const { container } = renderWithI18n(
      <Modal label="x" onClose={onClose} dismissible={false} overlayClassName="o" className="p">
        hola
      </Modal>
    );
    fireEvent.mouseDown(container.querySelector('.o')!);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('EmptyState', () => {
  it('shows the icon and text', () => {
    renderWithI18n(<EmptyState icon="💸" text="Nada" />);
    expect(screen.getByText('Nada')).toBeInTheDocument();
  });
});

describe('DateField', () => {
  it('shows the date in the user language and opens the picker', () => {
    const onChange = jest.fn();
    const showPicker = jest.fn();
    HTMLInputElement.prototype.showPicker = showPicker;
    const { container, rerender } = renderWithI18n(
      <DateField value="2026-03-04" onChange={onChange} label="Fecha" className="extra" />
    );
    const field = screen.getByRole('button', { name: 'Fecha' });
    expect(field).toHaveTextContent('4 mar 2026');
    expect(field).toHaveClass('extra');
    fireEvent.click(field);
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.keyDown(field, { key: ' ' });
    fireEvent.keyDown(field, { key: 'a' });
    expect(showPicker).toHaveBeenCalledTimes(3);
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: '2026-03-09' },
    });
    expect(onChange).toHaveBeenCalledWith('2026-03-09');
    rerender(<DateField value="" onChange={onChange} label="Fecha" />);
    expect(screen.getByRole('button', { name: 'Fecha' })).toHaveTextContent(/^📅$/);
  });
});

describe('OptionsDropdown', () => {
  it('opens, runs an option and closes on outside click or Escape', () => {
    const onClick = jest.fn();
    renderWithI18n(
      <div>
        <OptionsDropdown
          ariaLabel="Opciones"
          options={[
            { icon: '📥', label: 'Exportar', onClick },
            { label: 'Otra', onClick: jest.fn() },
          ]}
        />
        <span>fuera</span>
      </div>
    );
    const toggle = screen.getByRole('button', { name: 'Opciones' });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('menuitem', { name: /Exportar/ }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(toggle);
    fireEvent.mouseDown(screen.getByText('fuera'));
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('LanguageSwitcher', () => {
  it('changes the language without an account', () => {
    renderWithI18n(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /Idioma: Español/ }));
    fireEvent.click(screen.getByRole('button', { name: /English/ }));
    expect(screen.getByRole('button', { name: /Language: English/ })).toBeInTheDocument();
    expect(localStorage.getItem('mm_locale')).toBe('en');
  });

  it('saves the language in the account when signed in', async () => {
    const { api } = renderWithProviders(<LanguageSwitcher />, { finances: false });
    fireEvent.click(screen.getByRole('button', { name: /Idioma/ }));
    fireEvent.click(screen.getByRole('button', { name: /English/ }));
    await act(async () => undefined);
    expect(api.settingsApi.update).toHaveBeenCalledWith({ locale: 'en' });
  });

  it('closes with Escape or a click outside', () => {
    renderWithI18n(
      <div>
        <LanguageSwitcher />
        <span>fuera</span>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /Idioma/ }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Idioma/ }));
    fireEvent.mouseDown(screen.getByText('fuera'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('CollapsiblePanel', () => {
  it('works uncontrolled and controlled', () => {
    const onToggle = jest.fn();
    const { rerender } = renderWithI18n(
      <CollapsiblePanel title="Panel" defaultOpen={false} className="x" style={{ margin: 0 }}>
        cuerpo
      </CollapsiblePanel>
    );
    const header = screen.getByRole('button', { name: 'Panel' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'true');
    rerender(
      <CollapsiblePanel title="Panel" open={false} onToggle={onToggle}>
        cuerpo
      </CollapsiblePanel>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Panel' }));
    expect(onToggle).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Panel' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('ConfirmDeleteModal', () => {
  it('confirms or cancels', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    renderWithI18n(<ConfirmDeleteModal onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: tr('app.confirm.delete.confirm') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.confirm.delete.cancel') }));
    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('UpdatePrompt', () => {
  afterEach(() => {
    pwaState.needRefresh = false;
  });

  it('is hidden until a new version is ready', () => {
    renderWithI18n(<UpdatePrompt />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('updates or dismisses', () => {
    pwaState.needRefresh = true;
    renderWithI18n(<UpdatePrompt />);
    fireEvent.click(screen.getByRole('button', { name: tr('app.update.reload') }));
    expect(pwaState.updateServiceWorker).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: tr('app.update.later') }));
    expect(pwaState.setNeedRefresh).toHaveBeenCalledWith(false);
  });
});

describe('PublicHeader', () => {
  it('shows the brand and the language picker', () => {
    renderWithI18n(<PublicHeader />);
    expect(screen.getByText(tr('app.header.title'))).toBeInTheDocument();
  });
});
