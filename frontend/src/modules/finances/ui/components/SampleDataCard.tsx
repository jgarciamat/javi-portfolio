import { useState } from 'react';
import { useApi } from '@core/context/ApiContext';
import { useI18n } from '@core/i18n/I18nContext';
import { Icon } from '@shared/components/Icon';
import { Modal } from '@shared/components/Modal';
import { useAction } from '@shared/hooks/useAction';
import { useResource } from '@shared/hooks/useResource';
import { useFinances } from '../../application/FinancesContext';
import { EmptyMonthOption } from './EmptyMonthPanel';
import '../css/DeleteRuleModal.css';

/** Asks before removing the invented movements (the person's own ones are not touched). */
function ConfirmRemove({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal label={t('app.sample.confirmTitle')} onClose={onCancel} className="modal-panel">
      <div className="modal-body">
        <h2 className="modal-title">{t('app.sample.confirmTitle')}</h2>
        <p>{t('app.sample.confirmBody', { count })}</p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn-secondary" onClick={onCancel} autoFocus>
          {t('app.common.cancel')}
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm}>
          {t('app.sample.remove')}
        </button>
      </div>
    </Modal>
  );
}

/**
 * «Probar con datos de ejemplo»: before the first movement (in the panel of the empty month),
 * four months of invented ones show what the app does; while they are there, a line says so and
 * removes them with one tap.
 */
export function SampleDataCard({
  onOpenLeaks,
  onImport,
}: {
  onOpenLeaks: () => void;
  onImport?: () => void;
}) {
  const { t } = useI18n();
  const { transactionApi } = useApi();
  const f = useFinances();
  const status = useResource(() => transactionApi.sampleStatus(), [transactionApi]);
  const action = useAction(t('app.sample.error'));
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);

  const load = () =>
    action.run(async () => {
      status.setData(await transactionApi.loadSample());
      await f.refresh({ invalidate: true });
    });
  const remove = () => {
    setConfirming(false);
    void action.run(async () => {
      await transactionApi.removeSample();
      setRemoved(true);
      await Promise.all([status.reload(), f.refresh({ invalidate: true })]);
    });
  };

  const data = status.data;
  if (!data) return null;
  const error = action.error && (
    <p className="form-error" role="alert">
      {action.error}
    </p>
  );

  if (data.sample > 0) {
    return (
      <section className="card sample-card sample-card--active" aria-label={t('app.sample.title')}>
        <p>
          <Icon name="info" /> {t('app.sample.active', { count: data.sample })}
        </p>
        <div className="button-row">
          <button type="button" className="btn-secondary" onClick={onOpenLeaks}>
            <Icon name="coins" /> {t('app.sample.seeLeaks')}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={action.pending}
            onClick={() => setConfirming(true)}
          >
            <Icon name="trash" /> {t('app.sample.remove')}
          </button>
        </div>
        {error}
        {confirming && (
          <ConfirmRemove
            count={data.sample}
            onConfirm={remove}
            onCancel={() => setConfirming(false)}
          />
        )}
      </section>
    );
  }

  if (removed) {
    return (
      <section className="card sample-card" aria-label={t('app.sample.title')}>
        <p className="section-success" role="status">
          <Icon name="checkCircle" /> {t('app.sample.removed')}
        </p>
        {onImport && (
          <button type="button" className="btn-primary" onClick={onImport}>
            <Icon name="upload" /> {t('app.sample.import')}
          </button>
        )}
      </section>
    );
  }

  // Only before the first movement: an option of the panel of the empty month.
  if (data.movements > 0) return null;
  return (
    <>
      <EmptyMonthOption
        icon="sparkles"
        label={action.pending ? t('app.sample.loading') : t('app.sample.load')}
        hint={t('app.emptyMonth.sampleHint')}
        busy={action.pending}
        onClick={() => void load()}
      />
      {error}
    </>
  );
}
