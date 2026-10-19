/** One option of a question: a short label and, when it helps, an example under it. */
export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * A question answered with one tap: big cards holding native radios, so the keyboard (arrows)
 * and screen readers work as with any group of options. The group is named by the question.
 */
export function Choice({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  /** The question, for screen readers. */
  label: string;
  options: ChoiceOption[];
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="wiz-choices" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className="wiz-choice">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span className="wiz-choice-text">
            <strong>{o.label}</strong>
            {o.hint && <small>{o.hint}</small>}
          </span>
        </label>
      ))}
    </div>
  );
}
