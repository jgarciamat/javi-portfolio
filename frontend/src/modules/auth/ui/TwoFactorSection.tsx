import { useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { downloadFile } from '@modules/finances/application/hooks/useExportCSV';
import { Icon } from '@shared/components/Icon';
import { QrCode } from '@shared/components/QrCode';
import { useAuth } from '@shared/hooks/useAuth';
import { formatDate } from '@shared/utils/format';
import { useTwoFactorSettings } from '../application/useTwoFactorSettings';
import type { TwoFactorProof, TwoFactorSetup } from '../domain/types';
import { AuthPasswordInput } from './AuthPasswordInput';
import './css/TwoFactor.css';

type Settings = ReturnType<typeof useTwoFactorSettings>;

/** "JBSW Y3DP …": the key in groups of four, easier to type by hand. */
const groupKey = (secret: string) => secret.match(/.{1,4}/g)!.join(' ');

/** A button that copies `text` and says so for a moment. */
function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false)
    );
  };
  return (
    <button type="button" className="btn-secondary" onClick={copy}>
      <Icon name={copied ? 'checkCircle' : 'clipboard'} />{' '}
      {copied ? t('app.twoFactor.copied') : label}
    </button>
  );
}

/** The 6-digit field of the app, as the phones expect it (numeric keypad, SMS/app autofill). */
function CodeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        className="tx-input two-factor-code-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
    </label>
  );
}

/** A form of the card: Enter or the main button submits it. */
function StepForm({
  settings,
  submitLabel,
  onSubmit,
  children,
}: {
  settings: Settings;
  submitLabel: string;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="button-row">
        <button type="submit" className="btn-primary" aria-disabled={settings.pending}>
          {submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={settings.close}>
          {t('app.common.cancel')}
        </button>
      </div>
    </form>
  );
}

/** Before showing a secret: the password (Google-only accounts use their recent sign-in). */
function IdentityStep({ settings, hasPassword }: { settings: Settings; hasPassword: boolean }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  return (
    <StepForm
      settings={settings}
      submitLabel={t('app.twoFactor.identity.continue')}
      onSubmit={() => void settings.start(hasPassword ? { password } : {})}
    >
      {hasPassword ? (
        <div className="field">
          <label className="field-label" htmlFor="two-factor-password">
            {t('app.twoFactor.identity.password')}
          </label>
          <AuthPasswordInput
            id="two-factor-password"
            value={password}
            onChange={setPassword}
            placeholder={t('app.auth.login.password')}
            autoComplete="current-password"
          />
        </div>
      ) : (
        <p className="section-hint">{t('app.twoFactor.identity.google')}</p>
      )}
    </StepForm>
  );
}

/** QR code, the key to type by hand and the first code of the app. */
function ScanStep({ settings }: { settings: Settings }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const setup = settings.setup as TwoFactorSetup;
  return (
    <StepForm
      settings={settings}
      submitLabel={t('app.twoFactor.scan.activate')}
      onSubmit={() => void settings.confirm(code)}
    >
      <ol className="two-factor-steps">
        <li>{t('app.twoFactor.scan.step1')}</li>
        <li>{t('app.twoFactor.scan.step2')}</li>
        <li>{t('app.twoFactor.scan.step3')}</li>
      </ol>
      <div className="two-factor-qr">
        <QrCode text={setup.otpauthUri} label={t('app.twoFactor.scan.qrLabel')} />
      </div>
      <p className="section-hint">{t('app.twoFactor.scan.manual')}</p>
      <div className="two-factor-key-row">
        <code className="two-factor-key" aria-label={t('app.twoFactor.scan.keyLabel')}>
          {groupKey(setup.secret)}
        </code>
        <CopyButton text={setup.secret} label={t('app.twoFactor.scan.copyKey')} />
      </div>
      <CodeField
        id="two-factor-setup-code"
        label={t('app.twoFactor.scan.codeLabel')}
        value={code}
        onChange={setCode}
      />
    </StepForm>
  );
}

/** The recovery codes, shown once: copy, download or write them down. */
function RecoveryCodes({ settings }: { settings: Settings }) {
  const { t } = useI18n();
  const text = settings.recoveryCodes.join('\n');
  return (
    <div className="form-grid">
      <p className="section-success" role="status">
        <Icon name="checkCircle" /> {t('app.twoFactor.codes.ready')}
      </p>
      <p className="section-hint">{t('app.twoFactor.codes.hint')}</p>
      <ul className="two-factor-codes" aria-label={t('app.twoFactor.codes.listLabel')}>
        {settings.recoveryCodes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <CopyButton text={text} label={t('app.twoFactor.codes.copy')} />
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            downloadFile(
              `${t('app.twoFactor.codes.fileTitle')}\n\n${text}\n`,
              'finanverso-recovery-codes.txt',
              'text/plain'
            )
          }
        >
          <Icon name="download" /> {t('app.twoFactor.codes.download')}
        </button>
        <button type="button" className="btn-primary" onClick={settings.close}>
          {t('app.twoFactor.codes.done')}
        </button>
      </div>
    </div>
  );
}

/** Turning off or renewing the codes: the password, or a code for Google-only accounts. */
function ProofStep({
  settings,
  hasPassword,
  submitLabel,
  onSubmit,
}: {
  settings: Settings;
  hasPassword: boolean;
  submitLabel: string;
  onSubmit: (proof: TwoFactorProof) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  return (
    <StepForm
      settings={settings}
      submitLabel={submitLabel}
      onSubmit={() => onSubmit(hasPassword ? { password: value } : { code: value })}
    >
      {hasPassword ? (
        <div className="field">
          <label className="field-label" htmlFor="two-factor-proof">
            {t('app.twoFactor.identity.password')}
          </label>
          <AuthPasswordInput
            id="two-factor-proof"
            value={value}
            onChange={setValue}
            placeholder={t('app.auth.login.password')}
            autoComplete="current-password"
          />
        </div>
      ) : (
        <CodeField
          id="two-factor-proof"
          label={t('app.twoFactor.proof.code')}
          value={value}
          onChange={setValue}
        />
      )}
    </StepForm>
  );
}

function Status({ settings }: { settings: Settings }) {
  const { t, locale } = useI18n();
  const status = settings.status!;
  if (!status.enabled) {
    return (
      <>
        <p className="section-hint">{t('app.twoFactor.off')}</p>
        <div className="button-row">
          <button type="button" className="btn-secondary" onClick={() => settings.open('identity')}>
            <Icon name="lock" /> {t('app.twoFactor.enable')}
          </button>
        </div>
      </>
    );
  }
  return (
    <>
      <p className="section-success">
        <Icon name="checkCircle" />{' '}
        {t('app.twoFactor.on', { date: formatDate(status.enabledAt!.slice(0, 10), locale) })}
      </p>
      <p className={status.recoveryCodesRemaining <= 2 ? 'form-error' : 'section-hint'}>
        {t('app.twoFactor.remaining', { count: status.recoveryCodesRemaining })}
      </p>
      <div className="button-row">
        <button type="button" className="btn-secondary" onClick={() => settings.open('regenerate')}>
          {t('app.twoFactor.regenerate')}
        </button>
        <button type="button" className="btn-secondary" onClick={() => settings.open('disable')}>
          {t('app.twoFactor.disable')}
        </button>
      </div>
    </>
  );
}

/** Settings → Security: two-step verification with an authenticator app. */
export function TwoFactorSection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const settings = useTwoFactorSettings();
  const hasPassword = user?.hasPassword !== false;
  const { mode } = settings;

  return (
    <section className="two-factor" aria-labelledby="two-factor-heading">
      <h3 id="two-factor-heading" className="two-factor-title">
        {t('app.twoFactor.title')}
      </h3>
      <p className="section-hint">{t('app.twoFactor.hint')}</p>
      {settings.error && (
        <p className="form-error" role="alert">
          {settings.error}
        </p>
      )}
      {mode === 'idle' && settings.status && <Status settings={settings} />}
      {mode === 'identity' && <IdentityStep settings={settings} hasPassword={hasPassword} />}
      {mode === 'scan' && <ScanStep settings={settings} />}
      {mode === 'codes' && <RecoveryCodes settings={settings} />}
      {mode === 'disable' && (
        <ProofStep
          settings={settings}
          hasPassword={hasPassword}
          submitLabel={t('app.twoFactor.disableConfirm')}
          onSubmit={(proof) => void settings.disable(proof)}
        />
      )}
      {mode === 'regenerate' && (
        <ProofStep
          settings={settings}
          hasPassword={hasPassword}
          submitLabel={t('app.twoFactor.regenerateConfirm')}
          onSubmit={(proof) => void settings.regenerate(proof)}
        />
      )}
    </section>
  );
}
