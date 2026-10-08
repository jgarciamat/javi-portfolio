/** Full-page navigation to another site (payment pages). A function so tests can replace it. */
export function redirectTo(url: string): void {
  window.location.assign(url);
}

/** Reloads the app (after an error it cannot recover from in place). */
export function reloadPage(): void {
  window.location.reload();
}
