import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES, loadPreferences, savePreferences } from './preferences';

describe('preferences', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns defaults when no preferences are stored', () => {
    expect(loadPreferences({ getItem: () => null })).toEqual(DEFAULT_PREFERENCES);
  });

  it('merges valid stored settings with defaults', () => {
    expect(loadPreferences({ getItem: () => JSON.stringify({ theme: 'dark' }) })).toEqual({
      theme: 'dark',
      showTips: true,
      compact: false
    });
  });

  it('ignores invalid stored values and reports malformed JSON', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(loadPreferences({
      getItem: () => JSON.stringify({ theme: 42, showTips: 'yes', compact: true })
    })).toEqual({ ...DEFAULT_PREFERENCES, compact: true });
    expect(loadPreferences({ getItem: () => '{invalid' })).toEqual(DEFAULT_PREFERENCES);
    expect(consoleWarn).toHaveBeenCalled();
  });

  it('stores the typed preference value', () => {
    const setItem = vi.fn();
    const preferences = { theme: 'dark', showTips: false, compact: true };

    savePreferences({ setItem }, preferences);

    expect(setItem).toHaveBeenCalledWith('workshop_preferences', JSON.stringify(preferences));
  });
});
