import { fireEvent, screen } from '@testing-library/react';
import { FileDropZone } from '@shared/components/FileDropZone';
import { dragHasFiles, matchesAccept } from '@shared/hooks/useFileDrop';
import { renderWithI18n, tr } from '@test-utils/render';

const pdf = new File(['x'], 'borrador.pdf', { type: 'application/pdf' });
const png = new File(['x'], 'foto.PNG', { type: 'image/png' });
const txt = new File(['x'], 'notas.txt', { type: 'text/plain' });
const files = (list: File[]) => ({ dataTransfer: { types: ['Files'], files: list } });

describe('matchesAccept / dragHasFiles', () => {
  it('reads extensions, mime types and wildcards, case-insensitively', () => {
    expect(matchesAccept(pdf)).toBe(true);
    expect(matchesAccept(pdf, '')).toBe(true);
    expect(matchesAccept(pdf, '.PDF')).toBe(true);
    expect(matchesAccept(pdf, 'application/pdf')).toBe(true);
    expect(matchesAccept(png, 'image/*')).toBe(true);
    expect(matchesAccept(txt, '.csv, image/*')).toBe(false);
    expect(matchesAccept({ name: 'a', type: undefined } as unknown as File, 'image/*')).toBe(false);
  });

  it('tells a drag of files from a drag of text', () => {
    expect(dragHasFiles(null)).toBe(false);
    expect(dragHasFiles({ types: ['text/plain'] } as unknown as DataTransfer)).toBe(false);
    expect(dragHasFiles({ types: ['Files'] } as unknown as DataTransfer)).toBe(true);
    expect(dragHasFiles({ files: [pdf] } as unknown as DataTransfer)).toBe(true);
    expect(dragHasFiles({} as unknown as DataTransfer)).toBe(false);
  });
});

describe('FileDropZone', () => {
  const setup = (props: Partial<Parameters<typeof FileDropZone>[0]> = {}) => {
    const onFiles = jest.fn();
    renderWithI18n(
      <FileDropZone onFiles={onFiles} accept="image/*,.pdf" className="mine" {...props}>
        <button>Elegir</button>
      </FileDropZone>
    );
    const zone = screen.getByRole('button', { name: 'Elegir' }).parentElement as HTMLElement;
    return { zone, onFiles };
  };

  it('lights up while files are dragged over, without blinking over its children', () => {
    const { zone } = setup();
    fireEvent.dragEnter(zone, files([]));
    fireEvent.dragEnter(screen.getByRole('button'), files([]));
    expect(zone).toHaveClass('is-over', 'mine');
    expect(screen.getAllByText(tr('app.drop.here'))).toHaveLength(2);
    fireEvent.dragLeave(zone, files([]));
    expect(zone).toHaveClass('is-over');
    fireEvent.dragLeave(screen.getByRole('button'), files([]));
    expect(zone).not.toHaveClass('is-over');
    fireEvent.dragLeave(zone, files([]));
    fireEvent.dragOver(zone, files([]));
    expect(zone).toHaveClass('is-over');
  });

  it('ignores drags that carry no files', () => {
    const { zone, onFiles } = setup();
    const text = { dataTransfer: { types: ['text/plain'], files: [] } };
    fireEvent.dragEnter(zone, text);
    fireEvent.dragOver(zone, text);
    fireEvent.dragLeave(zone, text);
    fireEvent.drop(zone, text);
    // A drop that lists no files at all hands nothing over.
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'] } });
    expect(zone).not.toHaveClass('is-over');
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('hands over the valid files, only the first one without multiple', () => {
    const { zone, onFiles } = setup();
    fireEvent.drop(zone, files([png, pdf]));
    expect(onFiles).toHaveBeenCalledWith([png]);
  });

  it('hands over all the valid files with multiple, and names the ones it cannot use', () => {
    const { zone, onFiles } = setup({ multiple: true });
    fireEvent.dragEnter(zone, files([]));
    fireEvent.drop(zone, files([png, txt, pdf]));
    expect(onFiles).toHaveBeenCalledWith([png, pdf]);
    expect(zone).not.toHaveClass('is-over');
    expect(screen.getByText(tr('app.drop.rejected', { files: 'notas.txt' }))).toBeInTheDocument();
    // The notice goes away with the next drag.
    fireEvent.dragEnter(zone, files([]));
    expect(screen.queryByText(tr('app.drop.rejected', { files: 'notas.txt' }))).toBeNull();
  });

  it('warns and does nothing when no dropped file is valid', () => {
    const { zone, onFiles } = setup();
    fireEvent.drop(zone, files([txt]));
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByText(tr('app.drop.rejected', { files: 'notas.txt' }))).toBeInTheDocument();
  });

  it('takes nothing while disabled', () => {
    const { zone, onFiles } = setup({ disabled: true });
    fireEvent.dragEnter(zone, files([]));
    expect(zone).not.toHaveClass('is-over');
    const over = { dataTransfer: { types: ['Files'], files: [], dropEffect: '' } };
    fireEvent.dragOver(zone, over);
    expect(over.dataTransfer.dropEffect).toBe('none');
    fireEvent.drop(zone, files([png]));
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('works without a class, and keeps the browser from opening files dropped outside', () => {
    renderWithI18n(
      <FileDropZone onFiles={jest.fn()}>
        <span>x</span>
      </FileDropZone>
    );
    const outside = (type: string, dt: object) => {
      const e = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(e, { dataTransfer: dt });
      document.body.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(outside('dragover', { types: ['Files'] })).toBe(true);
    expect(outside('drop', { types: ['Files'] })).toBe(true);
    expect(outside('drop', { types: ['text/plain'] })).toBe(false);
  });
});
