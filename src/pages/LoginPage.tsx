/**
 * Sign in.
 *
 * The session is a cookie set by the API, so there is nothing to store here. Failures
 * are shown as the API describes them ("invalid credentials"), which is also what the
 * shared message for a wrong email *or* password looks like — accounts cannot be probed.
 */
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiFailure } from '@/lib/apiClient';

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { push } = useToast();
  const { user, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as LocationState | null)?.from;

  useEffect(() => {
    if (user) navigate(from ?? (user.role === 'staff' ? '/admin' : '/profile'), { replace: true });
  }, [user, from, navigate]);

  const submit = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const account = await signIn({ email, password });
      push({ title: `Welcome back, ${account.name}`, message: 'You are signed in.', tone: 'success' });
      navigate(from ?? (account.role === 'staff' ? '/admin' : '/profile'), { replace: true });
    } catch (failure) {
      setProblem(failure instanceof ApiFailure ? failure.message : 'We could not sign you in just now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell page auth-page">
      <div className="auth-card panel">
        <span className="eyebrow">Your account</span>
        <h1>Sign in to the cafe</h1>
        <p className="lede">
          Your orders, addresses and the ones you are still waiting on — all in one place.
        </p>

        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TextField
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <TextField
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {problem && <p className="field__error">{problem}</p>}

          <Button variant="primary" size="lg" block type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="muted">
          No account yet? <Link to="/signup">Create one in a few seconds</Link>, or{' '}
          <Link to="/menu">keep browsing the menu</Link> and check out as a guest.
        </p>
      </div>
    </div>
  );
}
