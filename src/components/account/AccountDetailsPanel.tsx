/**
 * Profile details and password.
 *
 * Editing the profile is what makes checkout shorter next time: the saved address and
 * phone are what the checkout form pre-fills.
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ApiFailure } from '@/lib/apiClient';
import { accountService } from '@/services/accountService';

export function AccountDetailsPanel() {
  const { user, saveProfile } = useAuth();
  const { push } = useToast();

  const [details, setDetails] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [passwordNote, setPasswordNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDetails({ name: user.name, phone: user.phone ?? '', address: user.address ?? '' });
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await saveProfile({
        name: details.name,
        phone: details.phone || null,
        address: details.address || null,
      });
      push({ title: 'Details saved', message: 'We will pre-fill checkout for you.', tone: 'success' });
    } catch (failure) {
      push({
        title: 'We could not save that',
        message: failure instanceof ApiFailure ? failure.message : 'Please try again.',
        tone: 'warning',
      });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPasswordNote(null);
    try {
      await accountService.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '' });
      push({ title: 'Password updated', tone: 'success' });
    } catch (failure) {
      setPasswordNote(failure instanceof ApiFailure ? failure.message : 'We could not change that password.');
    }
  };

  return (
    <section className="panel stack">
      <h3>Your details</h3>
      <div className="form-grid">
        <TextField
          id="profile-name"
          label="Name"
          value={details.name}
          onChange={(event) => setDetails((current) => ({ ...current, name: event.target.value }))}
        />
        <TextField
          id="profile-phone"
          label="Phone"
          inputMode="tel"
          value={details.phone}
          onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))}
        />
      </div>
      <TextField
        id="profile-address"
        label="Usual delivery address"
        value={details.address}
        onChange={(event) => setDetails((current) => ({ ...current, address: event.target.value }))}
      />
      <div className="row">
        <Button variant="primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save details'}
        </Button>
      </div>

      <hr className="divider" />

      <h3>Password</h3>
      <div className="form-grid">
        <TextField
          id="profile-current"
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={passwords.current}
          onChange={(event) => setPasswords((current) => ({ ...current, current: event.target.value }))}
        />
        <TextField
          id="profile-next"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          value={passwords.next}
          onChange={(event) => setPasswords((current) => ({ ...current, next: event.target.value }))}
        />
      </div>
      {passwordNote && <p className="field__error">{passwordNote}</p>}
      <div className="row">
        <Button
          variant="quiet"
          onClick={() => void changePassword()}
          disabled={!passwords.current || passwords.next.length < 8}
        >
          Change password
        </Button>
      </div>
    </section>
  );
}
