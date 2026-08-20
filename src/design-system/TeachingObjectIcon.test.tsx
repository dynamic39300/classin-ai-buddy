import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeachingObjectIcon } from './TeachingObjectIcon';

describe('TeachingObjectIcon', () => {
  it('renders a normalized decorative icon with stable geometry', () => {
    render(<TeachingObjectIcon kind="lesson" data-testid="icon" />);

    const icon = screen.getByTestId('icon');
    expect(icon).toHaveAttribute('data-teaching-object', 'lesson');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('width', '16');
    expect(icon).toHaveAttribute('height', '16');
    expect(icon).toHaveAttribute('stroke-width', '2.625');
  });
});
