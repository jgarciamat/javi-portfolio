import { useState, useCallback } from 'react';

/**
 * Manages the Cloudflare Turnstile token lifecycle.
 * - token: the current valid token (null until user passes the challenge)
 * - onSuccess: callback to pass to <Turnstile onSuccess={...} />
 * - onExpire: callback to pass to <Turnstile onExpire={...} />
 * - onError: callback to pass to <Turnstile onError={...} />
 * - reset: call this after a failed submission so the widget re-challenges
 */
export function useTurnstile() {
    const [token, setToken] = useState<string | null>(null);

    const onSuccess = useCallback((t: string) => setToken(t), []);
    const onExpire = useCallback(() => setToken(null), []);
    const onError = useCallback(() => setToken(null), []);
    const reset = useCallback(() => setToken(null), []);

    return { token, onSuccess, onExpire, onError, reset };
}
