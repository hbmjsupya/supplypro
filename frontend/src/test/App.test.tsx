import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple component for testing
const TestComponent = () => {
  return <div>Hello Vitest</div>;
};

describe('App', () => {
  it('renders correctly', () => {
    render(<TestComponent />);
    expect(screen.getByText('Hello Vitest')).toBeInTheDocument();
  });

  it('math works', () => {
    expect(1 + 1).toBe(2);
  });
});
