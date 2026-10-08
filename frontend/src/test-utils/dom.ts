/** jsdom has no file downloads: capture what would be saved. */
export function captureDownloads() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  const createObjectURL = jest.fn((blob: Blob) => {
    blobs.push(blob);
    return 'blob:test';
  });
  Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
  const click = jest
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
  return {
    names,
    /** Contents of every saved file (jsdom's Blob has no text()). */
    text: () =>
      Promise.all(
        blobs.map(
          (b) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsText(b);
            })
        )
      ),
    restore: () => click.mockRestore(),
  };
}

/** Makes `window.matchMedia` answer `matches` for every query. */
export function mockMatchMedia(matches: boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = jest.fn().mockReturnValue({
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  });
  return () => {
    window.matchMedia = original;
  };
}
