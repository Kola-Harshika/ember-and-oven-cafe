/**
 * Create an account.
 *
 * The API owns validation (duplicate email, password length, phone shape) so the rules
 * live in one place; whatever it answers is shown verbatim, which keeps this page
 * honest about what is wrong.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiFailure } from '@/lib/apiClient';

export function SignUpPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { user, signUp } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'staff' ? '/admin' : '/profile', { replace: true });
  }, [user, navigate]);

  const patch = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const account = await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
        ...(form.address ? { address: form.address } : {}),
      });
      push({ title: `Welcome, ${account.name}`, message: 'Your account is ready.', tone: 'success' });
      navigate('/profile', { replace: true });
    } catch (failure) {
      setProblem(failure instanceof ApiFailure ? failure.message : 'We could not create that account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shell page auth-page">
      <div className="auth-card panel">
        <span className="eyebrow">New here</span>
        <h1>Create your cafe account</h1>
        <p className="lede">
          One account keeps your order history, your usual table and your favourite build of everything on the menu.
        </p>

        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <TextField
            id="signup-name"
            label="Name"
            placeholder="Harshika"
            autoComplete="name"
            value={form.name}
            onChange={(event) => patch('name', event.target.value)}
          />
          <TextField
            id="signup-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) => patch('email', event.target.value)}
          />
          <TextField
            id="signup-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={form.password}
            onChange={(event) => patch('password', event.target.value)}
          />
          <TextField
            id="signup-phone"
            label="Phone"
            inputMode="tel"
            hint="Optional — used for delivery."
            placeholder="98765 43210"
            value={form.phone}
            onChange={(event) => patch('phone', event.target.value)}
          />
          <TextField
            id="signup-address"
            label="Usual delivery address"
            hint="Optional — you can also set this later."
            placeholder="Flat, building, street, area"
            value={form.address}
            onChange={(event) => patch('address', event.target.value)}
          />

          {problem && <p className="field__error">{problem}</p>}

          <Button variant="primary" size="lg" block type="submit" disabled={busy}>
            {busy ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>

        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link> instead.
        </p>
      </div>
    </div>
  );
}
