import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getLocale } from '../../lib/locale';

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const { user, logout } = useAuth();
  const t = getLocale(lang);

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <Link to="/" className="app-nav-logo">
          Sözcük
        </Link>
        <div className="app-nav-links">
          <Link to="/" className={`nav-link ${pathname === '/' ? 'nav-link-active' : ''}`}>
            {t.nav_home}
          </Link>
          <Link
            to="/settings"
            className={`nav-link ${pathname === '/settings' ? 'nav-link-active' : ''}`}
          >
            {t.nav_settings}
          </Link>
          {user && (
            <button className="nav-link" onClick={logout} style={{ border: 'none', background: 'none', cursor: 'pointer', font: 'inherit' }}>
              {user.username}
            </button>
          )}
        </div>
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
