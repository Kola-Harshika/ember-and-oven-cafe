import { NavLink, Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/context/OrderContext';
import { useScrolled } from '@/lib/hooks';
import { AmbienceToggle } from './AmbienceToggle';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/menu', label: 'Menu' },
  { to: '/tray', label: 'Tray' },
];

export function SiteHeader() {
  const { count } = useCart();
  const { order } = useOrder();
  const { user, isStaff } = useAuth();
  const scrolled = useScrolled(18);

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}`}>
      <div className="shell site-header__inner">
        <Link to="/" className="brand" aria-label="Ember & Oven home">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="34" height="34">
              <path
                d="M20 4c4 5.5 7.5 8.6 7.5 14.2C27.5 24 24 27.6 20 27.6S12.5 24 12.5 18.2C12.5 12.6 16 9.5 20 4Z"
                fill="url(#brand-flame)"
              />
              <path d="M20 14c1.9 2.6 3.3 4 3.3 6.6 0 2.4-1.5 4.1-3.3 4.1s-3.3-1.7-3.3-4.1c0-2.6 1.4-4 3.3-6.6Z" fill="#fde8b8" />
              <rect x="11" y="30" width="18" height="3.4" rx="1.7" fill="#8a5a3b" />
              <defs>
                <linearGradient id="brand-flame" x1="0.5" y1="1" x2="0.5" y2="0">
                  <stop offset="0" stopColor="#f0b429" />
                  <stop offset="0.6" stopColor="#f2761f" />
                  <stop offset="1" stopColor="#e2542b" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="brand__text">
            <strong>Ember &amp; Oven</strong>
            <small>slow-brewed cafe</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main">
          {NAV.map((entry) => (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.to === '/'}
              className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}
            >
              {entry.label}
            </NavLink>
          ))}
          {order && (
            <NavLink to={`/order/${order.id}`} className={({ isActive }) => `site-nav__link${isActive ? ' is-active' : ''}`}>
              Track order
            </NavLink>
          )}
        </nav>

        <div className="site-header__actions">
          {isStaff && (
            <Link to="/admin" className="account-pill account-pill--staff" aria-label="Kitchen dashboard">
              <span>Kitchen</span>
            </Link>
          )}
          <Link
            to={user ? '/profile' : '/login'}
            className="account-pill"
            aria-label={user ? `Signed in as ${user.name}` : 'Sign in'}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 12.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4 0-7.25 2.4-7.25 5.35 0 .45.36.65.8.65h12.9c.44 0 .8-.2.8-.65 0-2.95-3.25-5.35-7.25-5.35Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span>{user ? user.name.split(' ')[0] : 'Sign in'}</span>
          </Link>
          <AmbienceToggle />
          <Link to="/tray" className="tray-pill" aria-label={`Tray, ${count} items`}>
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8ZM9 8V6.5a3 3 0 0 1 6 0V8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Tray</span>
            <span className="tray-pill__count" data-empty={count === 0}>
              {count}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
