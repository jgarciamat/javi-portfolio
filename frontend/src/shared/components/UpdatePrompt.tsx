import { useRegisterSW } from 'virtual:pwa-register/react';
import './css/UpdatePrompt.css';

/**
 * Muestra un banner en la parte inferior de la pantalla cuando hay una nueva
 * versión de la PWA disponible. El usuario puede actualizar con un toque o
 * ignorar el aviso.
 */
export function UpdatePrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW();

    if (!needRefresh) return null;

    return (
        <div className="update-prompt" role="status" aria-live="polite">
            <span className="update-prompt__text">
                🆕 Nueva versión disponible
            </span>
            <div className="update-prompt__actions">
                <button
                    className="update-prompt__btn update-prompt__btn--update"
                    onClick={() => updateServiceWorker(true)}
                >
                    Actualizar
                </button>
                <button
                    className="update-prompt__btn update-prompt__btn--dismiss"
                    onClick={() => setNeedRefresh(false)}
                >
                    Ahora no
                </button>
            </div>
        </div>
    );
}
