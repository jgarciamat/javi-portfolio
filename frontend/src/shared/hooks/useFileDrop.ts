import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';

/** Does this drag carry files (and not a piece of text, a link or an element of the page)? */
export function dragHasFiles(dt: DataTransfer | null | undefined): boolean {
  if (!dt) return false;
  return Array.from(dt.types ?? []).includes('Files') || (dt.files?.length ?? 0) > 0;
}

/** Does `file` match an `accept` list like ".csv,.pdf,image/*,text/plain"? An empty list accepts all. */
export function matchesAccept(file: File, accept?: string): boolean {
  const rules = (accept ?? '')
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type ?? '').toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule);
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

interface Options {
  /** Same syntax as the `accept` of an `<input type="file">`. */
  accept?: string;
  /** Like `multiple` of the input: without it only the first valid file is taken. */
  multiple?: boolean;
  /** Nothing is taken while true (for example, while a file is being read). */
  disabled?: boolean;
  /** The valid files that were dropped: the same function the button uses. */
  onFiles: (files: File[]) => void;
}

/**
 * Drag and drop of files onto an element. Counts dragenter/dragleave so that moving over the
 * children does not blink, ignores drags that carry no files, filters by `accept`, and while a
 * file is being dragged keeps the browser from opening it if it is dropped outside the zone.
 */
export function useFileDrop({ accept, multiple = false, disabled = false, onFiles }: Options) {
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const depth = useRef(0);
  const latest = useRef(onFiles);
  latest.current = onFiles;

  // The browser opens a file dropped on a page that does not handle it: stop that, only for files.
  useEffect(() => {
    const stop = (e: Event) => {
      if (dragHasFiles((e as unknown as DragEvent).dataTransfer)) e.preventDefault();
    };
    document.addEventListener('dragover', stop);
    document.addEventListener('drop', stop);
    return () => {
      document.removeEventListener('dragover', stop);
      document.removeEventListener('drop', stop);
    };
  }, []);

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      depth.current += 1;
      setRejected([]);
      if (!disabled) setDragging(true);
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
      if (!disabled) setDragging(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback((e: DragEvent) => {
    if (!dragHasFiles(e.dataTransfer)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (!dragHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      if (disabled) return;
      const all = Array.from(e.dataTransfer.files ?? []);
      const valid = all.filter((f) => matchesAccept(f, accept));
      setRejected(all.filter((f) => !matchesAccept(f, accept)).map((f) => f.name));
      if (valid.length > 0) latest.current(multiple ? valid : valid.slice(0, 1));
    },
    [accept, multiple, disabled]
  );

  return {
    dragging,
    /** Names of the dropped files the zone does not accept, until the next drag. */
    rejected,
    bind: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
