export interface Preferences {
  theme: string;
  showTips: boolean;
  compact: boolean;
}

export const PREFERENCES_STORAGE_KEY = 'workshop_preferences';

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  showTips: true,
  compact: false
};

export function loadPreferences(storage: Pick<Storage, 'getItem'>): Preferences {
  const serializedPreferences = storage.getItem(PREFERENCES_STORAGE_KEY);
  if (!serializedPreferences) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const preferences: unknown = JSON.parse(serializedPreferences);
    if (!isPreferencesRecord(preferences)) {
      return { ...DEFAULT_PREFERENCES };
    }

    return {
      theme: typeof preferences.theme === 'string'
        ? preferences.theme
        : DEFAULT_PREFERENCES.theme,
      showTips: typeof preferences.showTips === 'boolean'
        ? preferences.showTips
        : DEFAULT_PREFERENCES.showTips,
      compact: typeof preferences.compact === 'boolean'
        ? preferences.compact
        : DEFAULT_PREFERENCES.compact
    };
  } catch (error) {
    console.warn('Preferences could not be loaded', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(
  storage: Pick<Storage, 'setItem'>,
  preferences: Preferences
): void {
  storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

function isPreferencesRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
