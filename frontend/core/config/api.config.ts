interface ImportMetaEnv {
  VITE_API_URL?: string;
}

// Extend the global ImportMeta interface so TypeScript recognizes import.meta.env
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
