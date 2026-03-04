import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';

// Registra el Service Worker. Con registerType: 'autoUpdate' se actualiza
// en segundo plano sin interrumpir al usuario.
registerSW({ onNeedRefresh() { }, onOfflineReady() { } });

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
    <StrictMode>
        <App />
    </StrictMode>
);
