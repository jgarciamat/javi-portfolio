/**
 * Cloudflare Turnstile verification — currently disabled.
 * Re-enable by configuring TURNSTILE_SECRET_KEY in the server .env
 * and uncommenting the verification logic.
 */
export async function verifyTurnstile(_token: string | undefined): Promise<void> {
    // Disabled — no-op
    return;
}
