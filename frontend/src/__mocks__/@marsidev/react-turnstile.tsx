import React from 'react';

interface TurnstileProps {
    siteKey: string;
    onSuccess?: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    options?: Record<string, unknown>;
}

/** Mock Turnstile widget for Jest — auto-verifies with a fake token */
export function Turnstile({ onSuccess }: TurnstileProps) {
    React.useEffect(() => {
        onSuccess?.('mock-turnstile-token');
    }, [onSuccess]);
    return <div data-testid="turnstile-widget" />;
}
