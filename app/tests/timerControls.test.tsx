import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimerControls } from '../src/components/TimerControls';

vi.mock('../src/hooks/useTimer', () => ({
  useTimer: () => ({
    isActive: false,
    activeStartAt: null,
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
  }),
}));

describe('TimerControls', () => {
  it('renders a start button with the expected gradient styling', () => {
    render(<TimerControls db={{} as never} />);

    const startButton = screen.getByRole('button', { name: /start adventure/i });
    const styleAttr = startButton.getAttribute('style') ?? '';

    expect(styleAttr).toContain('linear-gradient');
    expect(styleAttr).toContain('color');
  });
});
