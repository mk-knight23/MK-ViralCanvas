import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsPanel } from '../components/SettingsPanel';
import { useSettingsStore } from '@/stores/settings';

describe('SettingsPanel dialog accessibility', () => {
  beforeEach(() => {
    act(() => {
      useSettingsStore.setState({ showHelp: false });
    });
  });

  it('renders no dialog while closed', () => {
    render(<SettingsPanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves focus into the dialog on open and closes on Escape', async () => {
    render(<SettingsPanel />);

    act(() => {
      useSettingsStore.setState({ showHelp: true });
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Initial focus is moved into the dialog (scheduled via setTimeout).
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(useSettingsStore.getState().showHelp).toBe(false);
  });
});
