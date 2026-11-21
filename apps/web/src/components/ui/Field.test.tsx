import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Field, FieldError, FieldHint, FieldInput, FieldLabel, FieldTextarea } from './Field';

describe('Field', () => {
  it('labels its control', () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldInput type="email" />
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('type', 'email');
  });

  it('describes the control with its hint', () => {
    render(
      <Field>
        <FieldLabel>Username</FieldLabel>
        <FieldInput />
        <FieldHint>Letters, numbers and underscores.</FieldHint>
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAccessibleDescription(
      'Letters, numbers and underscores.',
    );
  });

  it('marks the control invalid and announces the error with it', () => {
    render(
      <Field error="This username is taken">
        <FieldLabel>Username</FieldLabel>
        <FieldInput />
        <FieldHint>Letters, numbers and underscores.</FieldHint>
        <FieldError />
      </Field>,
    );

    const input = screen.getByRole('textbox', { name: 'Username' });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription(
      'Letters, numbers and underscores. This username is taken',
    );
  });

  it('describes nothing when there is no hint and no error', () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldInput />
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute('aria-describedby');
  });

  it('only references an error that is actually rendered', () => {
    render(
      <Field error="Required">
        <FieldLabel>Email</FieldLabel>
        <FieldInput />
      </Field>,
    );

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toBeInvalid();
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('renders nothing for FieldError when there is no error', () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <FieldInput />
        <FieldError />
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: 'Email' })).not.toBeInvalid();
    expect(screen.queryByText(/./, { selector: 'p' })).not.toBeInTheDocument();
  });

  it('refuses to render a part outside a Field', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<FieldInput />)).toThrow('<FieldInput> must be rendered inside <Field>');
  });
});

describe('FieldTextarea', () => {
  it('counts the characters left as code points, so emoji count as one', async () => {
    render(
      <Field>
        <FieldLabel>Bio</FieldLabel>
        <FieldTextarea maxCharacters={10} />
      </Field>,
    );

    await userEvent.type(screen.getByRole('textbox', { name: 'Bio' }), 'hi 🐦');

    expect(screen.getByText('6 characters left')).toBeInTheDocument();
  });

  it('flags text over the limit without blocking typing', async () => {
    render(
      <Field>
        <FieldLabel>Bio</FieldLabel>
        <FieldTextarea maxCharacters={3} />
      </Field>,
    );
    const textarea = screen.getByRole('textbox', { name: 'Bio' });

    await userEvent.type(textarea, 'hello');

    expect(textarea).toHaveValue('hello');
    expect(textarea).toBeInvalid();
    expect(textarea).toHaveAccessibleDescription('2 over the limit');
  });

  it('uses singular wording for one character left', async () => {
    render(
      <Field>
        <FieldLabel>Bio</FieldLabel>
        <FieldTextarea maxCharacters={2} defaultValue="a" />
      </Field>,
    );

    expect(screen.getByText('1 character left')).toBeInTheDocument();
  });

  it('counts a controlled value and forwards changes', async () => {
    const onChange = vi.fn();
    function Controlled() {
      const [bio, setBio] = useState('ok');
      return (
        <Field>
          <FieldLabel>Bio</FieldLabel>
          <FieldTextarea
            maxCharacters={5}
            value={bio}
            onChange={(event) => {
              setBio(event.target.value);
              onChange(event.target.value);
            }}
          />
        </Field>
      );
    }
    render(<Controlled />);

    expect(screen.getByText('3 characters left')).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Bio' }), '!');

    expect(onChange).toHaveBeenLastCalledWith('ok!');
    expect(screen.getByText('2 characters left')).toBeInTheDocument();
  });

  it('shows no counter without a limit', () => {
    render(
      <Field>
        <FieldLabel>Notes</FieldLabel>
        <FieldTextarea />
      </Field>,
    );

    expect(screen.queryByText(/left|over the limit/)).not.toBeInTheDocument();
  });
});
