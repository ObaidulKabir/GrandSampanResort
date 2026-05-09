import { render, screen } from '@testing-library/react';
import Button from '../Button';

test('renders primary button', () => {
  render(<Button>Click</Button>);
  expect(screen.getByText('Click')).toBeInTheDocument();
});

