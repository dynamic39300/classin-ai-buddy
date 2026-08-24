import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TypewriterGreeting } from './TypewriterGreeting';

const greeting = '老师好，有什么能帮您的？';

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TypewriterGreeting', () => {
  it('reveals the greeting once without changing its reserved layout text', () => {
    vi.useFakeTimers();
    stubReducedMotion(false);
    const { container } = render(<h1><TypewriterGreeting text={greeting} /></h1>);
    const typewriter = container.querySelector('[data-workbuddy-typewriter="true"]');
    const visual = container.querySelector('[data-typewriter-visual="true"]');

    expect(typewriter).toHaveAttribute('data-state', 'typing');
    expect(visual).toHaveTextContent('');
    expect(typewriter).toHaveTextContent(greeting);

    act(() => vi.advanceTimersByTime(371));
    expect(visual?.textContent?.length).toBeGreaterThan(0);
    expect(visual?.textContent?.length).toBeLessThan(greeting.length);

    act(() => vi.advanceTimersByTime(2_000));
    expect(typewriter).toHaveAttribute('data-state', 'complete');
    expect(visual).toHaveTextContent(greeting);
  });

  it('shows the full greeting immediately when reduced motion is preferred', () => {
    stubReducedMotion(true);
    const { container } = render(<h1><TypewriterGreeting text={greeting} /></h1>);
    const typewriter = container.querySelector('[data-workbuddy-typewriter="true"]');
    const visual = container.querySelector('[data-typewriter-visual="true"]');

    expect(typewriter).toHaveAttribute('data-state', 'complete');
    expect(visual).toHaveTextContent(greeting);
  });
});
