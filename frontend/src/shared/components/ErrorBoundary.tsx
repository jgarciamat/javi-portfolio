import { Component, type ReactNode } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { reportError } from '@core/monitoring/errorReporting';
import { reloadPage } from '@shared/utils/navigation';

interface ErrorFallbackProps {
  onRetry: () => void;
  fullPage: boolean;
}

function ErrorFallback({ onRetry, fullPage }: ErrorFallbackProps) {
  const { t } = useI18n();
  return (
    <div className={fullPage ? 'error-screen error-screen--page' : 'error-screen'} role="alert">
      <span className="error-screen-icon" aria-hidden="true">
        ⚠️
      </span>
      <h2 className="error-screen-title">{t('app.error.title')}</h2>
      <p className="error-screen-text">{t('app.error.text')}</p>
      <div className="error-screen-actions">
        <button className="btn-secondary" onClick={onRetry}>
          {t('app.error.retry')}
        </button>
        <button className="btn-primary" onClick={reloadPage}>
          {t('app.error.reload')}
        </button>
      </div>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Takes the whole screen (top level) instead of the section's space. */
  fullPage?: boolean;
}

/** Catches render errors below it: reports them and offers to retry instead of a blank page. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    reportError('render', error);
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) return this.props.children;
    return <ErrorFallback onRetry={this.retry} fullPage={!!this.props.fullPage} />;
  }
}
