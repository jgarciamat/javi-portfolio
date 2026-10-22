import { fireEvent, screen, within } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { INSTALL_HINT_KEY } from '@core/install/iosInstall';
import { InstallGuide, InstallGuideCard } from '@shared/components/InstallGuide';
import { IosInstallHint } from '@shared/components/IosInstallHint';
import { PLAY_URL } from '@modules/landing/domain/landing';
import { renderWithI18n, tr } from '@test-utils/render';
import { UA, stubNavigator } from '@test-utils/browsers';

const originalUA = navigator.userAgent;

afterEach(() => {
  stubNavigator(originalUA, { maxTouchPoints: 0 });
  localStorage.clear();
  jest.restoreAllMocks();
});

const stepTitles = () =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

describe('the install guide', () => {
  it('starts on Google Chrome away from an iPhone and switches to Safari', () => {
    renderWithI18n(<InstallGuide />);
    expect(screen.getByText(tr('install.intro'))).toBeInTheDocument();
    const chrome = screen.getByRole('button', { name: tr('install.browser.chrome') });
    const safari = screen.getByRole('button', { name: tr('install.browser.safari') });
    expect(chrome).toHaveAttribute('aria-pressed', 'true');
    expect(stepTitles()).toEqual([
      tr('install.chrome.step1.title'),
      tr('install.chrome.step2.title'),
      tr('install.chrome.step3.title'),
    ]);
    expect(screen.getByText(tr('install.chrome.step2.body'))).toBeInTheDocument();

    fireEvent.click(safari);
    expect(safari).toHaveAttribute('aria-pressed', 'true');
    expect(chrome).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(tr('install.safari.step2.body'))).toBeInTheDocument();
    expect(screen.getByText(tr('install.safari.step3.body'))).toBeInTheDocument();
  });

  it('opens on the browser in use, and ends with Chrome or Safari, Android and the notifications', () => {
    stubNavigator(UA.iphoneSafari);
    renderWithI18n(<InstallGuide />);
    expect(screen.getByRole('button', { name: tr('install.browser.safari') })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText(tr('install.browsers'))).toBeInTheDocument();
    expect(screen.getByText(tr('install.notices'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr('install.play') })).toHaveAttribute(
      'href',
      PLAY_URL
    );
    // The drawings are decoration: the words carry the steps.
    document
      .querySelectorAll('svg.install-art')
      .forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'));
  });

  it('is in English too', () => {
    renderWithI18n(<InstallGuide />, 'en');
    expect(screen.getByText(/in Google Chrome or in Safari, in three steps/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Open finanverso.app in Google Chrome' })
    ).toBeVisible();
  });
});

describe('the install card', () => {
  it('opens the guide in a dialog that closes with either button', () => {
    renderWithI18n(<InstallGuideCard />);
    expect(screen.getByRole('heading', { name: tr('install.title') })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: tr('install.open') }));
    const dialog = screen.getByRole('dialog', { name: tr('install.title') });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
    fireEvent.click(within(dialog).getByRole('button', { name: tr('install.close') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: tr('install.open') }));
    fireEvent.click(screen.getByRole('button', { name: tr('app.common.close') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is not shown inside the mobile apps', () => {
    jest.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const { container } = renderWithI18n(<InstallGuideCard />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the install notice', () => {
  it('shows on iPhone Safari; «Ahora no» hides it for good on this device', () => {
    stubNavigator(UA.iphoneSafari);
    const { unmount } = renderWithI18n(<IosInstallHint />);
    const notice = screen.getByRole('region', { name: tr('install.hint.title.iphone') });
    expect(within(notice).getByText(tr('install.hint.body'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('install.hint.dismiss') }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(INSTALL_HINT_KEY)).toBe('dismissed');

    unmount();
    renderWithI18n(<IosInstallHint />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('shows on Chrome on an iPad; «Ver cómo» opens the guide and does not come back', () => {
    stubNavigator(UA.macSafari.replace('Version/17.5', 'CriOS/126.0 Version/17.5'));
    renderWithI18n(<IosInstallHint />);
    expect(
      screen.getByRole('heading', { name: tr('install.hint.title.ipad') })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: tr('install.hint.show') }));
    const dialog = screen.getByRole('dialog', { name: tr('install.title') });
    expect(
      within(dialog).getByRole('button', { name: tr('install.browser.chrome') })
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: tr('install.close') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(localStorage.getItem(INSTALL_HINT_KEY)).toBe('dismissed');
  });

  it.each([
    ['opened from the home screen', UA.iphoneSafari, true],
    ['in another app', UA.iphoneInstagram, false],
    ['on Android', UA.android, false],
    ['on a computer', UA.windowsChrome, false],
  ])('is not shown %s', (_, userAgent, standalone) => {
    stubNavigator(userAgent, { standalone });
    const { container } = renderWithI18n(<IosInstallHint />);
    expect(container).toBeEmptyDOMElement();
  });
});
