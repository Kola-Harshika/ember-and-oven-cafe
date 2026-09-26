import { Link } from 'react-router-dom';
import { FoodArt } from '@/components/visual/FoodArt';

/** Catches any mistyped URL and points the guest back at the pass. */
export function NotFoundPage() {
  return (
    <div className="shell page">
      <div className="notfound">
        <div>
          <span className="eyebrow">404 · off the menu</span>
          <h1>There is no dish at this address</h1>
          <p className="lede">
            The page you asked for either moved or never existed. The oven is still hot though — pick a counter and
            start again.
          </p>
          <div className="row">
            <Link to="/menu" className="btn btn--primary btn--lg">
              Back to the menu
            </Link>
            <Link to="/" className="btn btn--ghost btn--lg">
              Return to the cafe
            </Link>
          </div>
        </div>
        <FoodArt
          kind="pizza"
          keys={['crust-thin', 'sauce-tomato', 'cheese-mozzarella', 'basil-torn']}
          heat={1}
          seed="notfound"
          caption="Margherita, drawn to scale"
        />
      </div>
    </div>
  );
}
