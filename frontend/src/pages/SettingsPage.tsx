import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useProgress } from '../context/ProgressContext';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { getLocale } from '../lib/locale';

export function SettingsPage() {
  const { lang, setLang } = useLanguage();
  const { resetLang, resetAll } = useProgress();
  const { settings, updateSettings } = useSettings();
  const [confirmReset, setConfirmReset] = useState<'lang' | 'all' | null>(null);
  const t = getLocale(lang);

  function handleResetLang() {
    if (confirmReset === 'lang') {
      resetLang(lang);
      setConfirmReset(null);
    } else {
      setConfirmReset('lang');
    }
  }

  function handleResetAll() {
    if (confirmReset === 'all') {
      resetAll();
      setConfirmReset(null);
    } else {
      setConfirmReset('all');
    }
  }

  return (
    <div className="page">
      <PageHeader title={t.settings_title} subtitle={t.settings_subtitle} />

      <div className="settings-grid">
        <Card>
          <h3 className="card-section-title">{t.language_title}</h3>
          <p className="text-secondary">{t.active_lang}: <strong>{lang.toUpperCase()}</strong></p>
          <div className="lang-buttons">
            <Button
              variant={lang === 'tr' ? 'primary' : 'secondary'}
              onClick={() => setLang('tr')}
            >
              Türkçe (TR)
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="card-section-title">{t.study_settings_title}</h3>
          <label className="setting-label">
            <span>{t.max_new_words_label}</span>
            <div className="setting-input-row">
              <input
                type="number"
                className="setting-input"
                min={1}
                max={50}
                value={settings.max_new_words_per_day}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 50) {
                    updateSettings({ max_new_words_per_day: val });
                  }
                }}
              />
              <span className="text-secondary">{t.words_per_day}</span>
            </div>
          </label>
          <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {t.max_new_words_hint}
          </p>
        </Card>

        <Card>
          <h3 className="card-section-title">{t.reset_title}</h3>
          <p className="text-secondary">{t.reset_warning}</p>
          <div className="danger-buttons">
            <Button variant="danger" onClick={handleResetLang}>
              {confirmReset === 'lang' ? t.confirm_prompt : t.reset_lang(lang)}
            </Button>
            {confirmReset === 'lang' && (
              <Button variant="ghost" onClick={() => setConfirmReset(null)}>{t.cancel}</Button>
            )}
          </div>
          <div className="danger-buttons" style={{ marginTop: '0.75rem' }}>
            <Button variant="danger" onClick={handleResetAll}>
              {confirmReset === 'all' ? t.confirm_prompt : t.reset_all}
            </Button>
            {confirmReset === 'all' && (
              <Button variant="ghost" onClick={() => setConfirmReset(null)}>{t.cancel}</Button>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="card-section-title">{t.about_title}</h3>
          <p className="text-secondary">{t.about_text}</p>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>{t.data_local}</p>
        </Card>
      </div>
    </div>
  );
}
