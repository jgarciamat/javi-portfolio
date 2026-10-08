// Mock for @react-oauth/google — used in Jest tests.
import React from 'react';

/** Set `googleMock.fail = true` to make the next Google sign-in fail. */
export const googleMock = { fail: false };

export const GoogleOAuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const useGoogleLogin = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (r: { access_token: string }) => void;
  onError?: () => void;
} = {}) =>
  jest.fn(() => (googleMock.fail ? onError?.() : onSuccess?.({ access_token: 'mock-token' })));
