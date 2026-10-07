import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ names: [] }),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders names heading', async () => {
  render(<App />);
  const heading = await screen.findByText(/names/i);
  expect(heading).toBeInTheDocument();
});
