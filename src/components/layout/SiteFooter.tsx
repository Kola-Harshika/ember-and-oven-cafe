import { Link } from 'react-router-dom';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__col">
          <h4>Ember &amp; Oven</h4>
          <p>
            A small cafe with one stone oven, a fryer that never cools and a shake bar. Everything is built to order, so
            give us ten to fifteen minutes.
          </p>
        </div>
        <div className="site-footer__col">
          <h4>Visit</h4>
          <p>
            Hyderabad, Telangana
            <br />
            Open 8am – 11pm, every day
          </p>
        </div>
        <div className="site-footer__col">
          <h4>Shortcuts</h4>
          <ul className="site-footer__links">
            <li>
              <Link to="/menu">Full menu</Link>
            </li>
            <li>
              <Link to="/menu?category=pizza">Wood-fired pizza</Link>
            </li>
            <li>
              <Link to="/menu?category=shakes">Thick shakes</Link>
            </li>
            <li>
              <Link to="/tray">Your tray</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="shell site-footer__base">
        <span>© {new Date().getFullYear()} Ember &amp; Oven. A demo cafe experience.</span>
        <span>Made with dough, smoke and a little bit of CSS.</span>
      </div>
    </footer>
  );
}
