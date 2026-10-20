// prettier 2 ships no types: only what the contract test uses.
declare module 'prettier' {
  export const resolveConfig: { sync(file: string): object | null };
  export function format(source: string, options: object): string;
}
