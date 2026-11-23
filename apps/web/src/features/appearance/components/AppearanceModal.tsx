import { Button } from '@/components/ui/Button';
import { Modal, ModalActions, ModalBody, ModalTitle } from '@/components/ui/Modal';

import { appearanceSchema } from '../appearance';
import { appearanceOptions } from '../appearance-options';
import { useAppearanceStore } from '../store';

/**
 * Native radios, so arrow keys, focus and the checked state come from the browser. A choice
 * applies at once (the page behind the scrim previews it); Done only closes the dialog.
 */
export function AppearanceModal() {
  const isOpen = useAppearanceStore((state) => state.isDialogOpen);
  const close = useAppearanceStore((state) => state.closeDialog);
  const appearance = useAppearanceStore((state) => state.appearance);
  const setAppearance = useAppearanceStore((state) => state.setAppearance);

  return (
    <Modal open={isOpen} onClose={close}>
      <ModalTitle>Appearance</ModalTitle>
      <ModalBody>Choose how Chirp looks on this device.</ModalBody>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Theme</legend>
        {appearanceOptions.map(({ value, label, description, icon: Icon }) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-3 rounded-field border border-hairline px-4 py-3 transition-colors duration-150 hover:bg-paper has-checked:border-airmail-blue has-checked:bg-paper"
          >
            <Icon
              aria-hidden="true"
              className="size-5 shrink-0 text-ink-muted"
              strokeWidth={1.75}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold text-ink">{label}</span>
              <span className="text-sm text-ink-muted">{description}</span>
            </span>
            <input
              type="radio"
              name="appearance"
              value={value}
              checked={appearance === value}
              // Focus lands on the current choice, ready for the arrow keys.
              data-autofocus={appearance === value ? '' : undefined}
              onChange={(event) => {
                setAppearance(appearanceSchema.parse(event.currentTarget.value));
              }}
              // Drawn from the palette: the native dot renders a muddy grey on the night sheet.
              className="size-5 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-field-border bg-sheet transition-[border-width,border-color] duration-150 checked:border-[6px] checked:border-airmail-blue"
            />
          </label>
        ))}
      </fieldset>
      <ModalActions>
        <Button variant="secondary" onClick={close}>
          Done
        </Button>
      </ModalActions>
    </Modal>
  );
}
