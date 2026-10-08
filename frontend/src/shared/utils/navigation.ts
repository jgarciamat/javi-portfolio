/** Full-page navigation to another site (payment pages). A function so tests can replace it. */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
