import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getLocale } from '../../lib/locale';

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const { user, logout } = useAuth();
  const t = getLocale(lang);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

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
            <div className="user-menu" ref={menuRef}>
              <button
                className="user-avatar"
                onClick={() => setMenuOpen(o => !o)}
                aria-label="User menu"
              >
                {user.username[0].toUpperCase()}
              </button>
              {menuOpen && (
                <div className="user-dropdown">
                  <span className="user-dropdown-name">{user.username}</span>
                  <button className="user-dropdown-logout" onClick={() => { logout(); setMenuOpen(false); }}>
                    {t.logout}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
