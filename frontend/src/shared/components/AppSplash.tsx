/** Full-screen placeholder while the session or a page chunk is loading. */
export function AppSplash() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <span className="app-splash-logo" aria-hidden="true">
        💰
      </span>
    </div>
  );
}
