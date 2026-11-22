import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import { FieldInput } from '@/components/ui/Field';

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>;

/** A password field with a toggle to show what was typed, which saves retyping on phones. */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      <FieldInput {...props} type={visible ? 'text' : 'password'} className="pr-12" />
      <button
        type="button"
        aria-label="Show password"
        aria-pressed={visible}
        onClick={() => {
          setVisible((current) => !current);
        }}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-muted transition-colors duration-150 hover:text-ink"
      >
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}
