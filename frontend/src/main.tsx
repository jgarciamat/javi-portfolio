import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import App from './App';
import { GOOGLE_CLIENT_ID } from '@core/config/api.config';
import { installChunkReload } from '@core/monitoring/chunkReload';
import { installErrorReporting } from '@core/monitoring/errorReporting';
import { captureHouseholdInvite } from '@core/householdInvite';
import { captureReferral } from '@core/referral';

installErrorReporting();
installChunkReload(Date.now);
// Before the router redirects to the login page and drops the query string.
captureReferral();
captureHouseholdInvite();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
