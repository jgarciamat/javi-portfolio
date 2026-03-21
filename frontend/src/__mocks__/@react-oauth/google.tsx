// Mock for @react-oauth/google — used in Jest tests
import React from 'react';

export const GoogleOAuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const GoogleLogin = () => <button data-testid="google-login-btn">Google</button>;

// Returns a stable trigger function so components can call handleGoogleLogin()
export const useGoogleLogin = ({ onSuccess }: { onSuccess?: (r: { access_token: string }) => void } = {}) =>
    jest.fn(() => onSuccess?.({ access_token: 'mock-token' }));
