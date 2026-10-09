import { OAuth2Client } from 'google-auth-library';
import { UnauthorizedError } from '@domain/errors';
import { GoogleIdentity, GoogleIdentityVerifier } from '@domain/ports/services';

/**
 * Verifies that a Google token was issued **to this app** before trusting it.
 * The previous version called /userinfo with any access token, so a token
 * obtained by an unrelated Google app could sign in as its owner.
 *
 *  - ID tokens (JWT) are verified offline with `verifyIdToken` + audience.
 *  - Access tokens (what the custom button's implicit flow returns) are checked
 *    with Google's tokeninfo endpoint and their `aud` must equal our client id.
 */
/** Google's tokeninfo endpoint answers the flag as the text "true"; ID tokens carry a boolean. */
const isTrue = (value: unknown): boolean => value === true || value === 'true';

export class GoogleOAuthIdentityVerifier implements GoogleIdentityVerifier {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string | null) {
    this.client = new OAuth2Client(clientId ?? undefined);
  }

  async verify(token: string): Promise<GoogleIdentity> {
    if (!this.clientId) {
      throw new UnauthorizedError(
        'El inicio de sesión con Google no está configurado',
        'GOOGLE_DISABLED'
      );
    }
    try {
      return token.split('.').length === 3
        ? await this.verifyIdToken(token)
        : await this.verifyAccessToken(token);
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
      // The reason (never the token) helps to tell a misconfiguration from a bad token.
      console.warn(`[google] token rejected: ${e instanceof Error ? e.message : String(e)}`);
      throw new UnauthorizedError('Token de Google inválido', 'GOOGLE_AUTH_FAILED');
    }
  }

  private async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId! });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error('incomplete payload');
    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: isTrue(payload.email_verified),
      name: payload.name ?? null,
    };
  }

  private async verifyAccessToken(accessToken: string): Promise<GoogleIdentity> {
    const info = await this.client.getTokenInfo(accessToken);
    if (info.aud !== this.clientId) {
      throw new UnauthorizedError(
        'El token de Google no pertenece a esta aplicación',
        'GOOGLE_AUTH_FAILED'
      );
    }
    if (!info.sub || !info.email) throw new Error('incomplete token info');
    const name = await this.fetchName(accessToken);
    return {
      googleId: info.sub,
      email: info.email,
      emailVerified: isTrue(info.email_verified),
      name,
    };
  }

  private async fetchName(accessToken: string): Promise<string | null> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { name?: string };
      return body.name ?? null;
    } catch {
      return null;
    }
  }
}
