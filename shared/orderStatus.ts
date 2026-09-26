/**
 * The order lifecycle — one definition shared by the API, the kitchen dashboard and
 * the customer tracker, so a status can never mean two different things.
 */

export type OrderStatus =
  | 'received'
  | 'preparing'
  | 'cooking'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

/** The happy path, in order (delivery adds the hand-over step). */
export const ORDER_FLOW: OrderStatus[] = ['received', 'preparing', 'cooking', 'ready', 'out_for_delivery', 'delivered'];

export interface StatusMeta {
  label: string;
  /** what the guest reads on the tracker */
  customerCopy: string;
  /** what the kitchen sees on the dashboard */
  kitchenCopy: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  received: {
    label: 'Order received',
    customerCopy: 'Your ticket is on the printer at the pass.',
    kitchenCopy: 'New ticket — confirm and start the build.',
  },
  preparing: {
    label: 'Preparing',
    customerCopy: 'Ingredients are being weighed and prepped.',
    kitchenCopy: 'Prep underway: dough, cuts, scoops.',
  },
  cooking: {
    label: 'Cooking',
    customerCopy: 'On the fire, or in the fryer, right now.',
    kitchenCopy: 'Cooking at the station.',
  },
  ready: {
    label: 'Ready',
    customerCopy: 'Packed and checked against your ticket.',
    kitchenCopy: 'Ready at the pass — hand over next.',
  },
  out_for_delivery: {
    label: 'Out for delivery',
    customerCopy: 'With the rider, in a thermal box.',
    kitchenCopy: 'Collected by the rider.',
  },
  delivered: {
    label: 'Delivered',
    customerCopy: 'Enjoy — thanks for visiting the cafe.',
    kitchenCopy: 'Completed and closed.',
  },
  cancelled: {
    label: 'Cancelled',
    customerCopy: 'This order was cancelled and nothing was charged.',
    kitchenCopy: 'Cancelled — do not prepare.',
  },
};

/** Steps the tracker shows, based on how the order is being served. */
export function trackerSteps(mode: 'dine-in' | 'takeaway' | 'delivery'): OrderStatus[] {
  return mode === 'delivery' ? ORDER_FLOW : ORDER_FLOW.filter((status) => status !== 'out_for_delivery');
}

export function statusIndex(status: OrderStatus): number {
  return ORDER_FLOW.indexOf(status);
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const index = statusIndex(status);
  if (index < 0 || index >= ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[index + 1];
}

export function isTerminal(status: OrderStatus): boolean {
  return status === 'delivered' || status === 'cancelled';
}

/** Staff may only move forward one step, or cancel while the food is still in-house. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to || isTerminal(from)) return false;
  if (to === 'cancelled') return from !== 'out_for_delivery';
  return nextStatus(from) === to;
}

export interface CancellationPolicy {
  allowed: boolean;
  /** shown when the kitchen has already started */
  warning?: string;
  /** explanation when cancellation is refused */
  reason?: string;
}

/**
 * Customer cancellation: only inside the grace window, and only while the order has
 * not gone past preparation. Delivery hand-over is a hard stop.
 */
export function canCustomerCancel(
  status: OrderStatus,
  minutesSincePlaced: number,
  windowMinutes: number,
): CancellationPolicy {
  if (status === 'cancelled') return { allowed: false, reason: 'This order is already cancelled.' };
  if (status === 'delivered') return { allowed: false, reason: 'This order has already been served.' };
  if (status === 'out_for_delivery') {
    return { allowed: false, reason: 'The rider has left with your order, so it can no longer be cancelled.' };
  }
  if (status === 'ready' || status === 'cooking') {
    return {
      allowed: false,
      reason: 'The kitchen has already cooked this order, so it can no longer be cancelled. Please call the counter.',
    };
  }
  if (minutesSincePlaced > windowMinutes) {
    return {
      allowed: false,
      reason: `Cancellation is only open for ${windowMinutes} minutes after checkout. Please call the counter.`,
    };
  }
  if (status === 'preparing') {
    return {
      allowed: true,
      warning: 'The kitchen has already started this order. Cancelling now may waste the prep work.',
    };
  }
  return { allowed: true };
}
