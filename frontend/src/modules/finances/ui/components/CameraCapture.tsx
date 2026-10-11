import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { Modal } from '@shared/components/Modal';
import { Icon } from '@shared/components/Icon';

/** The browser can open the camera (any phone or computer, over HTTPS): not inside the Android app. */
export function liveCameraAvailable(isNative: boolean): boolean {
  return !isNative && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * A camera view in the page to photograph a receipt: it works in the web app and in an
 * installed shortcut on iPhone and Android alike. The photo stays on the device.
 */
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (photo: File) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((s) => {
        if (stopped) return s.getTracks().forEach((track) => track.stop());
        stream = s;
        (video.current as HTMLVideoElement).srcObject = s;
        setReady(true);
      })
      .catch(() => setError('app.receipt.cameraDenied'));
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const take = () => {
    const el = video.current as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    canvas.getContext('2d')?.drawImage(el, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], 'ticket.jpg', { type: 'image/jpeg' }));
        else setError('app.receipt.error');
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <Modal label={t('app.receipt.camera')} onClose={onClose} className="modal-panel camera-panel">
      <div className="camera-view">
        {/* The video is always there (the stream needs it); the error replaces what it shows. */}
        <video ref={video} autoPlay playsInline muted aria-label={t('app.receipt.camera')} />
        {error && <p className="form-error">{t(error)}</p>}
      </div>
      <div className="button-row">
        <button type="button" className="btn-primary" disabled={!ready} onClick={take}>
          <Icon name="camera" /> {t('app.receipt.capture')}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>
          {t('app.common.cancel')}
        </button>
      </div>
    </Modal>
  );
}
