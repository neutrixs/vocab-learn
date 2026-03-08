import { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useProgress } from '../context/ProgressContext';
import { useLanguage } from '../context/LanguageContext';

export function SettingsPage() {
  const { lang, setLang } = useLanguage();
  const { resetLang, resetAll } = useProgress();
  const [confirmReset, setConfirmReset] = useState<'lang' | 'all' | null>(null);

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
      <PageHeader title="Ayarlar" subtitle="Tercihler ve sıfırlama" />

      <div className="settings-grid">
        <Card>
          <h3 className="card-section-title">Dil</h3>
          <p className="text-secondary">Aktif dil: <strong>{lang.toUpperCase()}</strong></p>
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
          <h3 className="card-section-title">İlerlemeyi Sıfırla</h3>
          <p className="text-secondary">
            Bu işlem geri alınamaz. Tüm SM-2 kart verileri silinir.
          </p>
          <div className="danger-buttons">
            <Button variant="danger" onClick={handleResetLang}>
              {confirmReset === 'lang' ? 'Emin misiniz? (Tekrar tıklayın)' : `${lang.toUpperCase()} verisini sıfırla`}
            </Button>
            {confirmReset === 'lang' && (
              <Button variant="ghost" onClick={() => setConfirmReset(null)}>İptal</Button>
            )}
          </div>
          <div className="danger-buttons" style={{ marginTop: '0.75rem' }}>
            <Button variant="danger" onClick={handleResetAll}>
              {confirmReset === 'all' ? 'Emin misiniz? (Tekrar tıklayın)' : 'Tüm ilerlemeyi sıfırla'}
            </Button>
            {confirmReset === 'all' && (
              <Button variant="ghost" onClick={() => setConfirmReset(null)}>İptal</Button>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="card-section-title">Hakkında</h3>
          <p className="text-secondary">
            Sözcük Öğren — Aralıklı tekrar (SM-2) ile yabancı dil kelime öğrenme uygulaması.
          </p>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
            Veriler yalnızca tarayıcınızda saklanır.
          </p>
        </Card>
      </div>
    </div>
  );
}
