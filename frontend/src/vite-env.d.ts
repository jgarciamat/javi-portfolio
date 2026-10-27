/// <reference types="vite/client" />

/** The two parts of the texts of a language (see scripts/i18n/split.cjs and vite.config.ts). */
declare module 'virtual:locale/*' {
  const messages: Record<string, string>;
  export default messages;
}
