import { countCharacters } from '@chirp/shared';
import { CircleAlert } from 'lucide-react';
import {
  type ChangeEvent,
  type ComponentProps,
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useId,
  useState,
} from 'react';

interface FieldContextValue {
  inputId: string;
  hintId: string;
  errorId: string;
  counterId: string;
  error: string | undefined;
  /** Parts actually rendered, so `aria-describedby` never points at a missing element. */
  rendered: { hint: boolean; error: boolean };
  register: (part: 'hint' | 'error') => () => void;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useField(part: string): FieldContextValue {
  const field = use(FieldContext);
  if (!field) throw new Error(`<${part}> must be rendered inside <Field>`);
  return field;
}

const controlClasses = [
  // The outline is the only cue of where to type, so it meets 3:1 (field-border), not hairline.
  'w-full rounded-lg border border-field-border bg-sheet px-3 text-ink placeholder:text-ink-muted',
  'transition-[border-color] duration-150 hover:border-ink',
  'aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');

interface FieldProps {
  /** Error message for the control; marks it invalid and is announced with it. */
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A labelled form control. Wires `id`, `htmlFor`, `aria-describedby` and
 * `aria-invalid` so every form is accessible by construction.
 *
 *   <Field error={errors.email}>
 *     <FieldLabel>Email</FieldLabel>
 *     <FieldInput type="email" />
 *     <FieldHint>We never show it on your profile.</FieldHint>
 *     <FieldError />
 *   </Field>
 */
export function Field({ error, className = '', children }: FieldProps) {
  const id = useId();
  const [rendered, setRendered] = useState({ hint: false, error: false });
  const register = useCallback((part: 'hint' | 'error') => {
    setRendered((current) => ({ ...current, [part]: true }));
    return () => setRendered((current) => ({ ...current, [part]: false }));
  }, []);
  const value: FieldContextValue = {
    inputId: `${id}-control`,
    hintId: `${id}-hint`,
    errorId: `${id}-error`,
    counterId: `${id}-counter`,
    error,
    rendered,
    register,
  };
  return (
    <FieldContext value={value}>
      <div className={`flex flex-col gap-1.5 ${className}`}>{children}</div>
    </FieldContext>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  const { inputId } = useField('FieldLabel');
  return (
    <label htmlFor={inputId} className="text-sm font-semibold text-ink">
      {children}
    </label>
  );
}

function describedBy(field: FieldContextValue, extra?: string): string | undefined {
  const ids = [
    field.rendered.hint ? field.hintId : null,
    field.error && field.rendered.error ? field.errorId : null,
    extra,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function FieldInput({ className = '', ...props }: ComponentProps<'input'>) {
  const field = useField('FieldInput');
  return (
    <input
      id={field.inputId}
      aria-invalid={field.error ? true : undefined}
      aria-describedby={describedBy(field)}
      className={`${controlClasses} h-11 ${className}`}
      {...props}
    />
  );
}

interface TextareaProps extends ComponentProps<'textarea'> {
  /** Shows a live counter in Unicode code points (emoji count as one). */
  maxCharacters?: number;
}

export function FieldTextarea({
  maxCharacters,
  className = '',
  value,
  defaultValue,
  onChange,
  ...props
}: TextareaProps) {
  const field = useField('FieldTextarea');
  const [uncontrolledText, setUncontrolledText] = useState(String(defaultValue ?? ''));
  const text = value === undefined ? uncontrolledText : String(value);
  const remaining = maxCharacters === undefined ? undefined : maxCharacters - countCharacters(text);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    if (value === undefined) setUncontrolledText(event.target.value);
    onChange?.(event);
  }

  return (
    <>
      <textarea
        id={field.inputId}
        aria-invalid={field.error || (remaining !== undefined && remaining < 0) ? true : undefined}
        aria-describedby={describedBy(field, remaining === undefined ? undefined : field.counterId)}
        className={`${controlClasses} min-h-24 resize-y py-2.5 ${className}`}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={handleChange}
        {...props}
      />
      {remaining === undefined ? null : (
        <p
          id={field.counterId}
          className={`self-end text-xs tabular-nums ${remaining < 0 ? 'font-semibold text-danger' : 'text-ink-muted'}`}
        >
          {remaining < 0
            ? `${-remaining} over the limit`
            : `${remaining} ${remaining === 1 ? 'character' : 'characters'} left`}
        </p>
      )}
    </>
  );
}

export function FieldHint({ children }: { children: ReactNode }) {
  const { hintId, register } = useField('FieldHint');
  useEffect(() => register('hint'), [register]);
  return (
    <p id={hintId} className="text-sm text-ink-muted">
      {children}
    </p>
  );
}

/** Renders the field's error, if any, with an icon so it never relies on colour alone. */
export function FieldError() {
  const { errorId, error, register } = useField('FieldError');
  useEffect(() => (error ? register('error') : undefined), [error, register]);
  return error ? (
    <p id={errorId} className="flex items-center gap-1.5 text-sm font-medium text-danger">
      <CircleAlert aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
      {error}
    </p>
  ) : null;
}
