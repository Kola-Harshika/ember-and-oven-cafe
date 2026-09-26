/**
 * Shares the active order (and everything you can do with it) with the whole app:
 * the header offers a "track order" link, the tracker page reads the kitchen status,
 * and the waiting-room games add credit to the same order.
 *
 * All of the behaviour lives in `useActiveOrder`; this file is only the provider.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useActiveOrder, type ActiveOrder } from '@/lib/useActiveOrder';

const OrderContext = createContext<ActiveOrder | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const active = useActiveOrder();
  return <OrderContext.Provider value={active}>{children}</OrderContext.Provider>;
}

export function useOrder(): ActiveOrder {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrder must be used inside <OrderProvider>');
  return context;
}

export type { ActiveOrder };
