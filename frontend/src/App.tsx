import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { ProgressProvider } from './context/ProgressContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ProgressProvider>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AppShell>
        </ProgressProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
