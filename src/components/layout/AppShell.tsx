import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <Link to="/" className="app-nav-logo">
          Sözcük
        </Link>
        <div className="app-nav-links">
          <Link to="/" className={`nav-link ${pathname === '/' ? 'nav-link-active' : ''}`}>
            Home
          </Link>
          <Link
            to="/settings"
            className={`nav-link ${pathname === '/settings' ? 'nav-link-active' : ''}`}
          >
            Settings
          </Link>
        </div>
      </nav>
      <main className="app-main">{children}</main>
    </div>
  );
}
