/**
 * The kitchen dashboard (staff area).
 *
 * Guarded twice on purpose: the API refuses every request from a non-staff session, and
 * this page explains itself instead of rendering an empty board for a customer who
 * wanders in. Nothing here is a "hidden" client-side route.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ORDER_FLOW, STATUS_META } from '../../shared/orderStatus.ts';
import { AvailabilityBoard } from '@/components/admin/AvailabilityBoard';
import { KitchenBoard } from '@/components/admin/KitchenBoard';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/services/adminApi';
import type { AdminSummaryDto } from '@/services/types';

const REFRESH_MS = 15000;

export function AdminPage() {
  const { user, status } = useAuth();
  const [summary, setSummary] = useState<AdminSummaryDto | null>(null);

  useEffect(() => {
    if (user?.role !== 'staff') return;

    const read = () =>
      adminApi
        .summary()
        .then(setSummary)
        .catch(() => setSummary(null));

    void read();
    const timer = window.setInterval(() => void read(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [user]);

  if (!user) {
    return (
      <div className="shell page">
        <div className="empty-state">
          <span className="eyebrow">Kitchen dashboard</span>
          <h1>{status === 'offline' ? 'The kitchen is unreachable right now' : 'Staff sign-in required'}</h1>
          <p className="muted">
            {status === 'offline'
              ? 'This screen needs a live connection to the order book.'
              : 'The order book, the status controls and menu availability are only available to cafe staff accounts.'}
          </p>
          <div className="row">
            <Link to="/login" className="btn btn--primary">
              Staff sign in
            </Link>
            <Link to="/menu" className="btn btn--ghost">
              Back to the menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'staff') {
    return (
      <div className="shell page">
        <div className="empty-state">
          <span className="eyebrow">Kitchen dashboard</span>
          <h1>This area is for cafe staff</h1>
          <p className="muted">
            You are signed in as {user.email}. Your own orders are in{' '}
            <Link to="/profile">your account</Link> — the kitchen's order book is kept separate on purpose.
          </p>
          <div className="row">
            <Link to="/profile" className="btn btn--primary">
              Your account
            </Link>
            <Link to="/menu" className="btn btn--ghost">
              Back to the menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell page admin-page">
      <header className="page-head">
        <span className="eyebrow">Kitchen dashboard</span>
        <h1>Good service, {user.name}</h1>
        <p className="lede">
          Live order book for the pass. Statuses move one step at a time, and every change is written to the order's
          history so the guest sees exactly what happened.
        </p>
        <p className="muted">Signed in as {user.email} · refreshes every 15 seconds</p>
      </header>

      <div className="admin-stats">
        {ORDER_FLOW.map((statusId) => (
          <div className="admin-stat" key={statusId}>
            <strong>{summary?.counts[statusId] ?? 0}</strong>
            <small>{STATUS_META[statusId].label}</small>
          </div>
        ))}
        <div className="admin-stat">
          <strong>{summary?.counts.cancelled ?? 0}</strong>
          <small>{STATUS_META.cancelled.label}</small>
        </div>
      </div>

      <div className="admin-layout">
        <KitchenBoard />
        <AvailabilityBoard />
      </div>
    </div>
  );
}
