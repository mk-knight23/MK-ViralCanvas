import { describe, it, expect, vi } from 'vitest';
import { Profiler } from 'react';
import { render, screen, act } from '@testing-library/react';
import App from '../App';
import { useStatsStore } from '@/stores/stats';

vi.mock('@/utils/api', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils/api')>();
  return {
    ...actual,
    getTemplates: vi.fn().mockResolvedValue([]),
    getActiveSources: vi.fn().mockResolvedValue([]),
  };
});

describe('App render performance (stats ticker isolation)', () => {
  it('does not re-render the app tree when the per-second time ticker fires', async () => {
    let commits = 0;
    render(
      <Profiler id="app" onRender={() => (commits += 1)}>
        <App />
      </Profiler>
    );

    // Wait for the initial template load to settle.
    await screen.findByText('Preview');
    await act(async () => {
      await Promise.resolve();
    });

    const baseline = commits;

    // The MemeGenerator interval calls addTimeSpent(1) every second.
    // Nothing visible subscribes to totalTimeSpent, so this must not
    // cause any commit anywhere in the app tree.
    act(() => {
      useStatsStore.getState().addTimeSpent(1);
      useStatsStore.getState().addTimeSpent(1);
      useStatsStore.getState().addTimeSpent(1);
    });
    expect(commits).toBe(baseline);

    // Sanity check: the nav stats ticker still updates on real events.
    act(() => {
      useStatsStore.getState().recordDownload();
    });
    expect(commits).toBeGreaterThan(baseline);
  });
});
