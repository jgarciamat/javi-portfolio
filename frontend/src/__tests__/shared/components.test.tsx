import { useState } from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
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

describe('Modal focus and keyboard', () => {
  function Opener({ autoFocus = false }: { autoFocus?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>abrir</button>
        {open && (
          <Modal label="Diálogo" onClose={() => setOpen(false)}>
            <input aria-label="campo" autoFocus={autoFocus} />
            <button>último</button>
          </Modal>
        )}
      </>
    );
  }

  /** Presses Tab on the focused element; true when the dialog moved focus itself. */
  const tab = (shiftKey = false) =>
    !fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey });

  it('moves focus into the dialog and gives it back on close', () => {
    renderWithI18n(<Opener />);
    const trigger = screen.getByRole('button', { name: 'abrir' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('leaves focus on a field that asked for it', () => {
    renderWithI18n(<Opener autoFocus />);
    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    expect(screen.getByRole('textbox', { name: 'campo' })).toHaveFocus();
  });

  it('keeps Tab inside the dialog', () => {
    renderWithI18n(<Opener />);
    fireEvent.click(screen.getByRole('button', { name: 'abrir' }));
    const field = screen.getByRole('textbox', { name: 'campo' });
    const last = screen.getByRole('button', { name: 'último' });

    expect(tab(true)).toBe(true); // from the panel itself, backwards → last
    expect(last).toHaveFocus();
    expect(tab()).toBe(true); // forwards from the last → first
    expect(field).toHaveFocus();
    expect(tab()).toBe(false); // in the middle: the browser moves focus
    expect(tab(true)).toBe(true); // backwards from the first → last
    expect(last).toHaveFocus();

    screen.getByRole('button', { name: 'abrir' }).focus(); // focus escaped the dialog
    expect(tab()).toBe(true);
    expect(field).toHaveFocus();
    expect(fireEvent.keyDown(field, { key: 'Enter' })).toBe(true);
  });

  it('keeps focus on a dialog with nothing focusable', () => {
    renderWithI18n(
      <Modal label="Vacío" onClose={() => undefined}>
        <p>solo texto</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(tab()).toBe(true);
    expect(dialog).toHaveFocus();
  });

  it('lets only the innermost of nested dialogs react', () => {
    const closeOuter = jest.fn();
    function Nested() {
      const [inner, setInner] = useState(true);
      return (
        <Modal label="Fuera" onClose={closeOuter}>
          <button>fuera</button>
          {inner && (
            <Modal label="Dentro" onClose={() => setInner(false)}>
              <button>dentro</button>
            </Modal>
          )}
        </Modal>
      );
    }
    renderWithI18n(<Nested />);
    const inside = screen.getByRole('button', { name: 'dentro' });
    inside.focus();
    // The outer dialog would send focus to its first button; the inner one keeps it.
    expect(tab()).toBe(true);
    expect(inside).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Dentro' })).toBeNull();
    expect(closeOuter).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeOuter).toHaveBeenCalledTimes(1);
  });
});

describe('EmptyState', () => {
  it('shows the icon and text', () => {
    renderWithI18n(<EmptyState icon="💸" text="Nada" />);
    expect(screen.getByText('Nada')).toBeInTheDocument();
  });
});

describe('DateField', () => {
  it('is a button named after the date that opens the picker', () => {
    const onChange = jest.fn();
    const showPicker = jest.fn();
    HTMLInputElement.prototype.showPicker = showPicker;
    const { container, rerender } = renderWithI18n(
      <DateField value="2026-03-04" onChange={onChange} label="Fecha" className="extra" />
    );
    const field = screen.getByRole('button', { name: 'Fecha: 4 mar 2026' });
    expect(field.tagName).toBe('BUTTON');
    expect(field).toHaveTextContent('4 mar 2026');
    expect(container.firstElementChild).toHaveClass('extra');
    // The native input is beside the button, not inside it.
    const native = container.querySelector('input[type="date"]')!;
    expect(field).not.toContainElement(native as HTMLElement);
    fireEvent.click(field);
    fireEvent.click(native);
    expect(showPicker).toHaveBeenCalledTimes(2);
    fireEvent.change(native, { target: { value: '2026-03-09' } });
    expect(onChange).toHaveBeenCalledWith('2026-03-09');
    rerender(<DateField value="" onChange={onChange} label="Fecha" />);
    // An empty date shows the calendar icon instead of a date.
    expect(screen.getByRole('button', { name: 'Fecha' })).toHaveTextContent(/^$/);
    expect(screen.getByRole('button', { name: 'Fecha' }).querySelector('svg')).not.toBeNull();
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
    // A disclosure with plain buttons: no menu roles that would promise arrow keys.
    expect(toggle).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Exportar/ }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Exportar/ })).toBeNull();
    // The list is gone: focus goes back to the toggle instead of the page.
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    fireEvent.mouseDown(screen.getByText('fuera'));
    expect(screen.queryByRole('button', { name: /Exportar/ })).toBeNull();
    fireEvent.click(toggle);
    screen.getByRole('button', { name: 'Otra' }).focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('button', { name: /Exportar/ })).toBeNull();
    expect(toggle).toHaveFocus();
  });
});

describe('LanguageSwitcher', () => {
  it('changes the language without an account', () => {
    renderWithI18n(<LanguageSwitcher />);
    const toggle = screen.getByRole('button', { name: /Idioma: Español/ });
    fireEvent.click(toggle);
    expect(screen.queryByRole('listbox')).toBeNull();
    // The current language is marked; each name is in its own language.
    expect(screen.getByRole('button', { name: /Español/, current: true })).toHaveAttribute(
      'lang',
      'es'
    );
    fireEvent.click(screen.getByRole('button', { name: /English/ }));
    expect(screen.getByRole('button', { name: /Language: English/ })).toHaveFocus();
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
    expect(screen.queryByRole('button', { name: /English/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Idioma/ })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: /Idioma/ }));
    fireEvent.mouseDown(screen.getByText('fuera'));
    expect(screen.queryByRole('button', { name: /English/ })).toBeNull();
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

  describe('in the mobile app', () => {
    beforeEach(() => jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true));
    afterEach(() => {
      jest.restoreAllMocks();
      delete (navigator as { serviceWorker?: unknown }).serviceWorker;
    });

    it('never offers an update and drops the service worker of older versions', async () => {
      const unregister = jest.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { getRegistrations: jest.fn().mockResolvedValue([{ unregister }]) },
      });
      pwaState.needRefresh = true;
      renderWithI18n(<UpdatePrompt />);
      expect(screen.queryByRole('status')).toBeNull();
      await waitFor(() => expect(unregister).toHaveBeenCalled());
    });

    it('does nothing where service workers do not exist', () => {
      renderWithI18n(<UpdatePrompt />);
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});

describe('PublicHeader', () => {
  it('shows the brand and the language picker', () => {
    renderWithProviders(<PublicHeader />, { authenticated: false });
    expect(screen.getByText(tr('app.header.title'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('app.header.title') })).toHaveAttribute('href', '/');
  });
});
