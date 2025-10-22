import { render, screen } from '@testing-library/react';
import App from './App';

test('renders status banner and board grid', () => {
  render(<App />);
  const status = screen.getByTestId('status-banner');
  expect(status).toBeInTheDocument();
  expect(status).toHaveAttribute('aria-live', 'polite');
  const grid = screen.getByRole('grid');
  expect(grid).toBeInTheDocument();
});

test('renders restart button', () => {
  render(<App />);
  const btn = screen.getByRole('button', { name: /restart/i });
  expect(btn).toBeInTheDocument();
});
