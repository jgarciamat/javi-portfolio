/** Full-screen placeholder while the session or a page chunk is loading. */
export function AppSplash() {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <img className="app-splash-logo" src="/logo-192.png" alt="" width="72" height="72" />
    </div>
  );
}
