import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useI18n } from '@core/i18n/I18nContext';
import { storage } from '@shared/utils/storage';
import type { Drawings } from '../application/useDrawings';
import {
  COLOR_TONES,
  DRAWING_COLORS,
  DRAWING_TEXT_MAX,
  DRAWING_WIDTHS,
  DRAW_TOOLS,
  anchor,
  keyboardPoints,
  newDrawingId,
  savedWidth,
  twoPoints,
  widthOf,
  type Drawing,
  type DrawingColor,
  type DrawingKind,
  type DrawingPoint,
  type DrawingWidth,
  type DrawTool,
} from '../domain/drawings';
import type { Candle } from '../domain/types';
import { useMoney } from './money';
import type { Projection } from './useCandleChart';
import './css/Drawings.css';

/** The thickness last chosen, kept on this device (a convenience). */
export const WIDTH_KEY = 'mm_crypto_draw_width';

/** The tool chosen, the colour, the note being written, and what Enter and Ctrl+Z do. */
export interface DrawControl {
  /** The tool in use; null: the chart moves and zooms as always. */
  tool: DrawTool | null;
  color: DrawingColor;
  /** Thickness of the next lines and zones (notes have none). */
  width: DrawingWidth;
  setWidth: (width: DrawingWidth) => void;
  /** Where a note is being written (its input is open). */
  editing: DrawingPoint | null;
  allowed: (tool: DrawTool) => boolean;
  choose: (tool: DrawTool) => void;
  setColor: (color: DrawingColor) => void;
  /** A drawing of the tool in use is finished: it is kept and the chart moves again. */
  place: (kind: DrawingKind, points: DrawingPoint[]) => void;
  openNote: (at: DrawingPoint) => void;
  saveNote: (text: string) => void;
  /** Keys of the chart: Enter draws on the last candle, Ctrl+Z / ⌘Z undoes. True if used. */
  onKey: (event: KeyboardEvent) => boolean;
}

/**
 * The drawing mode of the chart: explicit (a tool is pressed) so that, while it lasts, dragging
 * draws instead of moving the chart, and Escape (or pressing the tool again) leaves it. After
 * each drawing the chart moves again; the eraser stays until it is left.
 */
export function useDrawTools(
  drawings: Drawings | undefined,
  candles: Candle[],
  rate: number,
  /** Back to the chart when a note is done, for whoever uses the keyboard. */
  focusChart: () => void
): DrawControl {
  const [picked, setPicked] = useState<DrawTool | null>(null);
  const [color, setColor] = useState<DrawingColor>('yellow');
  const [width, setWidth] = useState<DrawingWidth>(() => savedWidth(storage.get(WIDTH_KEY)));
  const [editing, setEditing] = useState<DrawingPoint | null>(null);
  const note = useRef<DrawingPoint | null>(null);
  note.current = editing;

  const usable = !!drawings?.ready;
  const count = drawings?.items.length ?? 0;
  const allowed = (tool: DrawTool) =>
    usable && (tool === 'eraser' ? count > 0 : count < drawings!.max);
  // A tool that can no longer be used (the last drawing erased, the limit reached) is left.
  const tool = picked && allowed(picked) ? picked : null;

  const leave = () => {
    note.current = null;
    setEditing(null);
    setPicked(null);
  };

  useEffect(() => {
    if (!tool && !editing) return;
    // Before the full screen hears it: Escape leaves the drawing mode, not the full screen.
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      note.current = null;
      setEditing(null);
      setPicked(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tool, editing]);

  const place = (kind: DrawingKind, points: DrawingPoint[]) => {
    drawings!.add({ id: newDrawingId(), kind, color, points, width });
    leave();
  };

  const openNote = (at: DrawingPoint) => {
    note.current = at;
    setEditing(at);
  };

  return {
    tool,
    color,
    width,
    setWidth: (next) => {
      setWidth(next);
      storage.set(WIDTH_KEY, String(next));
    },
    editing,
    allowed,
    choose: (next) => {
      note.current = null;
      setEditing(null);
      setPicked(tool === next ? null : next);
    },
    setColor,
    place,
    openNote,
    saveNote: (text) => {
      const at = note.current;
      const clean = text.trim();
      if (at && clean) {
        drawings!.add({ id: newDrawingId(), kind: 'text', color, points: [at], text: clean });
      }
      leave();
      focusChart();
    },
    onKey: (event) => {
      if (!drawings) return false;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        drawings.undo();
        return true;
      }
      if (event.key !== 'Enter' || !tool || tool === 'eraser') return false;
      event.preventDefault();
      const points = keyboardPoints(tool, candles, rate);
      if (!points) return true;
      if (tool === 'text') openNote(points[0]);
      else place(tool, points);
      return true;
    },
  };
}

type IconName = DrawTool | 'undo' | 'clear';

/** Small line icons of the drawing bar. */
const ICONS: Record<IconName, string> = {
  trend: 'M3 13 13 3M2 12.5h2M12 3.5h2',
  horizontal: 'M1.5 8h13M4 6v4M12 6v4',
  rect: 'M3 4h10v8H3z',
  text: 'M3.5 4h9M8 4v9M6 13h4',
  eraser: 'M9 3l4 4-6 6H4l-1.5-1.5L9 3zM6 6l4 4M8 13.5h5.5',
  undo: 'M6 3.5 2.5 7 6 10.5M3 7h6.5a3.5 3.5 0 0 1 0 7H7',
  clear: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5',
};

function DrawIcon({ name }: { name: IconName }) {
  return (
    <svg className="cc-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={ICONS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The drawing bar, above the chart (in full screen too): the tools, the colours, «Undo» and
 * «Delete all», icons with their names for screen readers and in the tooltip. Always the same
 * size, whatever is on, so nothing below it moves.
 */
export function DrawBar({ control, drawings }: { control: DrawControl; drawings?: Drawings }) {
  const { t } = useI18n();
  if (!drawings) return null;
  const name = (tool: DrawTool) => t(`app.crypto.draw.tools.${tool}`);
  return (
    <div className="cc-draw" role="group" aria-label={t('app.crypto.draw.title')}>
      {DRAW_TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          className="cc-draw-btn"
          aria-label={name(tool)}
          title={name(tool)}
          aria-pressed={control.tool === tool}
          disabled={!control.allowed(tool)}
          onClick={() => control.choose(tool)}
        >
          <DrawIcon name={tool} />
        </button>
      ))}
      <span className="cc-draw-sep" aria-hidden="true" />
      <span className="cc-draw-colors" role="group" aria-label={t('app.crypto.draw.color')}>
        {DRAWING_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className="cc-draw-color"
            style={{ '--cc-draw': COLOR_TONES[color] } as CSSProperties}
            aria-label={t(`app.crypto.draw.colors.${color}`)}
            title={t(`app.crypto.draw.colors.${color}`)}
            aria-pressed={control.color === color}
            onClick={() => control.setColor(color)}
          />
        ))}
      </span>
      <span className="cc-draw-sep" aria-hidden="true" />
      <span className="cc-draw-widths" role="group" aria-label={t('app.crypto.draw.width')}>
        {DRAWING_WIDTHS.map((width) => {
          const name = t(`app.crypto.draw.widths.${width}`, { px: width });
          return (
            <button
              key={width}
              type="button"
              className="cc-draw-btn cc-draw-width"
              aria-label={name}
              title={name}
              aria-pressed={control.width === width}
              onClick={() => control.setWidth(width)}
            >
              {/* The stroke itself, in the colour chosen: what the next line will look like. */}
              <svg viewBox="0 0 20 16" aria-hidden="true">
                <line
                  x1="3"
                  y1="8"
                  x2="17"
                  y2="8"
                  style={{ stroke: COLOR_TONES[control.color] }}
                  strokeWidth={width}
                  strokeLinecap="round"
                />
              </svg>
            </button>
          );
        })}
      </span>
      <span className="cc-draw-sep" aria-hidden="true" />
      <button
        type="button"
        className="cc-draw-btn"
        aria-label={t('app.crypto.draw.undo')}
        title={`${t('app.crypto.draw.undo')} (Ctrl+Z)`}
        aria-keyshortcuts="Control+Z Meta+Z"
        disabled={!drawings.canUndo}
        onClick={drawings.undo}
      >
        <DrawIcon name="undo" />
      </button>
      <button
        type="button"
        className="cc-draw-btn"
        aria-label={t('app.crypto.draw.clear')}
        title={t('app.crypto.draw.clear')}
        disabled={!drawings.items.length}
        onClick={drawings.clear}
      >
        <DrawIcon name="clear" />
      </button>
      {drawings.failed && (
        <p className="cc-draw-error" role="alert">
          {t('app.crypto.draw.loadError')}{' '}
          <button type="button" className="btn-link" onClick={drawings.retry}>
            {t('app.crypto.market.retry')}
          </button>
        </p>
      )}
    </div>
  );
}

/** What the drawings of the coin are, for screen readers (the drawing cannot be read out). */
export function DrawSummary({ id, drawings }: { id: string; drawings?: Drawings }) {
  const { t } = useI18n();
  const items = drawings?.items ?? [];
  const notes = items.filter((d) => d.text).map((d) => d.text);
  return (
    <p id={id} className="sr-only">
      {items.length ? t('app.crypto.draw.summary', { count: items.length }) : ''}
      {notes.length ? ` ${t('app.crypto.draw.notes', { notes: notes.join('; ') })}` : ''}
    </p>
  );
}

interface Spot {
  x: number;
  y: number;
}

/** One drawing on the pane, and in eraser mode a button that removes it. */
function Shape({
  drawing,
  spot,
  width,
  erasing,
  onErase,
}: {
  drawing: Drawing;
  spot: (p: DrawingPoint) => Spot | null;
  width: number;
  erasing: boolean;
  onErase: (id: string) => void;
}) {
  const { t } = useI18n();
  const money = useMoney();
  const at = drawing.points.map(spot);
  if (at.some((p) => p === null)) return null;
  const [a, b] = at as Spot[];
  // Inline styles (presentation attributes take no CSS variables): the tone follows the theme.
  const tone = COLOR_TONES[drawing.color];
  // Screen pixels: the SVG is the pane's size, so the zoom never makes it thicker or thinner.
  const stroke = widthOf(drawing);
  const line = { stroke: tone };
  const ink = { fill: tone };
  const label = t(`app.crypto.draw.erase.${drawing.kind}`, {
    price: money.price(drawing.points[0].price),
    text: drawing.text ?? '',
  });
  let body;
  if (drawing.kind === 'trend') {
    body = (
      <>
        <line className="cc-draw-hit" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={line} strokeWidth={stroke} />
      </>
    );
  } else if (drawing.kind === 'horizontal') {
    body = (
      <>
        <line className="cc-draw-hit" x1={0} y1={a.y} x2={width} y2={a.y} />
        <line x1={0} y1={a.y} x2={width} y2={a.y} style={line} strokeWidth={stroke} />
        <text className="cc-draw-price" x={4} y={a.y - 4} style={ink}>
          {money.price(drawing.points[0].price)}
        </text>
      </>
    );
  } else if (drawing.kind === 'rect') {
    body = (
      <rect
        className="cc-draw-zone"
        x={Math.min(a.x, b.x)}
        y={Math.min(a.y, b.y)}
        width={Math.abs(b.x - a.x)}
        height={Math.abs(b.y - a.y)}
        style={{ ...line, ...ink }}
        fillOpacity={0.15}
        strokeWidth={stroke}
      />
    );
  } else {
    body = (
      <text className="cc-draw-note" x={a.x} y={a.y} style={ink}>
        {drawing.text}
      </text>
    );
  }
  if (!erasing) return <g data-drawing={drawing.kind}>{body}</g>;
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onErase(drawing.id);
  };
  return (
    <g
      data-drawing={drawing.kind}
      className="cc-draw-erasable"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onErase(drawing.id)}
      onKeyDown={onKeyDown}
    >
      <title>{label}</title>
      {body}
    </g>
  );
}

/** A drag shorter than this (px) is a tap: two taps also make a line or a zone. */
const TAP = 6;
/** A finger shakes more than a mouse: its taps are looser, or two taps would be a tiny line. */
const TAP_FINGER = 12;

type Translate = ReturnType<typeof useI18n>['t'];

/** What the pill over the chart says: what the tool expects, the limit or a failed save. */
function hintFor(t: Translate, tool: DrawTool | null, drawings: Drawings): string {
  if (tool) return t(`app.crypto.draw.hint.${tool}`);
  if (drawings.ready && drawings.items.length >= drawings.max) {
    return t('app.crypto.draw.full', { max: drawings.max });
  }
  return drawings.unsaved ? t('app.crypto.draw.saveError') : '';
}

/**
 * The mouse or the finger on the surface while a tool is on: a drag (or two taps) for a line or
 * a zone, a tap for a horizontal line or for where a note goes. `draft` is what is being drawn.
 * The first pointer that goes down owns the stroke: another finger (a pinch, a resting thumb)
 * neither moves nor ends it.
 */
function useGesture(control: DrawControl, pointAt: (event: PointerEvent) => DrawingPoint | null) {
  const [draft, setDraft] = useState<DrawingPoint[] | null>(null);
  const [first, setFirst] = useState<DrawingPoint | null>(null);
  const down = useRef<{ id: number; x: number; y: number; from: DrawingPoint } | null>(null);
  const tool = control.tool === 'eraser' ? null : control.tool;
  const pair = !!tool && twoPoints(tool);
  const mine = (event: PointerEvent) => !down.current || down.current.id === event.pointerId;

  const finish = (
    event: PointerEvent,
    kind: DrawingKind,
    p: DrawingPoint,
    start: NonNullable<typeof down.current>
  ) => {
    const slop = event.pointerType === 'mouse' ? TAP : TAP_FINGER;
    if (kind === 'text') {
      setDraft(null);
      control.openNote(p);
    } else if (!pair) {
      control.place(kind, [p]);
    } else if (first || Math.hypot(event.clientX - start.x, event.clientY - start.y) > slop) {
      control.place(kind, [first ?? start.from, p]);
    } else {
      // A tap: the first corner or end; the next tap finishes it.
      setFirst(p);
      setDraft([p, p]);
    }
  };
  // The stroke is gone (the browser took the touch, or the capture was lost): what was set down
  // stays as it was, so the next touch starts clean.
  const abandon = (event: PointerEvent) => {
    if (down.current?.id !== event.pointerId) return;
    down.current = null;
    setDraft(first ? [first, first] : null);
  };

  const handlers = {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      const p = tool && mine(event) && pointAt(event);
      if (!p) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      down.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: p };
      setDraft(pair ? [first ?? p, p] : [p]);
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const start = first ?? (mine(event) ? down.current?.from : undefined);
      const p = start && pointAt(event);
      if (start && p) setDraft(pair ? [start, p] : [p]);
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      const start = down.current;
      if (start?.id !== event.pointerId) return;
      const p = tool && pointAt(event);
      if (p) finish(event, tool, p, start);
      down.current = null;
    },
    onPointerCancel: abandon,
    onLostPointerCapture: abandon,
    // A long press is not a menu or a text selection over the chart: it is a finger resting.
    onContextMenu: (event: MouseEvent) => event.preventDefault(),
  };

  return {
    draft: tool && tool !== 'text' && draft ? { kind: tool, points: draft } : null,
    handlers,
  };
}

/** The input of a note, where it goes on the chart: Enter (or leaving it) keeps it. */
function NoteInput({ control, at }: { control: DrawControl; at: Spot }) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  return (
    <input
      className="cc-draw-input"
      style={{ left: at.x, top: at.y }}
      aria-label={t('app.crypto.draw.noteLabel')}
      placeholder={t('app.crypto.draw.notePlaceholder')}
      maxLength={DRAWING_TEXT_MAX}
      value={text}
      ref={(input) => input?.focus()}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        control.saveNote(text);
      }}
      onBlur={() => control.saveNote(text)}
    />
  );
}

const layerClass = (tool: DrawTool | null) =>
  ['cc-draw-layer', tool && 'cc-draw-layer--on', tool === 'eraser' && 'cc-draw-layer--erase']
    .filter(Boolean)
    .join(' ');

/**
 * The drawings over the chart's pane (an SVG of the pane's size, placed again whenever the chart
 * moves) and, while a tool is on, the surface that takes the mouse or the finger instead of the
 * chart, so dragging draws and does not move it. That surface covers the whole chart, scales
 * included (a finger that lands on them draws too, it does not stretch the chart), and what it
 * reads is held inside the pane.
 */
function DrawLayer({
  control,
  drawings,
  projection,
  rate,
}: {
  control: DrawControl;
  drawings: Drawings;
  projection: Projection | null;
  /** Units of the display currency per euro (the candles are converted with it). */
  rate: number;
}) {
  const { t } = useI18n();
  const pane = useRef<SVGSVGElement>(null);
  const pointAt = (event: PointerEvent): DrawingPoint | null => {
    const box = pane.current!.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - box.left, 0), projection!.width);
    const y = Math.min(Math.max(event.clientY - box.top, 0), projection!.height);
    const time = projection!.time(x);
    const price = projection!.price(y);
    return time === null || price === null ? null : anchor(time, price / rate);
  };
  const gesture = useGesture(control, pointAt);
  if (!projection) return null;
  const { tool } = control;
  const erasing = tool === 'eraser';

  const spot = (p: DrawingPoint): Spot | null => {
    const x = projection.x(p.time);
    const y = projection.y(p.price * rate);
    return x === null || y === null ? null : { x, y };
  };
  const shape = (drawing: Drawing, erasable: boolean) => (
    <Shape
      key={drawing.id}
      drawing={drawing}
      spot={spot}
      width={projection.width}
      erasing={erasable}
      onErase={drawings.remove}
    />
  );
  const editor = control.editing && spot(control.editing);
  const { draft } = gesture;

  return (
    <>
      <svg
        ref={pane}
        className={layerClass(tool)}
        width={projection.width}
        height={projection.height}
        aria-hidden={erasing ? undefined : true}
      >
        {drawings.items.map((d) => shape(d, erasing))}
        {draft &&
          shape({ id: 'draft', color: control.color, width: control.width, ...draft }, false)}
      </svg>
      {tool && !erasing && <div className="cc-draw-catch" {...gesture.handlers} />}
      {editor && <NoteInput control={control} at={editor} />}
      <p className="cc-draw-hint" aria-live="polite">
        {hintFor(t, tool, drawings)}
      </p>
    </>
  );
}

/** The drawings over the chart, when the chart has them; a new tool starts with nothing drawn. */
export function DrawSurface(
  props: Omit<Parameters<typeof DrawLayer>[0], 'drawings'> & {
    drawings?: Drawings;
  }
) {
  const { drawings } = props;
  return drawings ? (
    <DrawLayer key={props.control.tool ?? ''} {...props} drawings={drawings} />
  ) : null;
}
