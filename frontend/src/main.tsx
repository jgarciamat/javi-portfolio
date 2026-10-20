import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { installChunkReload } from '@core/monitoring/chunkReload';
import { startTheme } from '@core/theme/theme';
import { installErrorReporting } from '@core/monitoring/errorReporting';
import { captureHouseholdInvite } from '@core/householdInvite';
import { removeLegacyAcquisition } from '@core/acquisition';
import { captureReferral } from '@core/referral';
import { captureCreatorCode } from '@core/creatorCode';
import { track } from '@core/analytics';

startTheme();
installErrorReporting();
installChunkReload(Date.now);
// Before the router redirects to the login page and drops the query string.
captureReferral();
// Creator links (`?aff=`): in memory only, sent at sign-up only if the person agrees.
captureCreatorCode();
removeLegacyAcquisition();
// Reads the UTM and referrer of the landing (kept in memory only) before the router drops them.
track('visit');
captureHouseholdInvite();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
