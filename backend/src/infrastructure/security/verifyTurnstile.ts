/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Throws an error if the token is missing or invalid.
 */
export async function verifyTurnstile(token: string | undefined): Promise<void> {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    // If the secret is not configured (e.g. local dev), skip verification
    if (!secret) return;

    if (!token) {
        throw new Error('Verificación de seguridad requerida');
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token }),
    });

    const data = await response.json() as { success: boolean; 'error-codes'?: string[] };

    if (!data.success) {
        throw new Error('Verificación de seguridad fallida. Por favor, inténtalo de nuevo.');
    }
}
