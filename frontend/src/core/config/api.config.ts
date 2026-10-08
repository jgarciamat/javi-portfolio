export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
/** Empty when Google sign-in is not configured (it is then hidden). */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
