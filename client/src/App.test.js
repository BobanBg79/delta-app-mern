import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/Username/i);
  expect(linkElement).toBeInTheDocument();
});

describe('some desc', () => {
  it('should rturn 4', () => {
    const x = 2;
    expect(x + 2).toEqual(4);
  });
});
