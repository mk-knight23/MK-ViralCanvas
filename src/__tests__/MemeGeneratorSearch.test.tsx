import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemeGenerator } from '../components/MemeGenerator';
import { ApiError, searchMemes } from '@/utils/api';

vi.mock('@/utils/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils/api')>();
  return {
    ...actual,
    getTemplates: vi.fn().mockResolvedValue([]),
    getActiveSources: vi.fn().mockResolvedValue([]),
    searchMemes: vi.fn(),
    getTrendingMemes: vi.fn(),
    getCategoryMemes: vi.fn(),
  };
});

async function searchFor(term: string) {
  render(<MemeGenerator />);
  const browseTab = await screen.findByRole('button', { name: /browse/i });
  fireEvent.click(browseTab);
  const input = await screen.findByPlaceholderText(/search memes/i);
  fireEvent.change(input, { target: { value: term } });
}

describe('MemeGenerator search result states', () => {
  beforeEach(() => {
    vi.mocked(searchMemes).mockReset();
  });

  it('shows the empty-results state when the API succeeds with no matches', async () => {
    vi.mocked(searchMemes).mockResolvedValue([]);
    await searchFor('nothing-matches');

    expect(await screen.findByText(/no memes found/i, undefined, { timeout: 2000 })).toBeVisible();
    expect(screen.queryByText(/search unavailable/i)).not.toBeInTheDocument();
  });

  it('shows a distinct error state when the API fails (not the empty state)', async () => {
    vi.mocked(searchMemes).mockRejectedValue(new ApiError('upstream down', '/memes/search', 502));
    await searchFor('drake');

    expect(
      await screen.findByText('Search unavailable — try again', undefined, { timeout: 2000 })
    ).toBeVisible();
    expect(screen.queryByText(/no memes found/i)).not.toBeInTheDocument();
  });
});
