/** Search results cut titles at about 60–65 characters: past that, the brand is left out. */
export const MAX_TITLE = 65;

/** `title | Finanverso` when it fits in a search result, otherwise just `title`. */
export function brandTitle(title: string): string {
  const full = `${title} | Finanverso`;
  return full.length <= MAX_TITLE ? full : title;
}
