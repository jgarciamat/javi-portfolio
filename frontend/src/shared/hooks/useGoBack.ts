import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Back to the previous screen of the app. A page opened directly (new tab,
 * link from an e-mail or another site) has none, so it goes to `fallback`.
 */
export function useGoBack(fallback = '/'): () => void {
  const navigate = useNavigate();
  // The router names the first entry of the session "default".
  const firstPage = useLocation().key === 'default';
  return useCallback(() => {
    if (firstPage) navigate(fallback, { replace: true });
    else navigate(-1);
  }, [firstPage, navigate, fallback]);
}
