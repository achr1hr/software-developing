import { render, screen } from '@testing-library/react';
import App from './App';
import { calculatePrice, validatePrintModelInput } from './domain/printFlow';

test('renders PrintFlow MVP workspace', () => {
  render(<App />);
  expect(screen.getByText(/PrintFlow MVP/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /создать заказ/i })).toBeInTheDocument();
});

test('calculates MVP price by material, volume and quantity', () => {
  expect(calculatePrice({ volume_cm3: 10, material: 'PLA', quantity: 2 })).toBe(610);
});

test('validates STL extension and build volume', () => {
  const errors = validatePrintModelInput({
    fileName: 'part.obj',
    volume_cm3: 10,
    x_mm: 300,
    y_mm: 20,
    z_mm: 20,
  });

  expect(errors).toContain('Файл модели должен иметь расширение .stl.');
  expect(errors.some((error) => error.includes('не помещается'))).toBe(true);
});
