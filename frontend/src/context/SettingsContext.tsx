import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode, ReactElement } from 'react';
import type { UserSettings } from '../types/settings';
import { apiFetch } from '../lib/apiClient';

const STORAGE_KEY = 'vocab_settings';

const DEFAULT_SETTINGS: UserSettings = {
  max_new_words_per_day: 10,
};

function loadLocal(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as UserSettings;
    if (typeof parsed.max_new_words_per_day !== 'number' || parsed.max_new_words_per_day < 1) {
      return DEFAULT_SETTINGS;
    }
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveLocal(s: UserSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (patch: Partial<UserSettings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }): ReactElement {
  const [settings, setSettings] = useState<UserSettings>(loadLocal);

  // Fetch from server on mount
  useEffect(() => {
    apiFetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: UserSettings | null) => {
        if (data && typeof data.max_new_words_per_day === 'number') {
          setSettings(data);
          saveLocal(data);
        }
      })
      .catch(() => {
        // Offline — use local settings
      });
  }, []);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveLocal(next);
      apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch((e) => console.error('settings sync failed:', e));
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
