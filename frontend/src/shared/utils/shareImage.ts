/** Shares a picture with the system share sheet, or saves it when the browser cannot share files. */
export async function shareImage(
  blob: Blob,
  fileName: string,
  text: string,
  /** `download` skips the share sheet: on a computer a download is what people expect. */
  mode: 'share' | 'download' = 'share'
): Promise<'shared' | 'saved'> {
  const file = new File([blob], fileName, { type: blob.type });
  if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch {
      // The person closed the share sheet: nothing else to do.
      return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return 'saved';
}
