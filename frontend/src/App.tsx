import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProgressProvider } from './context/ProgressContext';
import { SettingsProvider } from './context/SettingsContext';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';

function AuthenticatedApp() {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <ProgressProvider>
          <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
          </AppShell>
        </ProgressProvider>
      </SettingsProvider>
    </LanguageProvider>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<AppRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
