/**
 * The tray (cart).
 *
 * Holds configured lines, the fulfilment mode, the coupon and the tip, and
 * derives the money totals on every render so the page and the drawer can never
 * disagree. Everything is mirrored to localStorage.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { CartLine, MenuItem, Selection } from '@/data/types';
import { applyPreset, defaultSelection, sanitiseSelection } from '@/data/customizations';
import { getItem } from '@/data/menu';
import { checkCoupon, computeTotals, type CouponCheck, type Totals } from '@/lib/pricing';
import type { OrderMode } from '@/data/promos';
import { loadJSON, saveJSON, STORAGE_KEYS } from '@/lib/storage';
import { uid } from '@/lib/rng';

interface CartState {
  lines: CartLine[];
  mode: OrderMode;
  couponCode: string;
  tipPercent: number;
  /** rupees earned by the tracking mini-games */
  bonusDiscount: number;
}

type CartAction =
  | { type: 'add'; line: CartLine }
  | { type: 'quantity'; lineId: string; quantity: number }
  | { type: 'replace'; lineId: string; selection: Selection; note?: string }
  | { type: 'remove'; lineId: string }
  | { type: 'mode'; mode: OrderMode }
  | { type: 'coupon'; code: string }
  | { type: 'tip'; percent: number }
  | { type: 'bonus'; amount: number }
  | { type: 'clear' };

const EMPTY: CartState = { lines: [], mode: 'dine-in', couponCode: '', tipPercent: 0, bonusDiscount: 0 };

const lineSignature = (line: CartLine) => JSON.stringify([line.itemId, line.selection, line.note ?? '']);

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      // Identical configurations stack instead of creating a second line.
      const existing = state.lines.find((line) => lineSignature(line) === lineSignature(action.line));
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((line) =>
            line.lineId === existing.lineId
              ? { ...line, quantity: Math.min(20, line.quantity + action.line.quantity) }
              : line,
          ),
        };
      }
      return { ...state, lines: [...state.lines, action.line] };
    }
    case 'quantity':
      return {
        ...state,
        lines: state.lines
          .map((line) =>
            line.lineId === action.lineId
              ? { ...line, quantity: Math.max(0, Math.min(20, action.quantity)) }
              : line,
          )
          .filter((line) => line.quantity > 0),
      };
    case 'replace':
      return {
        ...state,
        lines: state.lines.map((line) =>
          line.lineId === action.lineId
            ? { ...line, selection: action.selection, note: action.note }
            : line,
        ),
      };
    case 'remove':
      return { ...state, lines: state.lines.filter((line) => line.lineId !== action.lineId) };
    case 'mode':
      return { ...state, mode: action.mode };
    case 'coupon':
      return { ...state, couponCode: action.code };
    case 'tip':
      return { ...state, tipPercent: action.percent };
    case 'bonus':
      return { ...state, bonusDiscount: Math.max(state.bonusDiscount, action.amount) };
    case 'clear':
      return { ...EMPTY, mode: state.mode };
    default:
      return state;
  }
}

interface CartContextValue extends CartState {
  totals: Totals;
  count: number;
  /** true when this dish is already in the tray */
  hasLine: (itemId: string) => boolean;
  addItem: (item: MenuItem, selection: Selection, note?: string, quantity?: number) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  replaceLine: (lineId: string, selection: Selection, note?: string) => void;
  removeLine: (lineId: string) => void;
  editLine: (lineId: string) => CartLine | undefined;
  setMode: (mode: OrderMode) => void;
  tryCoupon: (code: string) => CouponCheck;
  clearCoupon: () => void;
  setTip: (percent: number) => void;
  awardBonus: (amount: number) => void;
  reset: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** A fresh line for an item, honouring the kitchen's suggested options. */
export function buildLine(item: MenuItem, selection?: Selection, note?: string, quantity = 1): CartLine {
  const prepared = selection
    ? sanitiseSelection(item.groups, selection)
    : applyPreset(defaultSelection(item.groups), item.preset);
  return { lineId: uid('line'), itemId: item.id, selection: prepared, note, quantity };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY, (initial) => {
    const stored = loadJSON<Partial<CartState> | null>(STORAGE_KEYS.cart, null);
    if (!stored) return initial;
    return { ...initial, ...stored, bonusDiscount: stored.bonusDiscount ?? 0 };
  });

  useEffect(() => {
    saveJSON(STORAGE_KEYS.cart, state);
  }, [state]);

  const totals = useMemo(
    () =>
      computeTotals(state.lines, {
        mode: state.mode,
        couponCode: state.couponCode,
        tipPercent: state.tipPercent,
        bonusDiscount: state.bonusDiscount,
      }),
    [state],
  );

  const count = useMemo(() => state.lines.reduce((sum, line) => sum + line.quantity, 0), [state.lines]);

  const { lines } = state;
  const subtotal = totals.subtotal;

  const tryCoupon = useCallback(
    (code: string) => {
      const result = checkCoupon(code, subtotal);
      if (result.ok) dispatch({ type: 'coupon', code: code.trim().toUpperCase() });
      return result;
    },
    [subtotal],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      totals,
      count,
      hasLine: (itemId: string) => lines.some((line) => line.itemId === itemId),
      addItem: (item, selection, note, quantity = 1) =>
        dispatch({ type: 'add', line: buildLine(item, selection, note, quantity) }),
      updateQuantity: (lineId, quantity) => dispatch({ type: 'quantity', lineId, quantity }),
      replaceLine: (lineId, selection, note) => dispatch({ type: 'replace', lineId, selection, note }),
      removeLine: (lineId) => dispatch({ type: 'remove', lineId }),
      editLine: (lineId) => lines.find((line) => line.lineId === lineId),
      setMode: (next) => dispatch({ type: 'mode', mode: next }),
      tryCoupon,
      clearCoupon: () => dispatch({ type: 'coupon', code: '' }),
      setTip: (percent) => dispatch({ type: 'tip', percent }),
      awardBonus: (amount) => dispatch({ type: 'bonus', amount }),
      reset: () => dispatch({ type: 'clear' }),
    }),
    [state, totals, count, lines, tryCoupon],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

/** Convenience for pages that render a stored line back into an editable item. */
export function lineItem(line: CartLine | undefined): MenuItem | undefined {
  return line ? getItem(line.itemId) : undefined;
}
