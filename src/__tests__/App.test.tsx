import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import pkg from '../../package.json';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeInTheDocument();
  });

  it('shows the package.json version and correct branding in the footer', () => {
    render(<App />);
    expect(screen.getByText(`MK ViralCanvas v${pkg.version}`)).toBeInTheDocument();

    const github = screen.getByRole('link', { name: 'GitHub' });
    expect(github).toHaveAttribute('href', 'https://github.com/mk-knight23/MK-ViralCanvas');

    const author = screen.getByRole('link', { name: 'Kazi Musharraf' });
    expect(author).toHaveAttribute('href', 'https://www.mkazi.live');
  });
});
