/**
 * The customer's account page: who they are, what they have ordered, and the way out.
 */
import { Link, useNavigate } from 'react-router-dom';
import { AccountDetailsPanel } from '@/components/account/AccountDetailsPanel';
import { OrderHistoryPanel } from '@/components/account/OrderHistoryPanel';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/context/OrderContext';
import { useToast } from '@/context/ToastContext';
import { formatClock } from '@/lib/format';

export function ProfilePage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { user, status, signOut } = useAuth();
  const { clearOrder } = useOrder();

  if (!user) {
    return (
      <div className="shell page">
        <div className="empty-state">
          <span className="eyebrow">Your account</span>
          <h1>{status === 'offline' ? 'We cannot reach the cafe right now' : 'Sign in to see your account'}</h1>
          <p className="muted">
            {status === 'offline'
              ? 'Your orders are safe — this page just needs a connection to the kitchen.'
              : 'Your order history, usual address and current orders live behind a sign-in.'}
          </p>
          <div className="row">
            <Link to="/login" className="btn btn--primary">
              Sign in
            </Link>
            <Link to="/signup" className="btn btn--ghost">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell page">
      <header className="page-head">
        <span className="eyebrow">Your account</span>
        <h1>{user.name}</h1>
        <p className="lede">
          {user.email} · joined {formatClock(user.createdAt)}
          {user.role === 'staff' ? ' · cafe staff' : ''}
        </p>
        <div className="row">
          {user.role === 'staff' && (
            <Link to="/admin" className="btn btn--primary">
              Open the kitchen dashboard
            </Link>
          )}
          <Button
            variant="quiet"
            onClick={async () => {
              await signOut();
              clearOrder();
              push({ title: 'Signed out', tone: 'default' });
              navigate('/');
            }}
          >
            Sign out
          </Button>
          <Link to="/menu" className="btn btn--ghost">
            Back to the menu
          </Link>
        </div>
      </header>

      <div className="profile-layout">
        <AccountDetailsPanel />
        <OrderHistoryPanel />
      </div>
    </div>
  );
}
