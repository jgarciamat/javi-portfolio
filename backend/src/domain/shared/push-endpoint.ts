/** Push services of the browsers (Chrome/Edge/Opera via FCM, Firefox, Safari, Windows). */
const EXACT_HOSTS = new Set([
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]);
const HOST_SUFFIXES = ['.push.services.mozilla.com', '.notify.windows.com', '.push.apple.com'];

/**
 * The API sends a request to every subscription endpoint, so only the browsers' push
 * services are accepted: https, default port, a known host, no IP and no credentials.
 */
export function isAllowedPushEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // URL drops the default port, so any port left here is not 443.
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname;
  if (/^[\d.]+$/.test(host) || host.startsWith('[')) return false;
  return EXACT_HOSTS.has(host) || HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
