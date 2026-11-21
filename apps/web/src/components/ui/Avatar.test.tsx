import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Avatar } from './Avatar';
import { avatarColorOf } from './avatar-utils';

describe('Avatar', () => {
  it('is decorative by default, so a name shown beside it is not read twice', () => {
    const { container } = render(<Avatar name="Ana Torres" userId="user-1" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const avatar = container.firstElementChild;
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar).toHaveTextContent('AT');
    expect(avatar).toHaveClass(avatarColorOf('user-1'));
  });

  it('is named when it stands alone', () => {
    render(<Avatar name="Ana Torres" label="Ana Torres" userId="user-1" />);

    expect(screen.getByRole('img', { name: 'Ana Torres' })).toHaveTextContent('AT');
  });

  it('shows the picture, decorative by default', () => {
    const { container } = render(
      <Avatar name="Ana Torres" userId="user-1" src="https://cdn.example/ana.png" />,
    );

    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', 'https://cdn.example/ana.png');
    expect(image).toHaveAttribute('alt', '');
  });

  it('names the picture when it stands alone', () => {
    render(<Avatar name="Ana" label="Your profile" userId="u" src="https://cdn.example/ana.png" />);

    expect(screen.getByRole('img', { name: 'Your profile' })).toBeInTheDocument();
  });

  it('falls back to initials when the picture fails to load', () => {
    const { container } = render(
      <Avatar name="Ana Torres" userId="user-1" src="https://cdn.example/broken.png" />,
    );

    fireEvent.error(container.querySelector('img') as HTMLImageElement);

    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveTextContent('AT');
  });

  it.each([
    ['sm', 'size-8'],
    ['md', 'size-11'],
    ['lg', 'size-20'],
  ] as const)('renders the %s size', (size, className) => {
    const { container } = render(<Avatar name="Ana" userId="user-1" size={size} />);

    expect(container.firstElementChild).toHaveClass(className);
  });
});
