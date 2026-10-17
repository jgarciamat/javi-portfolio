import { BrandLogo } from './BrandLogo';

/** Full-screen placeholder while the session or a page chunk is loading. */
export function AppSplash() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <BrandLogo className="app-splash-logo" size={72} />
    </div>
  );
}
